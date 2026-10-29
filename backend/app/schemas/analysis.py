from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class AnalysisRequest(BaseModel):
    code: str = Field(
        ...,
        description="Python source code to analyze",
        min_length=1,
        max_length=65536,
    )
    bug_description: str = Field(
        ...,
        description="Description of the bug, unexpected behavior, or requirements",
        min_length=1,
        max_length=10000,
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Code snippet cannot be empty or only whitespace")
        return v

    @field_validator("bug_description")
    @classmethod
    def validate_bug_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Bug description cannot be empty or only whitespace")
        return v


class TestCase(BaseModel):
    name: str = Field(..., description="Descriptive identifier for the test case")
    code: str = Field(..., description="Python executable test snippet or assertion")
    expected_outcome: Optional[str] = Field(
        default="pass",
        description="Expected result when run against patched code (pass / fail)",
    )


class AnalysisResponse(BaseModel):
    mode: str = Field(
        ...,
        description="Execution mode: 'ai' (real Nebius Token Factory inference) or 'demo' (mock)",
    )
    summary: str = Field(..., description="High-level summary of the bug detected")
    root_cause: str = Field(..., description="Deep dive into root cause of the issue")
    severity: str = Field(
        default="medium",
        description="Defect severity classification: low, medium, high, or critical",
    )
    relevant_code_location: Optional[str] = Field(
        default=None,
        description="Identified function, line range, or syntax construct causing failure",
    )
    suggested_code: str = Field(
        default="",
        description="Complete patched Python code",
    )
    proposed_patch: Optional[str] = Field(
        default=None,
        description="Alias for suggested_code",
    )
    explanation: Optional[str] = Field(
        default=None,
        description="Detailed explanation of how the patch fixes the defect",
    )
    tests: List[TestCase] = Field(
        default_factory=list,
        description="Generated unit tests validating the patch and edge cases",
    )
    suggested_unit_tests: Optional[List[TestCase]] = Field(
        default=None,
        description="Alias for tests",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Safety warnings, performance notes, or security observations",
    )
    limitations_and_uncertainty: List[str] = Field(
        default_factory=list,
        description="Honest engineering limitations, assumptions, and edge-case boundaries",
    )

    @model_validator(mode="after")
    def sync_aliases(self) -> "AnalysisResponse":
        # Keep suggested_code and proposed_patch synchronized
        if not self.suggested_code and self.proposed_patch:
            self.suggested_code = self.proposed_patch
        elif not self.proposed_patch and self.suggested_code:
            self.proposed_patch = self.suggested_code

        # Keep tests and suggested_unit_tests synchronized
        if not self.tests and self.suggested_unit_tests:
            self.tests = self.suggested_unit_tests
        elif not self.suggested_unit_tests and self.tests:
            self.suggested_unit_tests = self.tests

        # Keep warnings and limitations_and_uncertainty synchronized
        if not self.limitations_and_uncertainty and self.warnings:
            self.limitations_and_uncertainty = list(self.warnings)
        elif not self.warnings and self.limitations_and_uncertainty:
            self.warnings = list(self.limitations_and_uncertainty)

        # Default explanation if not provided
        if not self.explanation:
            self.explanation = f"Applied defensive fixes to resolve: {self.summary}"

        return self


class GenerateTestsRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=65536)
    bug_description: Optional[str] = Field(default="", max_length=10000)


class GenerateTestsResponse(BaseModel):
    mode: str
    tests: List[TestCase]


class ValidatePatchRequest(BaseModel):
    original_code: str = Field(..., min_length=1, max_length=65536)
    patched_code: str = Field(..., min_length=1, max_length=65536)


class ValidatePatchResponse(BaseModel):
    is_valid_syntax: bool
    syntax_error: Optional[str] = None
    lines_added: int
    lines_removed: int
    notes: List[str] = Field(default_factory=list)
