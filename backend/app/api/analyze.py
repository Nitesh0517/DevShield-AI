from fastapi import APIRouter, Depends, status
from app.core.config import Settings, get_settings
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    GenerateTestsRequest,
    GenerateTestsResponse,
    ValidatePatchRequest,
    ValidatePatchResponse,
)
from app.services.ai_service import AIService

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze code defect and generate reviewable patch with test cases",
)
def analyze_code(
    request: AnalysisRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Submits Python code and bug description to the AI agent workflow.
    In DEMO mode (when NEBIUS_API_KEY is not set), returns structured offline analysis.
    In AI mode, queries the configured NVIDIA model via Nebius Token Factory.
    """
    ai_service = AIService(settings=settings)
    return ai_service.analyze(request)


@router.post(
    "/generate-tests",
    response_model=GenerateTestsResponse,
    status_code=status.HTTP_200_OK,
    summary="Synthesize unit tests specifically targeting the described bug",
)
def generate_tests(
    request: GenerateTestsRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Generates tailored unit test assertions for the provided code.
    """
    ai_service = AIService(settings=settings)
    return ai_service.generate_tests_only(request)


@router.post(
    "/validate-patch",
    response_model=ValidatePatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate syntax and diff metrics of a candidate patch",
)
def validate_patch(
    request: ValidatePatchRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Performs safe static compilation and diff analysis on candidate patched code
    without executing untrusted code on the host.
    """
    ai_service = AIService(settings=settings)
    return ai_service.validate_patch(request)
