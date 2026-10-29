from pydantic import BaseModel, Field


class ConfigStatusResponse(BaseModel):
    provider: str = Field(default="Nebius Token Factory", description="Configured inference provider")
    base_url: str = Field(description="Base URL for OpenAI-compatible API")
    model: str = Field(description="Selected NVIDIA open-source model identifier")
    ai_configured: bool = Field(description="Whether a valid Nebius API key is configured in environment")
    demo_mode: bool = Field(description="True if running in offline demo mode without live API calls")
    secure_runner_available: bool = Field(description="Whether Docker container sandbox engine is responding")
    runner_isolation_policy: str = Field(
        default="Ephemeral Docker container with non-root UID 1000, network disabled, read-only rootfs, and 128MB RAM limit",
        description="Isolation rules enforced during test execution",
    )
    max_code_size_bytes: int = Field(default=65536)
    test_timeout_seconds: int = Field(default=5)
