from app.routers.classes import router as classes_router
from app.routers.subjects import router as subjects_router
from app.routers.chapters import router as chapters_router
from app.routers.topics import router as topics_router
from app.routers.questions import router as questions_router
from app.routers.syllabus import router as syllabus_router
from app.routers.schemes import router as schemes_router
from app.routers.metadata import router as metadata_router
from app.routers.health import router as health_router

__all__ = [
    "classes_router",
    "subjects_router",
    "chapters_router",
    "topics_router",
    "questions_router",
    "syllabus_router",
    "schemes_router",
    "metadata_router",
    "health_router"
]
