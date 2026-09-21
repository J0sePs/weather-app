from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://weather:weather@localhost:5432/weather"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    # TODO: restringir en producción al dominio del frontend (project.md Constraints).
    cors_origins: str = "*"


settings = Settings()