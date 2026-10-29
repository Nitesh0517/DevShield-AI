from fastapi import APIRouter, Depends
from app.core.config import Settings, get_settings
from app.schemas.health import HealthResponse
from app.schemas.config_status import ConfigStatusResponse
from app.services.test_runner_service import TestRunnerService

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health(settings: Settings = Depends(get_settings)):
    """
    Health check endpoint returning system status and service readiness.
    SECURITY NOTICE: NEVER returns API key secrets.
    """
    runner = TestRunnerService(settings=settings)
    secure_available = runner.is_docker_available()

    return HealthResponse(
        status="healthy",
        ai_configured=settings.is_ai_configured,
        ai_mode="ai" if settings.is_ai_configured else "demo",
        model=settings.NEBIUS_MODEL,
        secure_runner_available=secure_available,
    )


@router.get("/config/status", response_model=ConfigStatusResponse, tags=["System"])
def get_config_status(settings: Settings = Depends(get_settings)):
    """
    Returns public metadata regarding configured AI engine and execution sandbox limits.
    SECURITY NOTICE: Redacts all credentials and secrets.
    """
    runner = TestRunnerService(settings=settings)
    return ConfigStatusResponse(
        provider="Nebius Token Factory",
        base_url=settings.NEBIUS_BASE_URL,
        model=settings.NEBIUS_MODEL,
        ai_configured=settings.is_ai_configured,
        demo_mode=not settings.is_ai_configured,
        secure_runner_available=runner.is_docker_available(),
        max_code_size_bytes=settings.MAX_CODE_SIZE_BYTES,
        test_timeout_seconds=settings.TEST_TIMEOUT_SECONDS,
    )
