from groq import Groq
from app.core.config import settings
from app.services.hybrid_search import hybrid_search
from app.services.reranker import rerank_chunks

client = Groq(api_key=settings.GROQ_API_KEY)

def is_space_related(question: str) -> bool:
    # Allow non-English questions through (Hindi, Tamil, Telugu etc.)
    non_ascii = sum(1 for c in question if ord(c) > 127)
    if non_ascii > 2:
        return True

    space_keywords = [
        "space", "satellite", "mission", "rocket", "launch", "orbit",
        "moon", "mars", "planet", "asteroid", "galaxy", "star", "solar",
        "nasa", "isro", "esa", "spacex", "astronaut", "spacecraft",
        "telescope", "cosmos", "universe", "astronomy", "aerospace",
        "chandrayaan", "gaganyaan", "pslv", "gslv", "lvm", "sslv",
        "lunar", "venus", "jupiter", "saturn", "earth observation",
        "propulsion", "payload", "reentry", "gravity", "atmosphere",
        "landing", "lander", "rover", "crater", "orbit", "probe",
        "its", "their", "this mission", "the mission", "it launched",
        "tell me more", "what about", "more about", "when was",
        "where did", "how did", "what happened", "explain", "describe"
    ]
    question_lower = question.lower()
    return any(keyword in question_lower for keyword in space_keywords)

def is_clean_text(text: str) -> bool:
    if not text.strip():
        return False
    non_ascii = sum(1 for c in text if ord(c) > 127)
    return (non_ascii / len(text)) < 0.3

def answer_question(question: str, top_k: int = 5) -> dict:
    if not is_space_related(question):
        return {
            "answer": "SpaceIntel is restricted to space research topics only. Please ask questions related to space missions, satellites, or aerospace.",
            "sources": []
        }

    raw_chunks = hybrid_search(question, top_k=10)
    relevant_chunks = rerank_chunks(question, raw_chunks, top_k=5)

    if not relevant_chunks:
        return {
            "answer": "No relevant documents found. Please upload space research documents first.",
            "sources": []
        }

    context = "\n\n".join([
        f"[Page {c['chunk']['page_number']}]: {c['chunk']['text']}"
        for c in relevant_chunks
        if is_clean_text(c["chunk"]["text"])
    ])

    prompt = f"""You are SpaceIntel, an AI assistant for space research documents.

Use the context below to answer the question as thoroughly as possible.
Synthesize information from multiple context sections if needed.
If the context contains partial information, use it to give the best possible answer.
Only say you cannot find information if the context has absolutely nothing relevant.

Context:
{context}

Question: {question}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024
    )

    answer = response.choices[0].message.content

    sources = [
        {
            "page_number": c["chunk"]["page_number"],
            "text": c["chunk"]["text"][:200],
            "filename": c["chunk"].get("filename", "unknown.pdf")
        }
        for c in relevant_chunks
        if is_clean_text(c["chunk"]["text"])
    ]

    return {
        "answer": answer,
        "sources": sources
    }