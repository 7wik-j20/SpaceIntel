from langchain_groq import ChatGroq
from app.core.config import settings
from app.services.vector_store import client, COLLECTION_NAME
from qdrant_client.models import Filter, FieldCondition, MatchValue

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.2
)

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "english": "Respond in English.",
    "hi": "Respond in Hindi language using Devanagari script.",
    "hindi": "Respond in Hindi language using Devanagari script.",
    "te": "Respond in Telugu language.",
    "telugu": "Respond in Telugu language.",
    "ta": "Respond in Tamil language.",
    "tamil": "Respond in Tamil language.",
    "kn": "Respond in Kannada language.",
    "kannada": "Respond in Kannada language.",
    "ml": "Respond in Malayalam language.",
    "malayalam": "Respond in Malayalam language.",
    "bn": "Respond in Bengali language.",
    "bengali": "Respond in Bengali language.",
}


def get_language_instruction(preferred_language: str = "en") -> str:
    key = (preferred_language or "en").strip().lower()
    return LANGUAGE_INSTRUCTIONS.get(key, LANGUAGE_INSTRUCTIONS["en"])

def get_document_chunks(filename: str, user_id: str = None, limit: int = 50) -> list:
    try:
        must_conditions = [FieldCondition(key="filename", match=MatchValue(value=filename))]
        if user_id:
            must_conditions.append(FieldCondition(key="user_id", match=MatchValue(value=user_id)))

        results = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(must=must_conditions),
            limit=limit,
            with_payload=True,
            with_vectors=False
        )
        return [r.payload["text"] for r in results[0]]
    except Exception:
        return []

def summarize_document(filename: str, user_id: str = None, language: str = "en") -> dict:
    chunks = get_document_chunks(filename, user_id=user_id)

    if not chunks:
        return {"error": "No content found for this document."}

    sample_text = "\n\n".join(chunks[:15])
    language_instruction = get_language_instruction(language)

    prompt = f"""You are a space research assistant. Analyze the following document content and provide a structured summary.
{language_instruction}
Write the entire response in that language, including all section headings.

Document: {filename}

Content:
{sample_text}

Provide a structured summary with these sections:
1. OBJECTIVE: What is the main purpose of this document?
2. KEY FINDINGS: List the 3-5 most important findings or facts
3. MISSIONS COVERED: Which space missions are mentioned?
4. TECHNOLOGIES: What technologies or systems are discussed?
5. CONCLUSION: One sentence summary

Format your response clearly with section headers in the selected language."""

    try:
        response = llm.invoke(prompt)
        return {
            "filename": filename,
            "summary": response.content,
            "chunks_analyzed": len(chunks)
        }
    except Exception as e:
        return {"error": str(e)}