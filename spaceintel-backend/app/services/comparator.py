from langchain_groq import ChatGroq
from app.core.config import settings
from app.services.vector_store import client, COLLECTION_NAME
from qdrant_client.models import Filter, FieldCondition, MatchValue

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.2
)

def get_document_chunks(filename: str, user_id: str = None, limit: int = 20) -> list:
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

def compare_documents(filename1: str, filename2: str, user_id: str = None) -> dict:
    chunks1 = get_document_chunks(filename1, user_id=user_id)
    chunks2 = get_document_chunks(filename2, user_id=user_id)

    if not chunks1 or not chunks2:
        return {"error": "One or both documents have no content."}

    text1 = "\n\n".join(chunks1[:12])
    text2 = "\n\n".join(chunks2[:12])

    prompt = f"""You are a space research analyst. Compare these two space documents and provide a detailed structured comparison.

Document 1: {filename1}
Content:
{text1}

Document 2: {filename2}
Content:
{text2}

Provide a comparison with these sections:
1. OVERVIEW: Brief description of each document
2. MISSIONS: What missions does each cover?
3. TECHNOLOGIES: Key technologies in each
4. OBJECTIVES: Main objectives of each
5. KEY DIFFERENCES: Most important differences between them
6. SIMILARITIES: What do they have in common?

Format clearly with section headers."""

    try:
        response = llm.invoke(prompt)
        return {
            "filename1": filename1,
            "filename2": filename2,
            "comparison": response.content
        }
    except Exception as e:
        return {"error": str(e)}