from fastapi import APIRouter, Depends, status
from app.core.config import Settings, get_settings
from app.schemas.test_runner import TestExecutionRequest, TestExecutionResponse
from app.services.test_runner_service import TestRunnerService

router = APIRouter()


@router.post(
    "/test",
    response_model=TestExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute test suite in isolated Docker container",
)
@router.post(
    "/run-tests",
    response_model=TestExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Alias for /test: Execute test suite in isolated Docker container",
)
def run_tests(
    request: TestExecutionRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Executes unit test cases against candidate Python code.
    SECURITY NOTICE: Code is evaluated strictly within an isolated Docker container
    with non-root privileges, no network access, memory caps, read-only rootfs, and timeouts.
    If Docker is unavailable, execution is safely blocked.
    """
    runner = TestRunnerService(settings=settings)
    return runner.execute_tests(request)
