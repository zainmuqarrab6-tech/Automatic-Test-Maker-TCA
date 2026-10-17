from app.database import Base
from app.models.academic import Class, Subject, Book, Chapter, Topic
from app.models.question import Question
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.scheme import PaperScheme, SchemeSection
from app.models.test_paper import GeneratedTest, GeneratedTestQuestion
from app.models.upload import Upload

__all__ = [
    "Base",
    "Class",
    "Subject",
    "Book",
    "Chapter",
    "Topic",
    "Question",
    "SyllabusDivision",
    "SyllabusDivisionChapter",
    "PaperScheme",
    "SchemeSection",
    "GeneratedTest",
    "GeneratedTestQuestion",
    "Upload"
]
