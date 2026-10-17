import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def get_engine():
    """Create resilient database engine with MySQL support and SQLite local fallback"""
    url = settings.DATABASE_URL
    if url.startswith("mysql"):
        try:
            # Test MySQL connection with a short timeout
            mysql_engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
                connect_args={"connect_timeout": 3},
                echo=False
            )
            with mysql_engine.connect() as conn:
                pass
            logger.info("Database: Connected successfully to MySQL.")
            return mysql_engine
        except Exception as err:
            logger.warning(f"Database: MySQL connection failed ({err}). Falling back to local SQLite database.")
            sqlite_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_maker.db")
            sqlite_url = f"sqlite:///{sqlite_path}"
            sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False}, echo=False)
            return sqlite_engine
    else:
        connect_args = {"check_same_thread": False} if "sqlite" in url else {}
        return create_engine(url, connect_args=connect_args, echo=False)

engine = get_engine()

def init_db():
    """Ensure all database tables exist in the current database and run small schema updates."""
    try:
        import app.models  # Load all models
        Base.metadata.create_all(bind=engine)
        
        # Check SQLite missing column migrations
        with engine.connect() as conn:
            from sqlalchemy import text
            try:
                conn.execute(text("ALTER TABLE syllabus_division_chapters ADD COLUMN weightage_percent REAL DEFAULT 0.0;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE generated_tests ADD COLUMN subject_id INTEGER;"))
                conn.commit()
            except Exception:
                pass
        logger.info("Database tables verified/initialized.")

        # Seed default Admin and Teacher users
        try:
            from app.auth import seed_default_users
            seed_session = SessionLocal()
            seed_default_users(seed_session)
            seed_session.close()
        except Exception as seed_err:
            logger.warning(f"Default user seeding notice: {seed_err}")
    except Exception as e:
        logger.error(f"Error ensuring database tables: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI Dependency for database session management"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

