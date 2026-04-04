import cohere
from app.core.config import settings

co = cohere.Client(api_key=settings.COHERE_API_KEY)

def rerank_chunks(query: str, chunks: list, top_k: int = 5) -> list:
    if not chunks:
        return []

    documents = [c["chunk"]["text"] for c in chunks]

    try:
        results = co.rerank(
            model="rerank-english-v3.0",
            query=query,
            documents=documents,
            top_n=top_k
        )

        reranked = []
        for r in results.results:
            original = chunks[r.index]
            reranked.append({
                "chunk": original["chunk"],
                "score": r.relevance_score
            })

        return reranked

    except Exception as e:
        print(f"Reranker error: {e}")
        return chunks[:top_k]