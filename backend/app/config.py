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
