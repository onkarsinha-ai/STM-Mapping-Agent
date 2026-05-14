from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://stm_user:stm_password@localhost:5432/stm_mapping"
    secret_key: str = "dev-secret-key"
    encryption_key: str = "dev-encryption-key-32-bytes-long!!"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
