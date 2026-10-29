import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from openai import (
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
)

from app.main import app
from app.core.config import get_settings, Settings

client = TestClient(app)


def test_request_validation_missing_fields():
    response = client.post("/api/analyze", json={})
    assert response.status_code == 422
    data = response.json()
    assert "errors" in data or "detail" in data


def test_request_validation_empty_strings():
    response = client.post(
        "/api/analyze",
        json={"code": "   ", "bug_description": "   "},
    )
    assert response.status_code == 422


def test_demo_mode_behavior():
    """When NEBIUS_API_KEY is not set, explicitly returns mode='demo'."""
    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="",
    )
    try:
        response = client.post(
            "/api/analyze",
            json={
                "code": "def divide(a, b):\n    return a / b",
                "bug_description": "Crashes on zero",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "demo"
        assert "ZeroDivisionError" in data["summary"] or "zero" in data["root_cause"].lower()
        assert "def calculate_average_score" in data["suggested_code"] or "divide" in data["suggested_code"]
        assert len(data["tests"]) >= 2
        assert any("DEMO MODE" in w for w in data["warnings"])
        assert "severity" in data
        assert "limitations_and_uncertainty" in data
    finally:
        app.dependency_overrides.clear()


def test_index_error_short_description_scenario():
    """
    Tests input with short code or short description:
    'IndexError occurs when the list has fewer than 3 elements. Need safe slice or boundary checking.'
    Verifies that the app does not fail and returns a complete, runnable patch and test suite.
    """
    response = client.post(
        "/api/analyze",
        json={
            "code": "items[len(items) - 3]",
            "bug_description": "IndexError occurs when the list has fewer than 3 elements. Need safe slice or boundary checking.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo"
    assert "IndexError" in data["summary"] or "IndexError" in data["root_cause"]
    assert "[-3:]" in data["suggested_code"] or "get_last_three_items" in data["suggested_code"]
    assert len(data["tests"]) >= 2
    assert any("fewer" in t["name"].lower() or "slice" in t["name"].lower() for t in data["tests"])


def test_generate_tests_endpoint():
    """Tests the dedicated test synthesis endpoint."""
    response = client.post(
        "/api/generate-tests",
        json={
            "code": "def calculate_average_score(scores, total): return scores / total",
            "bug_description": "Crashes when total is zero",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "tests" in data
    assert len(data["tests"]) >= 2
    assert "name" in data["tests"][0]
    assert "code" in data["tests"][0]


def test_validate_patch_endpoint():
    """Tests safe static AST syntax validation and diff analysis."""
    # Valid syntax patch
    response = client.post(
        "/api/validate-patch",
        json={
            "original_code": "def f(): return 1",
            "patched_code": "def f():\n    # Guard\n    return 2",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid_syntax"] is True
    assert data["syntax_error"] is None
    assert data["lines_added"] > 0

    # Invalid syntax patch
    response_invalid = client.post(
        "/api/validate-patch",
        json={
            "original_code": "def f(): return 1",
            "patched_code": "def f(): return 1 +",
        },
    )
    assert response_invalid.status_code == 200
    data_inv = response_invalid.json()
    assert data_inv["is_valid_syntax"] is False
    assert "SyntaxError" in data_inv["syntax_error"]


def test_mocked_ai_client_success():
    """Tests successful live AI workflow with a mocked OpenAI client."""
    mock_ai_json = {
        "mode": "ai",
        "summary": "Fixes null pointer dereference in user authentication flow.",
        "root_cause": "The user object can be None if not found in database session.",
        "severity": "high",
        "relevant_code_location": "authenticate (user.is_active)",
        "suggested_code": "def authenticate(user):\n    if user is None:\n        return False\n    return user.is_active",
        "explanation": "Added check for None user before accessing attribute.",
        "tests": [
            {
                "name": "test_none_user",
                "code": "assert authenticate(None) is False",
                "expected_outcome": "pass",
            },
            {
                "name": "test_active_user",
                "code": "class MockU: is_active = True\nassert authenticate(MockU()) is True",
                "expected_outcome": "pass",
            },
        ],
        "warnings": ["Ensure secure hashing is enforced."],
        "limitations_and_uncertainty": ["Assumes user object has is_active boolean attribute."],
    }

    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_ai_json)
    mock_response.choices = [mock_choice]

    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="test-mock-nebius-key",
        NEBIUS_BASE_URL="https://api.tokenfactory.nebius.com/v1/",
        NEBIUS_MODEL="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
    )
    try:
        with patch("app.services.ai_service.OpenAI") as mock_openai_cls:
            mock_client_instance = MagicMock()
            mock_openai_cls.return_value = mock_client_instance
            mock_client_instance.chat.completions.create.return_value = mock_response

            response = client.post(
                "/api/analyze",
                json={
                    "code": "def authenticate(user): return user.is_active",
                    "bug_description": "Crashes when user is None",
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["mode"] == "ai"
            assert data["summary"] == mock_ai_json["summary"]
            assert data["root_cause"] == mock_ai_json["root_cause"]
            assert data["severity"] == "high"
            assert data["suggested_code"] == mock_ai_json["suggested_code"]
            assert len(data["tests"]) == 2
    finally:
        app.dependency_overrides.clear()


def test_ai_invalid_json_response():
    """Handles malformed response from the model gracefully with 502 Bad Gateway."""
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "I am an AI and here is your explanation: this is not JSON"
    mock_response.choices = [mock_choice]

    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="test-key",
    )
    try:
        with patch("app.services.ai_service.OpenAI") as mock_openai_cls:
            mock_client_instance = MagicMock()
            mock_openai_cls.return_value = mock_client_instance
            mock_client_instance.chat.completions.create.return_value = mock_response

            response = client.post(
                "/api/analyze",
                json={
                    "code": "print('hello')",
                    "bug_description": "Fix it",
                },
            )
            assert response.status_code == 502
            assert "structured schema" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_ai_provider_authentication_error():
    """Properly reports 401 when Nebius API key is rejected."""
    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="invalid-key",
    )
    try:
        with patch("app.services.ai_service.OpenAI") as mock_openai_cls:
            mock_client_instance = MagicMock()
            mock_openai_cls.return_value = mock_client_instance
            mock_client_instance.chat.completions.create.side_effect = AuthenticationError(
                message="Invalid API Key",
                response=MagicMock(status_code=401),
                body=None,
            )

            response = client.post(
                "/api/analyze",
                json={
                    "code": "x = 1",
                    "bug_description": "bug",
                },
            )
            assert response.status_code == 401
            assert "authentication failed" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_ai_provider_rate_limit_error():
    """Properly reports 429 when Nebius rate limits are hit."""
    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="valid-key",
    )
    try:
        with patch("app.services.ai_service.OpenAI") as mock_openai_cls:
            mock_client_instance = MagicMock()
            mock_openai_cls.return_value = mock_client_instance
            mock_client_instance.chat.completions.create.side_effect = RateLimitError(
                message="Rate limit reached",
                response=MagicMock(status_code=429),
                body=None,
            )

            response = client.post(
                "/api/analyze",
                json={
                    "code": "x = 1",
                    "bug_description": "bug",
                },
            )
            assert response.status_code == 429
            assert "rate limit" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_ai_provider_timeout_error():
    """Properly reports 504 when Nebius request times out."""
    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="valid-key",
    )
    try:
        with patch("app.services.ai_service.OpenAI") as mock_openai_cls:
            mock_client_instance = MagicMock()
            mock_openai_cls.return_value = mock_client_instance
            mock_client_instance.chat.completions.create.side_effect = APITimeoutError(
                request=MagicMock()
            )

            response = client.post(
                "/api/analyze",
                json={
                    "code": "x = 1",
                    "bug_description": "bug",
                },
            )
            assert response.status_code == 504
            assert "timed out" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_mutable_default_argument_isolation_proof():
    """
    Demonstrates that the defective function shares state,
    while the corrected implementation provides full isolation between separate calls.
    """
    # 1. Defective behavior (shared list)
    def defective_append(event_name, log_entries=[]):
        log_entries.append(event_name)
        return log_entries

    d_first = defective_append("LOGIN")
    d_second = defective_append("LOGOUT")
    # Proves the bug exists: second call leaked state from first
    assert d_first is d_second
    assert d_second == ["LOGIN", "LOGOUT"]

    # 2. Corrected implementation (isolated sentinel)
    def append_audit_log(event_name, log_entries=None):
        if log_entries is None:
            log_entries = []
        log_entries.append(event_name)
        return log_entries

    c_first = append_audit_log("LOGIN")
    c_second = append_audit_log("LOGOUT")
    # Proves the fix works: calls are completely isolated
    assert c_first == ["LOGIN"]
    assert c_second == ["LOGOUT"]
    assert c_first is not c_second

    # Explicit list argument behaves correctly
    custom_log = ["BOOT"]
    c_third = append_audit_log("HEALTH_CHECK", custom_log)
    assert c_third is custom_log
    assert c_third == ["BOOT", "HEALTH_CHECK"]


def test_mutable_default_argument_analyze_endpoint():
    """Verifies that /api/analyze produces the exact fix and tests for mutable default arguments."""
    buggy_code = (
        "def append_audit_log(event_name, log_entries=[]):\n"
        "    log_entries.append(event_name)\n"
        "    return log_entries\n"
    )
    bug_desc = "log_entries retains entries across calls because of mutable default argument []"

    response = client.post(
        "/api/analyze",
        json={"code": buggy_code, "bug_description": bug_desc},
    )
    assert response.status_code == 200
    data = response.json()
    assert "log_entries=None" in data["suggested_code"]
    assert "def append_audit_log(event_name, log_entries=None):" in data["suggested_code"]
    assert any("share" in t["code"].lower() or "independent" in t["name"].lower() for t in data["tests"])

