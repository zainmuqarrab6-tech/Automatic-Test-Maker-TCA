import os
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from project root or backend folder
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "The Century Academy - Automatic Test Maker Backend"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_V1_PREFIX: str = "/api/v1"

    # MySQL Database Configuration
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "u437839910_TCA_Test_Maker")
    DB_PASS: str = os.getenv("DB_PASS", "TCATest786@")
    DB_NAME: str = os.getenv("DB_NAME", "u437839910_Test_Maker")

    # Optional Gemini AI API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Authentication & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tca-test-maker-secure-jwt-signing-key-2026-super-secret")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))

    # File Upload Limits
    MAX_BOOK_UPLOAD_BYTES: int = 25 * 1024 * 1024   # 25 MB
    MAX_SCHEME_UPLOAD_BYTES: int = 15 * 1024 * 1024  # 15 MB

    @property
    def DATABASE_URL(self) -> str:
        env_url = os.getenv("DATABASE_URL")
        if env_url:
            return env_url
        escaped_password = quote_plus(self.DB_PASS)
        return (
            f"mysql+pymysql://{self.DB_USER}:{escaped_password}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

settings = Settings()
