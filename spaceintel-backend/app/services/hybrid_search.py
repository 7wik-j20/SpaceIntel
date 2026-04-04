from rank_bm25 import BM25Okapi
from app.services.query_rewriter import rewrite_query
from app.services.vector_store import search_similar, client, COLLECTION_NAME
from qdrant_client.models import Filter, FieldCondition, MatchValue
import numpy as np

def get_all_chunks(user_id: str = None) -> list:
    try:
        count = client.count(collection_name=COLLECTION_NAME).count
        if count == 0:
            return []

        scroll_filter = None
        if user_id:
            scroll_filter = Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            )

        results = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=count,
            with_payload=True,
            with_vectors=False,
            scroll_filter=scroll_filter
        )
        return [
            {
                "text": r.payload["text"],
                "page_number": r.payload["page_number"],
                "chunk_index": r.payload["chunk_index"],
                "filename": r.payload.get("filename", "unknown.pdf"),
                "user_id": r.payload.get("user_id", "global"),
            }
            for r in results[0]
        ]
    except Exception:
        return []

def bm25_search(query: str, chunks: list, top_k: int = 10) -> list:
    if not chunks:
        return []
    tokenized_corpus = [c["text"].lower().split() for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus)
    tokenized_query = query.lower().split()
    scores = bm25.get_scores(tokenized_query)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [
        {"chunk": chunks[i], "score": float(scores[i]), "rank": rank}
        for rank, i in enumerate(top_indices)
    ]

def reciprocal_rank_fusion(dense_results: list, bm25_results: list, k: int = 60) -> list:
    scores = {}

    for rank, item in enumerate(dense_results):
        key = item["chunk"]["text"][:100]
        scores[key] = scores.get(key, {"chunk": item["chunk"], "score": 0})
        scores[key]["score"] += 1 / (k + rank + 1)

    for rank, item in enumerate(bm25_results):
        key = item["chunk"]["text"][:100]
        if key not in scores:
            scores[key] = {"chunk": item["chunk"], "score": 0}
        scores[key]["score"] += 1 / (k + rank + 1)

    return sorted(scores.values(), key=lambda x: x["score"], reverse=True)

def hybrid_search(query: str, top_k: int = 5, user_id: str = None) -> list:
    # Only fetch chunks belonging to this user
    chunks = get_all_chunks(user_id=user_id)
    if not chunks:
        return []

    queries = rewrite_query(query)

    all_dense = []
    all_bm25 = []

    for q in queries:
        all_dense.extend(search_similar(q, top_k=5, user_id=user_id))
        all_bm25.extend(bm25_search(q, chunks, top_k=5))

    # Deduplicate
    seen = set()
    dense_unique = []
    for item in all_dense:
        key = item["chunk"]["text"][:100]
        if key not in seen:
            seen.add(key)
            dense_unique.append(item)

    seen = set()
    bm25_unique = []
    for item in all_bm25:
        key = item["chunk"]["text"][:100]
        if key not in seen:
            seen.add(key)
            bm25_unique.append(item)

    fused = reciprocal_rank_fusion(dense_unique, bm25_unique)
    return fused[:top_k]