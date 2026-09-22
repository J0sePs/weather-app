from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://weather:weather@localhost:5432/weather"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    # TODO: restringir en producción al dominio del frontend (project.md Constraints).
    cors_origins: str = "*"
    openweathermap_api_key: str = ""
    environment: str = "development"

    @model_validator(mode="after")
    def _validate_production_key(self) -> "Settings":
        if self.environment == "production" and not self.openweathermap_api_key:
            raise ValueError("OPENWEATHERMAP_API_KEY is required in production")
        return self


settings = Settings()