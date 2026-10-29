import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.api.health import router as health_router
from app.api.analyze import router as analyze_router
from app.api.test import router as test_router
from app.api.health import get_health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("devshield")

settings = get_settings()

app = FastAPI(
    title="DevShield AI API",
    description="Intelligent Python Code Debugging & Secure Sandboxed Verification Agent",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direct top-level health endpoint
@app.get("/health", tags=["System"])
def top_level_health():
    return get_health(settings=settings)

# Include API routers under /api prefix
app.include_router(health_router, prefix="/api", tags=["System"])
app.include_router(analyze_router, prefix="/api", tags=["AI Agent"])
app.include_router(test_router, prefix="/api", tags=["Secure Sandbox"])


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure all HTTP exceptions return structured JSON"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Clean validation error without internal leakage"""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append(f"{field}: {err.get('msg')}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Invalid request parameters",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler preventing stack trace or internal server path leakage.
    """
    logger.exception(f"Unhandled exception during request to {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again or inspect server logs.",
        },
    )


@app.get("/")
def root():
    return {
        "service": "DevShield AI Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "config_status": "/api/config/status",
    }
