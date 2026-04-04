from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.hybrid_search import hybrid_search
from app.services.reranker import rerank_chunks
from app.services.qa_service import is_space_related
from app.services.cache import get_cached_response, set_cached_response, check_rate_limit
from app.services.agent import classify_node, AgentState
from app.services.fact_checker import fact_check_answer
from app.services.memory import get_history, save_turn, generate_session_id
from app.core.security import decode_token
from app.core.config import settings
from groq import Groq
import json

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)


# --- Helpers ---

def is_clean_text(text: str) -> bool:
    if not text.strip():
        return False
    non_ascii = sum(1 for c in text if ord(c) > 127)
    return (non_ascii / len(text)) < 0.3

def detect_language_instruction(question: str, preferred_language: str = "English") -> str:
    preferred = (preferred_language or "English").strip().lower()
    language_map = {
        "english": "Respond in English.",
        "hindi": "Respond in Hindi language using Devanagari script.",
        "telugu": "Respond in Telugu language.",
        "tamil": "Respond in Tamil language.",
        "kannada": "Respond in Kannada language.",
        "bengali": "Respond in Bengali language.",
        "malayalam": "Respond in Malayalam language.",
    }

    if preferred in language_map and preferred != "english":
        return language_map[preferred]

    hindi_chars     = sum(1 for c in question if '\u0900' <= c <= '\u097F')
    tamil_chars     = sum(1 for c in question if '\u0B80' <= c <= '\u0BFF')
    telugu_chars    = sum(1 for c in question if '\u0C00' <= c <= '\u0C7F')
    kannada_chars   = sum(1 for c in question if '\u0C80' <= c <= '\u0CFF')
    malayalam_chars = sum(1 for c in question if '\u0D00' <= c <= '\u0D7F')
    bengali_chars   = sum(1 for c in question if '\u0980' <= c <= '\u09FF')

    if hindi_chars > 2:
        return "The user is asking in Hindi. Respond in Hindi language using Devanagari script."
    elif tamil_chars > 2:
        return "The user is asking in Tamil. Respond in Tamil language."
    elif telugu_chars > 2:
        return "The user is asking in Telugu. Respond in Telugu language."
    elif kannada_chars > 2:
        return "The user is asking in Kannada. Respond in Kannada language."
    elif malayalam_chars > 2:
        return "The user is asking in Malayalam. Respond in Malayalam language."
    elif bengali_chars > 2:
        return "The user is asking in Bengali. Respond in Bengali language."
    else:
        return "Respond in English."

def resolve_generation_preferences(response_length: str) -> tuple[int, float]:
    length = (response_length or "balanced").strip().lower()
    if length == "concise":
        return 500, 0.1
    if length == "detailed":
        return 1300, 0.35
    return 900, 0.2


def build_history_prompt(history: list, question: str, context: str, preferred_language: str = "English") -> str:
    history_text = ""
    if history:
        history_text = "Previous conversation:\n"
        for turn in history[-4:]:
            history_text += f"User: {turn['question']}\n"
            history_text += f"Assistant: {turn['answer'][:300]}...\n\n"

    lang_instruction = detect_language_instruction(question, preferred_language)

    return f"""You are SpaceIntel, an AI assistant for space research documents.
Use the context and conversation history below to answer the question.
If the question refers to something mentioned earlier, use the history to understand it.
{lang_instruction}

{history_text}
Current Context:
{context}

Current Question: {question}

Answer:"""


# --- WebSocket endpoint ---

@router.websocket("/ws/ask")
async def websocket_ask(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            payload  = json.loads(data)
            question = payload.get("question", "").strip()
            token    = payload.get("token", "")
            filename = payload.get("filename")
            session_id = payload.get("session_id")
            response_length = payload.get("response_length", "balanced")
            preferred_language = payload.get("language", "English")

            # Extract user_id from JWT
            user_id = None
            if token:
                decoded = decode_token(token)
                if decoded:
                    user_id = decoded.get("sub")

            if user_id and not session_id:
                session_id = generate_session_id()

            # Load history from memory service (Redis → PostgreSQL fallback)
            chat_history = get_history(user_id, session_id=session_id) if user_id else []

            # Per-user rate limiting
            rate_key = user_id or websocket.client.host
            if not check_rate_limit(user_id=rate_key):
                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "content": "Rate limit exceeded. Please wait a moment before asking again."
                }))
                await websocket.send_text(json.dumps({
                    "type": "done", "sources": [], "fact_check": []
                    , "session_id": session_id
                }))
                continue

            # Space topic guard
            if not is_space_related(question):
                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "content": "SpaceIntel is restricted to space research topics only. Please ask questions related to space missions, satellites, or aerospace."
                }))
                await websocket.send_text(json.dumps({
                    "type": "done", "sources": [], "fact_check": []
                    , "session_id": session_id
                }))
                continue

            # Cache check
            cached = get_cached_response(question)
            if cached:
                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "content": cached["answer"] + " ⚡ (cached)"
                }))
                await websocket.send_text(json.dumps({
                    "type": "done",
                    "sources":    cached["sources"],
                    "fact_check": cached.get("fact_check", []),
                    "session_id": session_id
                }))
                continue

            # Classify via LangGraph agent node
            state = classify_node(AgentState(
                question=question,
                category="",
                strategy={},
                chunks=[],
                answer="",
                sources=[],
                user_id=user_id,
                filename=filename
            ))
            strategy = state["strategy"]

            await websocket.send_text(json.dumps({
                "type":     "strategy",
                "label":    strategy["label"],
                "category": strategy["category"]
            }))

            # Retrieve + rerank
            raw_chunks      = hybrid_search(question, top_k=strategy["top_k"], user_id=user_id)
            relevant_chunks = rerank_chunks(question, raw_chunks, top_k=strategy["rerank_k"])

            sources = [
                {
                    "page_number": c["chunk"]["page_number"],
                    "text":        c["chunk"]["text"][:200],
                    "filename":    c["chunk"].get("filename", "unknown.pdf")
                }
                for c in relevant_chunks
                if is_clean_text(c["chunk"]["text"])
            ]

            context = "\n\n".join([
                f"[Page {c['chunk']['page_number']}]: {c['chunk']['text']}"
                for c in relevant_chunks
                if is_clean_text(c["chunk"]["text"])
            ])

            if not context:
                await websocket.send_text(json.dumps({
                    "type":    "answer",
                    "content": "No relevant documents found. Please upload space research documents first."
                }))
                await websocket.send_text(json.dumps({
                    "type": "done", "sources": [], "fact_check": []
                    , "session_id": session_id
                }))
                continue

            # Build prompt with history
            prompt = build_history_prompt(chat_history, question, context, preferred_language)
            preferred_tokens, preferred_temperature = resolve_generation_preferences(response_length)
            max_tokens = min(strategy["max_tokens"], preferred_tokens)

            # Stream tokens
            full_answer = ""
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=preferred_temperature,
                max_tokens=max_tokens,
                stream=True
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_answer += delta
                    await websocket.send_text(json.dumps({
                        "type":    "token",
                        "content": delta
                    }))

            # Persist turn to Redis + PostgreSQL via memory service
            if user_id:
                save_turn(user_id, question, full_answer, session_id=session_id)

            # Fact check
            fact_results = fact_check_answer(full_answer, relevant_chunks)

            # Cache result
            set_cached_response(question, {
                "answer":     full_answer,
                "sources":    sources,
                "fact_check": fact_results
            })

            await websocket.send_text(json.dumps({
                "type":       "done",
                "sources":    sources,
                "fact_check": fact_results,
                "session_id": session_id
            }))

    except WebSocketDisconnect:
        pass