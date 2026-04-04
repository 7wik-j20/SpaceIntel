import json
import uuid
from datetime import datetime
from typing import Optional
from app.services.cache import redis_client
from app.core.database import SessionLocal
from sqlalchemy import text

HISTORY_TTL = 3600
MAX_TURNS = 6
LEGACY_SESSION_ID = "__legacy__"
PINNED_TTL = 60 * 60 * 24 * 30


def _pinned_key(user_id: str) -> str:
    return f"history:pinned:{user_id}"


def get_pinned_sessions(user_id: str) -> set:
    try:
        raw = redis_client.get(_pinned_key(user_id))
        if isinstance(raw, (bytes, bytearray)):
            value = raw.decode("utf-8")
        else:
            value = raw
        items = json.loads(value) if value else []
        return set(items if isinstance(items, list) else [])
    except Exception:
        return set()


def set_session_pinned(user_id: str, session_id: str, pinned: bool) -> list:
    pinned_sessions = get_pinned_sessions(user_id)
    if pinned:
        pinned_sessions.add(session_id)
    else:
        pinned_sessions.discard(session_id)

    try:
        redis_client.setex(_pinned_key(user_id), PINNED_TTL, json.dumps(list(pinned_sessions)))
    except Exception as e:
        print(f"[memory] set_session_pinned redis error: {e}")

    return list(pinned_sessions)


def rename_session(user_id: str, session_id: str, title: str):
    new_title = (title or "").strip()[:100]
    if not new_title:
        new_title = "New Chat"

    try:
        db = SessionLocal()
        if session_id == LEGACY_SESSION_ID:
            db.execute(text(
                """
                UPDATE chat_history
                SET title = :title
                WHERE user_id = :user_id
                  AND (session_id IS NULL OR session_id = :legacy_session_id)
                """
            ), {
                "title": new_title,
                "user_id": user_id,
                "legacy_session_id": LEGACY_SESSION_ID,
            })
        else:
            db.execute(text(
                """
                UPDATE chat_history
                SET title = :title
                WHERE user_id = :user_id AND session_id = :session_id
                """
            ), {
                "title": new_title,
                "user_id": user_id,
                "session_id": session_id,
            })
        db.commit()
        db.close()
    except Exception as e:
        print(f"[memory] rename_session error: {e}")

def generate_session_id() -> str:
    return str(uuid.uuid4())

def get_history(user_id: str, session_id: Optional[str] = None) -> list:
    cache_key = f"history:{user_id}:{session_id}" if session_id else f"history:{user_id}"
    try:
        raw = redis_client.get(cache_key)
        if isinstance(raw, (bytes, bytearray)):
            return json.loads(raw.decode("utf-8"))
        if isinstance(raw, str):
            return json.loads(raw)
    except Exception:
        pass

    try:
        db = SessionLocal()
        if session_id:
            if session_id == LEGACY_SESSION_ID:
                result = db.execute(text(
                    """
                    SELECT question, answer FROM chat_history
                    WHERE user_id = :user_id
                      AND (session_id IS NULL OR session_id = :legacy_session_id)
                    ORDER BY created_at ASC
                    LIMIT :limit
                    """
                ), {
                    "user_id": user_id,
                    "legacy_session_id": LEGACY_SESSION_ID,
                    "limit": MAX_TURNS
                }).fetchall()
            else:
                result = db.execute(text(
                    """
                    SELECT question, answer FROM chat_history
                    WHERE user_id = :user_id AND session_id = :session_id
                    ORDER BY created_at ASC
                    LIMIT :limit
                    """
                ), {"user_id": user_id, "session_id": session_id, "limit": MAX_TURNS}).fetchall()
        else:
            result = db.execute(text(
                """
                SELECT question, answer FROM chat_history
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ), {"user_id": user_id, "limit": MAX_TURNS}).fetchall()
        db.close()

        history = [{"question": r[0], "answer": r[1]} for r in reversed(result)]
        redis_client.setex(cache_key, HISTORY_TTL, json.dumps(history))
        return history
    except Exception as e:
        print(f"[memory] get_history error: {e}")
        return []

def save_turn(user_id: str, question: str, answer: str, session_id: Optional[str] = None):
    cache_key = f"history:{user_id}:{session_id}" if session_id else f"history:{user_id}"

    try:
        history = get_history(user_id, session_id)
        history.append({"question": question, "answer": answer})
        if len(history) > MAX_TURNS:
            history = history[-MAX_TURNS:]
        redis_client.setex(cache_key, HISTORY_TTL, json.dumps(history))
    except Exception as e:
        print(f"[memory] redis save error: {e}")

    try:
        db = SessionLocal()
        title = question[:100] if question else "New Chat"
        db.execute(text(
            """
            INSERT INTO chat_history (user_id, question, answer, created_at, session_id, title)
            VALUES (:user_id, :question, :answer, :created_at, :session_id, :title)
            """
        ), {
            "user_id":    user_id,
            "question":   question,
            "answer":     answer[:2000],
            "created_at": datetime.utcnow(),
            "session_id": session_id,
            "title":      title
        })
        db.commit()
        db.close()
        print(f"[memory] saved turn for user={user_id} session={session_id}")
    except Exception as e:
        print(f"[memory] postgres save error: {e}")

def get_sessions(user_id: str) -> list:
    try:
        pinned_sessions = get_pinned_sessions(user_id)
        db = SessionLocal()
        result = db.execute(text(
            """
            SELECT DISTINCT ON (session_id)
                session_id,
                title,
                created_at
            FROM chat_history
            WHERE user_id = :user_id
            ORDER BY session_id, created_at DESC
            """
        ), {"user_id": user_id}).fetchall()
        db.close()

        sessions = []
        for r in result:
            session_id = r[0] if r[0] else LEGACY_SESSION_ID
            sessions.append({
                "session_id": session_id,
                "title": r[1] or "New Chat",
                "created_at": r[2].isoformat() if r[2] else None,
                "pinned": session_id in pinned_sessions,
            })

        return sorted(
            sessions,
            key=lambda x: x["created_at"] or "",
            reverse=True
        )
    except Exception as e:
        print(f"[memory] get_sessions error: {e}")
        return []

def get_session_messages(user_id: str, session_id: str) -> list:
    try:
        db = SessionLocal()
        if session_id == LEGACY_SESSION_ID:
            result = db.execute(text(
                """
                SELECT question, answer, created_at FROM chat_history
                WHERE user_id = :user_id
                  AND (session_id IS NULL OR session_id = :legacy_session_id)
                ORDER BY created_at ASC
                """
            ), {"user_id": user_id, "legacy_session_id": LEGACY_SESSION_ID}).fetchall()
        else:
            result = db.execute(text(
                """
                SELECT question, answer, created_at FROM chat_history
                WHERE user_id = :user_id AND session_id = :session_id
                ORDER BY created_at ASC
                """
            ), {"user_id": user_id, "session_id": session_id}).fetchall()
        db.close()

        return [
            {
                "question":   r[0],
                "answer":     r[1],
                "created_at": r[2].isoformat() if r[2] else None
            }
            for r in result
        ]
    except Exception as e:
        print(f"[memory] get_session_messages error: {e}")
        return []

def clear_history(user_id: str, session_id: Optional[str] = None):
    try:
        cache_key = f"history:{user_id}:{session_id}" if session_id else f"history:{user_id}"
        redis_client.delete(cache_key)
    except Exception as e:
        print(f"[memory] redis clear error: {e}")

    try:
        db = SessionLocal()
        if session_id:
            if session_id == LEGACY_SESSION_ID:
                db.execute(text(
                    """
                    DELETE FROM chat_history
                    WHERE user_id = :user_id
                      AND (session_id IS NULL OR session_id = :legacy_session_id)
                    """
                ), {"user_id": user_id, "legacy_session_id": LEGACY_SESSION_ID})
            else:
                db.execute(text(
                    "DELETE FROM chat_history WHERE user_id = :user_id AND session_id = :session_id"
                ), {"user_id": user_id, "session_id": session_id})
        else:
            db.execute(text(
                "DELETE FROM chat_history WHERE user_id = :user_id"
            ), {"user_id": user_id})
        db.commit()
        db.close()
    except Exception as e:
        print(f"[memory] postgres clear error: {e}")
