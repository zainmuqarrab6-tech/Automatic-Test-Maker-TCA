"""Add book progress tracking and extraction columns

Revision ID: 002_book_progress_tracking
Revises: 001_initial_schema
Create Date: 2026-10-17 11:05:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = '002_book_progress_tracking'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Add progress tracking columns to books
    op.add_column('books', sa.Column('file_name', sa.String(length=255), nullable=True))
    op.add_column('books', sa.Column('file_size_bytes', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('books', sa.Column('total_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('books', sa.Column('processed_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('books', sa.Column('extracted_questions_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('books', sa.Column('status_message', sa.String(length=255), nullable=True))
    op.add_column('books', sa.Column('error_message', sa.Text(), nullable=True))

    # 2. Add book_id to uploads
    op.add_column('uploads', sa.Column('book_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_uploads_book_id', 'uploads', 'books', ['book_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_uploads_book_id', 'uploads', ['book_id'])

def downgrade() -> None:
    op.drop_index('ix_uploads_book_id', table_name='uploads')
    op.drop_constraint('fk_uploads_book_id', 'uploads', type_='foreignkey')
    op.drop_column('uploads', 'book_id')

    op.drop_column('books', 'error_message')
    op.drop_column('books', 'status_message')
    op.drop_column('books', 'extracted_questions_count')
    op.drop_column('books', 'processed_pages')
    op.drop_column('books', 'total_pages')
    op.drop_column('books', 'file_size_bytes')
    op.drop_column('books', 'file_name')
