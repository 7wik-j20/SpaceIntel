import redis
import json
import hashlib

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# Keep internal alias so existing function calls don't break
r = redis_client

def get_cache_key(question: str) -> str:
    return "query:" + hashlib.md5(question.lower().strip().encode()).hexdigest()

def get_cached_response(question: str):
    try:
        key = get_cache_key(question)
        cached = r.get(key)
        if cached:
            return json.loads(cached)
        return None
    except Exception:
        return None

def set_cached_response(question: str, response: dict, ttl: int = 3600):
    try:
        key = get_cache_key(question)
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