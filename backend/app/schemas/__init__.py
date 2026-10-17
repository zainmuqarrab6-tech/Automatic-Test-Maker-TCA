from app.schemas.academic import (
    ClassBase, ClassCreate, ClassUpdate, ClassOut,
    SubjectBase, SubjectCreate, SubjectUpdate, SubjectOut,
    ChapterBase, ChapterCreate, ChapterUpdate, ChapterOut,
    TopicBase, TopicCreate, TopicUpdate, TopicOut
)
from app.schemas.question import (
    OptionItem, QuestionBase, QuestionCreate, QuestionUpdate, QuestionOut,
    PaginatedQuestions, QuestionSwapRequest
)
from app.schemas.syllabus import (
    SyllabusDivisionBase, SyllabusDivisionCreate, SyllabusDivisionUpdate, SyllabusDivisionOut
)
from app.schemas.scheme import (
    SchemeSectionBase, SchemeSectionCreate, SchemeSectionUpdate, SchemeSectionOut,
    PaperSchemeBase, PaperSchemeCreate, PaperSchemeUpdate, PaperSchemeOut
)
from app.schemas.metadata import MetadataResponse, ChapterMetaItem
