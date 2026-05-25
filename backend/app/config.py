import os

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./autoflow.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret-autoflow-key-change-in-prod-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    GENERATED_DIR: str = os.getenv("GENERATED_DIR", "./generated")

settings = Settings()

# Ensure generated directory exists
os.makedirs(settings.GENERATED_DIR, exist_ok=True)
