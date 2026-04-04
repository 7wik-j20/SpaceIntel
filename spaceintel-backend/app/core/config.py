from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    OPENAI_API_KEY: str
    GROQ_API_KEY: str
    COHERE_API_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "spaceintel"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()