import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import (
    classes_router,
    subjects_router,
    chapters_router,
    topics_router,
    questions_router,
    syllabus_router,
    schemes_router,
    metadata_router,
    health_router,
    books_router,
    tests_router,
    auth_router
)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for The Century Academy Automated Test Maker. Powered by FastAPI, SQLAlchemy & MySQL.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS) for Frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Global Custom Error Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "error": True
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Format readable error messages
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Input validation error: " + "; ".join(error_messages),
            "errors": exc.errors(),
            "status_code": 422,
            "error": True
        }
    )

# 1. API v1 Endpoints (Standard API structure)
api_v1_prefix = settings.API_V1_PREFIX
app.include_router(health_router)
app.include_router(health_router, prefix=api_v1_prefix)
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(metadata_router, prefix=api_v1_prefix)
app.include_router(classes_router, prefix=api_v1_prefix)
app.include_router(subjects_router, prefix=api_v1_prefix)
app.include_router(chapters_router, prefix=api_v1_prefix)
app.include_router(topics_router, prefix=api_v1_prefix)
app.include_router(questions_router, prefix=api_v1_prefix)
app.include_router(syllabus_router, prefix=api_v1_prefix)
app.include_router(schemes_router, prefix=api_v1_prefix)
app.include_router(books_router, prefix=api_v1_prefix)
app.include_router(tests_router, prefix=api_v1_prefix)

# 2. Backwards-Compatibility Routes under /api (Direct frontend compatibility)
app.include_router(auth_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(metadata_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(classes_router, prefix="/api")
app.include_router(subjects_router, prefix="/api")
app.include_router(chapters_router, prefix="/api")
app.include_router(books_router, prefix="/api")
app.include_router(syllabus_router, prefix="/api")
app.include_router(schemes_router, prefix="/api")
app.include_router(tests_router, prefix="/api")


@app.get("/")
def root():
    return {
        "academy": "The Century Academy of Science, Commerce & Arts",
        "service": "Test Maker FastAPI Backend",
        "status": "online",
        "documentation": "/docs",
        "api_v1": "/api/v1"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
