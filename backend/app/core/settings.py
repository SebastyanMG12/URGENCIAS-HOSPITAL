from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str
    database_url_sync: str
    firebase_credentials_path: str
    secret_key: str
    environment: str = "development"
    allowed_origins: List[str] = []

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()