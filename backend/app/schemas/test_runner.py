from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from .analysis import TestCase


class TestExecutionRequest(BaseModel):
    code: str = Field(
        ...,
        description="Candidate Python code to test (original or suggested fix)",
        min_length=1,
        max_length=65536,
    )
    tests: List[TestCase] = Field(
        default_factory=list,
        description="List of test cases to execute against the code",
    )
    custom_test_code: Optional[str] = Field(
        default=None,
        description="Optional custom test script or suite",
        max_length=65536,
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Candidate code cannot be empty")
        return v


class TestCaseResult(BaseModel):
    name: str = Field(..., description="Name of test case")
    status: str = Field(
        ...,
        description="Result status: 'passed', 'failed', 'error', 'timeout', or 'skipped'",
    )
    output: str = Field(default="", description="Captured stdout/stderr for this test")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    duration_ms: float = Field(default=0.0, description="Execution duration in milliseconds")


class TestExecutionResponse(BaseModel):
    status: str = Field(
        ...,
        description="Overall test suite status: 'passed', 'failed', 'error', or 'unavailable'",
    )
    secure_mode: bool = Field(
        ...,
        description="True if run within restricted Docker sandbox, False if runner unavailable",
    )
    passed_count: int = Field(default=0, description="Number of passed tests")
    total_count: int = Field(default=0, description="Total number of tests evaluated")
    results: List[TestCaseResult] = Field(
        default_factory=list,
        description="Individual test outcomes",
    )
    captured_output: str = Field(
        default="",
        description="Consolidated stdout and stderr from execution runner",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Diagnostic error if runner failed, timed out, or environment unavailable",
    )
    execution_time_ms: float = Field(
        default=0.0,
        description="Total execution time in milliseconds",
    )
