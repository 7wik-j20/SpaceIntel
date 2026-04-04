from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
def rewrite_query(question: str) -> list:
    words = question.lower().strip()
    
    # Variant 1 - original
    v1 = question
    
    # Variant 2 - add context words
    v2 = f"ISRO space mission {question}"
    
    # Variant 3 - simplified keywords
    stopwords = {"what", "is", "the", "are", "tell", "me", "about", "how", "did", "does", "a", "an"}
    keywords = [w for w in words.split() if w not in stopwords]
    v3 = " ".join(keywords)

    return [v1, v2, v3]