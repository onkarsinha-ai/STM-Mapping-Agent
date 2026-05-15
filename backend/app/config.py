from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./stm_mapping_dev.db"
    secret_key: str = "dev-secret-key"
    encryption_key: str = "dev-encryption-key-32-bytes-long!!"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
