from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Google Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Nebius Token Factory Configuration (Alternative Provider)
    NEBIUS_API_KEY: str = ""
    NEBIUS_BASE_URL: str = "https://api.tokenfactory.nebius.com/v1/"
    NEBIUS_MODEL: str = "nvidia/Nemotron-3_5-Lightning"

    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://devshield-ai.vercel.app",
    ]

    # Security & Execution Sandbox Limits
    DOCKER_IMAGE: str = "python:3.11-slim"
    TEST_TIMEOUT_SECONDS: int = 5
    MAX_CODE_SIZE_BYTES: int = 65536  # 64 KB limit
    MAX_OUTPUT_SIZE_BYTES: int = 32768  # 32 KB stdout/stderr capture limit

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def is_ai_configured(self) -> bool:
        return bool(
            (self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())
            or (self.NEBIUS_API_KEY and self.NEBIUS_API_KEY.strip())
        )

    @property
    def active_provider(self) -> str:
        if self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip():
            return "gemini"
        if self.NEBIUS_API_KEY and self.NEBIUS_API_KEY.strip():
            return "nebius"
        return "demo"

    @property
    def active_model(self) -> str:
        if self.active_provider == "gemini":
            return self.GEMINI_MODEL
        if self.active_provider == "nebius":
            return self.NEBIUS_MODEL
        return "offline-demo-engine"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
