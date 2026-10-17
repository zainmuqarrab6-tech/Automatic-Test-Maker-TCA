"""Initial schema with 13 tables for Test Maker

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-17 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. classes
    op.create_table(
        'classes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_classes_id', 'classes', ['id'])
    op.create_index('ix_classes_name', 'classes', ['name'], unique=True)

    # 2. subjects
    op.create_table(
        'subjects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=30), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('class_id', 'name', name='uq_subject_class_name')
    )
    op.create_index('ix_subjects_id', 'subjects', ['id'])
    op.create_index('ix_subjects_class_id', 'subjects', ['class_id'])
    op.create_index('ix_subjects_name', 'subjects', ['name'])

    # 3. books
    op.create_table(
        'books',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('upload_status', sa.Enum('pending', 'processing', 'completed', 'failed', name='book_upload_status_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_books_id', 'books', ['id'])
    op.create_index('ix_books_subject_id', 'books', ['subject_id'])

    # 4. chapters
    op.create_table(
        'chapters',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=True),
        sa.Column('chapter_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('name_ur', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chapters_id', 'chapters', ['id'])
    op.create_index('ix_chapters_subject_id', 'chapters', ['subject_id'])
    op.create_index('ix_chapters_book_id', 'chapters', ['book_id'])
    op.create_index('idx_chapter_subject_no', 'chapters', ['subject_id', 'chapter_number'])

    # 5. topics
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('chapter_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('topic_number', sa.String(length=50), nullable=True),
        sa.Column('page_start', sa.Integer(), nullable=True),
        sa.Column('page_end', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_topics_id', 'topics', ['id'])
    op.create_index('ix_topics_chapter_id', 'topics', ['chapter_id'])

    # 6. questions
    op.create_table(
        'questions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('chapter_id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.Enum('mcq', 'short', 'long', 'fill_blank', 'true_false', 'matching', name='question_type_enum'), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_ur', sa.Text(), nullable=True),
        sa.Column('exercise', sa.String(length=100), nullable=True),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('marks', sa.Integer(), nullable=False),
        sa.Column('difficulty', sa.Enum('easy', 'medium', 'hard', name='question_difficulty_enum'), nullable=False),
        sa.Column('source_book_id', sa.Integer(), nullable=True),
        sa.Column('source_page', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'approved', name='question_status_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_book_id'], ['books.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_questions_id', 'questions', ['id'])
    op.create_index('ix_questions_subject_id', 'questions', ['subject_id'])
    op.create_index('ix_questions_chapter_id', 'questions', ['chapter_id'])
    op.create_index('ix_questions_topic_id', 'questions', ['topic_id'])
    op.create_index('ix_questions_type', 'questions', ['type'])
    op.create_index('ix_questions_difficulty', 'questions', ['difficulty'])
    op.create_index('ix_questions_status', 'questions', ['status'])
    op.create_index('ix_questions_source_page', 'questions', ['source_page'])
    op.create_index('idx_filter_questions', 'questions', ['subject_id', 'chapter_id', 'type', 'status'])
    op.create_index('idx_search_exercise', 'questions', ['exercise'])

    # 7. syllabus_divisions
    op.create_table(
        'syllabus_divisions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_syllabus_divisions_id', 'syllabus_divisions', ['id'])
    op.create_index('ix_syllabus_divisions_subject_id', 'syllabus_divisions', ['subject_id'])

    # 8. syllabus_division_chapters
    op.create_table(
        'syllabus_division_chapters',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('syllabus_division_id', sa.Integer(), nullable=False),
        sa.Column('chapter_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['syllabus_division_id'], ['syllabus_divisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('syllabus_division_id', 'chapter_id', name='uq_division_chapter')
    )
    op.create_index('ix_syllabus_division_chapters_id', 'syllabus_division_chapters', ['id'])
    op.create_index('ix_syllabus_division_chapters_division_id', 'syllabus_division_chapters', ['syllabus_division_id'])
    op.create_index('ix_syllabus_division_chapters_chapter_id', 'syllabus_division_chapters', ['chapter_id'])

    # 9. paper_schemes
    op.create_table(
        'paper_schemes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('total_marks', sa.Integer(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_paper_schemes_id', 'paper_schemes', ['id'])
    op.create_index('ix_paper_schemes_subject_id', 'paper_schemes', ['subject_id'])

    # 10. scheme_sections
    op.create_table(
        'scheme_sections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scheme_id', sa.Integer(), nullable=False),
        sa.Column('section_name', sa.String(length=20), nullable=False),
        sa.Column('question_type', sa.Enum('mcq', 'short', 'long', 'fill_blank', 'true_false', 'matching', name='scheme_question_type_enum'), nullable=False),
        sa.Column('number_of_questions', sa.Integer(), nullable=False),
        sa.Column('number_to_attempt', sa.Integer(), nullable=False),
        sa.Column('marks_per_question', sa.Integer(), nullable=False),
        sa.Column('difficulty_mix', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scheme_id'], ['paper_schemes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scheme_sections_id', 'scheme_sections', ['id'])
    op.create_index('ix_scheme_sections_scheme_id', 'scheme_sections', ['scheme_id'])

    # 11. generated_tests
    op.create_table(
        'generated_tests',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('scheme_id', sa.Integer(), nullable=True),
        sa.Column('syllabus_division_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('campus', sa.String(length=150), nullable=False),
        sa.Column('date', sa.String(length=50), nullable=True),
        sa.Column('time_allowed', sa.String(length=50), nullable=False),
        sa.Column('total_marks', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scheme_id'], ['paper_schemes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['syllabus_division_id'], ['syllabus_divisions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_generated_tests_id', 'generated_tests', ['id'])
    op.create_index('ix_generated_tests_scheme_id', 'generated_tests', ['scheme_id'])
    op.create_index('ix_generated_tests_syllabus_division_id', 'generated_tests', ['syllabus_division_id'])

    # 12. generated_test_questions
    op.create_table(
        'generated_test_questions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('test_id', sa.String(length=64), nullable=False),
        sa.Column('question_id', sa.String(length=64), nullable=False),
        sa.Column('section_id', sa.Integer(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['test_id'], ['generated_tests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['section_id'], ['scheme_sections.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_generated_test_questions_id', 'generated_test_questions', ['id'])
    op.create_index('ix_generated_test_questions_test_id', 'generated_test_questions', ['test_id'])
    op.create_index('ix_generated_test_questions_question_id', 'generated_test_questions', ['question_id'])
    op.create_index('idx_test_question_order', 'generated_test_questions', ['test_id', 'order'])

    # 13. uploads
    op.create_table(
        'uploads',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('purpose', sa.Enum('book', 'scheme', name='upload_purpose_enum'), nullable=False),
        sa.Column('processing_status', sa.Enum('uploaded', 'processing', 'completed', 'failed', name='upload_status_enum'), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_uploads_id', 'uploads', ['id'])
    op.create_index('ix_uploads_purpose', 'uploads', ['purpose'])
    op.create_index('ix_uploads_processing_status', 'uploads', ['processing_status'])


def downgrade() -> None:
    op.drop_table('uploads')
    op.drop_table('generated_test_questions')
    op.drop_table('generated_tests')
    op.drop_table('scheme_sections')
    op.drop_table('paper_schemes')
    op.drop_table('syllabus_division_chapters')
    op.drop_table('syllabus_divisions')
    op.drop_table('questions')
    op.drop_table('topics')
    op.drop_table('chapters')
    op.drop_table('books')
    op.drop_table('subjects')
    op.drop_table('classes')
