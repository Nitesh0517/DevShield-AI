from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings, Settings

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "DevShield AI Backend"
    assert "health" in data


def test_top_level_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ai_configured" in data


def test_config_status_endpoint():
    response = client.get("/api/config/status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "Nebius Token Factory"
    assert "api.tokenfactory.nebius.com" in data["base_url"]
    assert "model" in data
    assert "ai_configured" in data
    assert "demo_mode" in data
    assert "runner_isolation_policy" in data
    # Secret protection check: never leak API keys
    assert "api_key" not in str(data).lower()


def test_health_endpoint_demo_mode():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ai_configured" in data
    assert "ai_mode" in data
    assert "model" in data
    assert "secure_runner_available" in data
    # Ensure no API key secret is leaked
    assert "api_key" not in str(data).lower()
    assert "sk-" not in str(data)


def test_health_endpoint_ai_configured_mode():
    app.dependency_overrides[get_settings] = lambda: Settings(
        NEBIUS_API_KEY="test-mock-key-secret",
        NEBIUS_BASE_URL="https://api.tokenfactory.nebius.com/v1/",
        NEBIUS_MODEL="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
    )
    try:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ai_configured"] is True
        assert data["ai_mode"] == "ai"
        assert data["model"] == "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF"
        # Verify secret key is NEVER exposed in the output
        assert "test-mock-key-secret" not in response.text
    finally:
        app.dependency_overrides.clear()
