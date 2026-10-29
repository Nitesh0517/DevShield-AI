import subprocess
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_test_endpoint_validation():
    # Empty code should be rejected
    response = client.post(
        "/api/test",
        json={"code": "   ", "tests": []},
    )
    assert response.status_code == 422


def test_test_runner_docker_unavailable():
    """
    CRITICAL SECURITY TEST:
    When Docker daemon is unavailable, the runner must NOT fall back
    to unrestricted execution on the host. It must return status='unavailable'.
    """
    with patch("app.services.test_runner_service.TestRunnerService.is_docker_available", return_value=False):
        response = client.post(
            "/api/test",
            json={
                "code": "import os; print('danger')",
                "tests": [{"name": "test_1", "code": "assert True"}],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unavailable"
        assert data["secure_mode"] is False
        assert "unavailable" in data["error_message"].lower()
        assert "host execution blocked" in data["captured_output"].lower()


def test_test_runner_docker_success():
    """Tests parsed result when Docker container executes and returns test results."""
    mock_container_payload = {
        "results": [
            {
                "name": "test_pass",
                "status": "passed",
                "output": "Test stdout",
                "error": None,
                "duration_ms": 1.5,
            },
            {
                "name": "test_fail",
                "status": "failed",
                "output": "",
                "error": "AssertionError: Expected 5 got 4",
                "duration_ms": 1.2,
            },
        ],
        "passed_count": 1,
        "total_count": 2,
        "captured_output": "Test suite executed.\n",
    }

    mock_stdout = (
        "DEVSHIELD_RESULT_START\n"
        + str(mock_container_payload).replace("'", '"').replace("None", "null")
        + "\nDEVSHIELD_RESULT_END\n"
    )

    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stdout = mock_stdout
    mock_proc.stderr = ""

    with patch("app.services.test_runner_service.TestRunnerService.is_docker_available", return_value=True):
        with patch("subprocess.run", return_value=mock_proc):
            response = client.post(
                "/api/test",
                json={
                    "code": "def f(): return 4",
                    "tests": [
                        {"name": "test_pass", "code": "assert True"},
                        {"name": "test_fail", "code": "assert f() == 5"},
                    ],
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "failed"
            assert data["secure_mode"] is True
            assert data["passed_count"] == 1
            assert data["total_count"] == 2
            assert len(data["results"]) == 2
            assert data["results"][0]["status"] == "passed"
            assert data["results"][1]["status"] == "failed"


def test_test_runner_timeout_handling():
    """Tests container execution timeout handling."""
    with patch("app.services.test_runner_service.TestRunnerService.is_docker_available", return_value=True):
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="docker run", timeout=5.0)):
            response = client.post(
                "/api/test",
                json={
                    "code": "while True: pass",
                    "tests": [{"name": "test_infinite_loop", "code": "assert True"}],
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "error"
            assert data["secure_mode"] is True
            assert "timed out" in data["error_message"].lower()
