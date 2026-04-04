from langchain_groq import ChatGroq
from langsmith import traceable
from app.core.config import settings

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0
)

@traceable(name="extract_claims")
def extract_claims(answer: str) -> list:
    prompt = f"""Extract all specific factual claims from this answer.
Return ONLY a JSON array of strings, each string being one factual claim.
Keep claims short and specific. Maximum 6 claims.
Return ONLY the JSON array, no other text.

Answer: {answer}

Claims:"""

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        import json
        claims = json.loads(content)
        return claims[:6] if isinstance(claims, list) else []
    except Exception:
        return []

@traceable(name="verify_claim")
def verify_claim(claim: str, context_chunks: list) -> dict:
    context = "\n".join([c["chunk"]["text"] for c in context_chunks[:5]])

    prompt = f"""Verify if this claim is supported by the context below.
Return ONLY one word: SUPPORTED or UNSUPPORTED

Claim: {claim}

Context:
{context}

Verdict:"""

    try:
        response = llm.invoke(prompt)
        verdict = response.content.strip().upper()
        supported = "SUPPORTED" in verdict
        return {"claim": claim, "supported": supported}
    except Exception:
        return {"claim": claim, "supported": True}

@traceable(name="fact_check_answer")
def fact_check_answer(answer: str, chunks: list) -> list:
    claims = extract_claims(answer)
    if not claims:
        return []
    results = [verify_claim(claim, chunks) for claim in claims]
    return results