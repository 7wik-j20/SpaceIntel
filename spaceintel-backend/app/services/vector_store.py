from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
import uuid
import hashlib

COLLECTION_NAME = "spaceintel"
VECTOR_SIZE = 384

client = QdrantClient(host="localhost", port=6333)
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def make_point_id(filename: str, chunk_index: int) -> str:
    raw = f"{filename}_{chunk_index}"
    return str(uuid.UUID(hashlib.md5(raw.encode()).hexdigest()))

def ensure_collection():
    try:
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
            )
    except Exception as e:
        raise RuntimeError(f"Qdrant not reachable at localhost:6333 — is it running? {e}")

def get_embeddings(texts: list) -> list:
    return get_model().encode(texts, show_progress_bar=True, convert_to_numpy=True).tolist()

def add_chunks_to_index(chunks: list) -> int:
    ensure_collection()
    texts = [c["text"] for c in chunks]
    embeddings = get_embeddings(texts)

    points = [
        PointStruct(
            id=make_point_id(chunks[i].get("filename", "unknown"), chunks[i]["chunk_index"]),
            vector=embeddings[i],
            payload={
                "text": chunks[i]["text"],
                "page_number": chunks[i]["page_number"],
                "chunk_index": chunks[i]["chunk_index"],
                "filename": chunks[i].get("filename", "unknown.pdf"),
                "user_id": chunks[i].get("user_id", "global"),
            }
        )
        for i in range(len(chunks))
    ]

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return client.count(collection_name=COLLECTION_NAME).count

def search_similar(query: str, top_k: int = 5, user_id: str = None) -> list:
    ensure_collection()
    count = client.count(collection_name=COLLECTION_NAME).count
    if count == 0:
        return []

    query_vector = get_model().encode([query], convert_to_numpy=True).tolist()[0]

    search_filter = None
    if user_id:
        search_filter = Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        )

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
        query_filter=search_filter
    ).points

    return [
        {
            "chunk": {
                "text": r.payload["text"],
                "page_number": r.payload["page_number"],
                "chunk_index": r.payload["chunk_index"],
                "filename": r.payload.get("filename", "unknown.pdf"),
                "user_id": r.payload.get("user_id", "global"),
            },
            "score": r.score
        }
        for r in results
    ]