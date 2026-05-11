import redis
import json
import hashlib

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
CACHE_KEY_VERSION = "lang-lock-v2"

# Keep internal alias so existing function calls don't break
r = redis_client

def get_cache_key(
    question: str,
    user_id: str = None,
    filename: str = None,
    response_length: str = "balanced",
    language: str = "English"
) -> str:
    normalized_payload = json.dumps({
        "version": CACHE_KEY_VERSION,
        "question": question.lower().strip(),
        "user_id": user_id or "",
        "filename": (filename or "").lower().strip(),
        "response_length": (response_length or "balanced").lower().strip(),
        "language": (language or "English").lower().strip(),
    }, sort_keys=True)
    return "query:" + hashlib.md5(normalized_payload.encode()).hexdigest()

def get_cached_response(
    question: str,
    user_id: str = None,
    filename: str = None,
    response_length: str = "balanced",
    language: str = "English"
):
    try:
        key = get_cache_key(
            question,
            user_id=user_id,
            filename=filename,
            response_length=response_length,
            language=language,
        )
        cached = r.get(key)
        if cached:
            return json.loads(cached)
        return None
    except Exception:
        return None

def set_cached_response(
    question: str,
    response: dict,
    ttl: int = 3600,
    user_id: str = None,
    filename: str = None,
    response_length: str = "balanced",
    language: str = "English"
):
    try:
        key = get_cache_key(
            question,
            user_id=user_id,
            filename=filename,
            response_length=response_length,
            language=language,
        )
        r.setex(key, ttl, json.dumps(response))
    except Exception:
        pass

def check_rate_limit(user_id: str = "default", limit: int = 10, window: int = 60) -> bool:
    try:
        key = f"ratelimit:{user_id}"
        count = r.get(key)
        if count is None:
            r.setex(key, window, 1)
            return True
        if int(count) >= limit:
            return False
        r.incr(key)
        return True
    except Exception:
        return True
