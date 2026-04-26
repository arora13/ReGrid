from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/regrid"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    real_dataset_screening: bool = True
    mapbox_token: str | None = None


settings = Settings()

