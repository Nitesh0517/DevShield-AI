from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="API operational status")
    ai_configured: bool = Field(description="Whether an AI API key is configured")
    ai_mode: str = Field(description="Active operating mode: 'gemini', 'nebius', 'ai', or 'demo'")
    ai_provider: Optional[str] = Field(default="demo", description="Active inference provider ('gemini', 'nebius', or 'demo')")
    model: str = Field(description="Configured AI model identifier")
    secure_runner_available: bool = Field(description="Whether secure Docker test execution is reachable")
