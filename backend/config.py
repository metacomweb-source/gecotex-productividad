from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    app_name: str = "GECOTEX Productividad"
    secret_key: str = "gecotex-secret-key-change-in-production-2024"
    algorithm: str = "HS256"
    access_token_expire_hours: int = 8
    database_url: str = "sqlite:///./gecotex.db"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
