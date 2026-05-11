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
from pydantic import BaseModel
import json

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)

LANGUAGE_ALIASES = {
    "en": "en",
    "english": "en",
    "hi": "hi",
    "hindi": "hi",
    "te": "te",
    "telugu": "te",
    "ta": "ta",
    "tamil": "ta",
    "kn": "kn",
    "kannada": "kn",
    "bn": "bn",
    "bengali": "bn",
    "ml": "ml",
    "malayalam": "ml",
}

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari)",
    "te": "Telugu",
    "ta": "Tamil",
    "kn": "Kannada",
    "bn": "Bengali",
    "ml": "Malayalam",
}

SPACE_TOPIC_GUARDRAIL_MESSAGES = {
    "en": "SpaceIntel is restricted to space research topics only. Please ask questions related to space missions, satellites, or aerospace.",
    "hi": "SpaceIntel केवल अंतरिक्ष अनुसंधान विषयों तक सीमित है। कृपया अंतरिक्ष मिशनों, उपग्रहों या एयरोस्पेस से संबंधित प्रश्न पूछें।",
    "te": "SpaceIntel అంతరిక్ష పరిశోధన అంశాలకు మాత్రమే పరిమితం. దయచేసి అంతరిక్ష మిషన్లు, ఉపగ్రహాలు లేదా ఏరోస్పేస్‌కు సంబంధించిన ప్రశ్నలు అడగండి.",
    "ta": "SpaceIntel விண்வெளி ஆராய்ச்சி தலைப்புகளுக்கு மட்டும் கட்டுப்படுத்தப்பட்டுள்ளது. தயவுசெய்து விண்வெளி பயணங்கள், செயற்கைக்கோள்கள் அல்லது ஏரோஸ்பேஸ் தொடர்பான கேள்விகளை கேளுங்கள்.",
    "kn": "SpaceIntel ಅಂತರಿಕ್ಷ ಸಂಶೋಧನಾ ವಿಷಯಗಳಿಗೆ ಮಾತ್ರ ಸೀಮಿತವಾಗಿದೆ. ದಯವಿಟ್ಟು ಅಂತರಿಕ್ಷ ಮಿಷನ್‌ಗಳು, ಉಪಗ್ರಹಗಳು ಅಥವಾ ಏರೋಸ್ಪೇಸ್ ಸಂಬಂಧಿತ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",
    "bn": "SpaceIntel শুধুমাত্র মহাকাশ গবেষণা বিষয়ের জন্য সীমাবদ্ধ। অনুগ্রহ করে মহাকাশ মিশন, উপগ্রহ বা অ্যারোস্পেস সম্পর্কিত প্রশ্ন করুন।",
    "ml": "SpaceIntel ബഹിരാകാശ ഗവേഷണ വിഷയങ്ങൾക്കു മാത്രം പരിമിതപ്പെടുത്തിയിരിക്കുന്നു. ദയവായി ബഹിരാകാശ ദൗത്യങ്ങൾ, ഉപഗ്രഹങ്ങൾ, അല്ലെങ്കിൽ എയർോസ്പേസ് സംബന്ധമായ ചോദ്യങ്ങൾ ചോദിക്കുക.",
}


# --- Helpers ---

def is_clean_text(text: str) -> bool:
    if not text.strip():
        return False
    non_ascii = sum(1 for c in text if ord(c) > 127)
    return (non_ascii / len(text)) < 0.3


def normalize_output_language(preferred_language: str = "en") -> str:
    raw = (preferred_language or "en").strip().lower()
    return LANGUAGE_ALIASES.get(raw, "en")


def get_space_topic_guardrail_message(language_code: str = "en") -> str:
    return SPACE_TOPIC_GUARDRAIL_MESSAGES.get(language_code, SPACE_TOPIC_GUARDRAIL_MESSAGES["en"])


class NewsTranslationItem(BaseModel):
    id: str
    title: str = ""
    summary: str = ""


class NewsTranslationRequest(BaseModel):
    language: str = "en"
    articles: list[NewsTranslationItem] = []


def build_news_translation_prompt(articles: list[dict], language_code: str) -> str:
    target_language = LANGUAGE_NAMES.get(language_code, "English")
    payload = json.dumps(articles, ensure_ascii=False)
    return f"""Translate each article title and summary to {target_language}.
Rules:
- Preserve each article id exactly.
- Keep named entities, mission names, acronyms, and numbers accurate.
- Return only valid JSON array (no markdown, no explanation).
- Output format for each item: {{\"id\":\"...\",\"title\":\"...\",\"summary\":\"...\"}}

Input JSON:
{payload}
"""


@router.post("/news/translate")
def translate_news_items(payload: NewsTranslationRequest):
    language_code = normalize_output_language(payload.language)
    if language_code == "en" or not payload.articles:
        return {
            "items": [
                {"id": item.id, "title": item.title, "summary": item.summary}
                for item in payload.articles
            ]
        }

    source_items = [
        {
            "id": str(item.id),
            "title": (item.title or "")[:240],
            "summary": (item.summary or "")[:900],
        }
        for item in payload.articles[:20]
    ]

    prompt = build_news_translation_prompt(source_items, language_code)

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=3200,
            stream=False,
        )
        raw_content = (completion.choices[0].message.content or "").strip()
        parsed = json.loads(raw_content)

        if not isinstance(parsed, list):
            raise ValueError("Translation payload is not a list")

        translated_by_id = {}
        for item in parsed:
            if not isinstance(item, dict):
                continue
            item_id = str(item.get("id", "")).strip()
            if not item_id:
                continue
            translated_by_id[item_id] = {
                "id": item_id,
                "title": str(item.get("title", "")).strip(),
                "summary": str(item.get("summary", "")).strip(),
            }

        response_items = []
        for src in source_items:
            translated = translated_by_id.get(src["id"])
            if translated:
                response_items.append(translated)
            else:
                response_items.append(src)

        return {"items": response_items}
    except Exception:
        return {"items": source_items}


def text_matches_language(text: str, language_code: str) -> bool:
    sample = (text or "").strip()
    if not sample:
        return False

    if language_code == "en":
        return True

    script_ranges = {
        "hi": ('\u0900', '\u097F'),
        "bn": ('\u0980', '\u09FF'),
        "ta": ('\u0B80', '\u0BFF'),
        "te": ('\u0C00', '\u0C7F'),
        "kn": ('\u0C80', '\u0CFF'),
        "ml": ('\u0D00', '\u0D7F'),
    }
    start, end = script_ranges.get(language_code, ('\u0000', '\u0000'))
    script_chars = sum(1 for c in sample if start <= c <= end)
    return script_chars >= 8


def enforce_answer_language(answer: str, language_code: str, max_tokens: int) -> str:
    if language_code == "en" or text_matches_language(answer, language_code):
        return answer

    target_language = LANGUAGE_NAMES.get(language_code, "English")
    translate_prompt = f"""Translate the following answer to {target_language}.
Keep meaning, structure, headings, bullets, numbers, and technical terms accurate.
Output only the translated answer.

Answer to translate:
{answer}
"""

    try:
        translated = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": translate_prompt}],
            temperature=0,
            max_tokens=max_tokens,
            stream=False,
        )
        translated_text = (translated.choices[0].message.content or "").strip()
        return translated_text or answer
    except Exception:
        return answer

def detect_language_instruction(question: str, preferred_language: str = "English") -> str:
    preferred = normalize_output_language(preferred_language)
    language_map = {
        "en": "You MUST respond only in English, regardless of the language used in the question.",
        "english": "You MUST respond only in English, regardless of the language used in the question.",
        "hi": "You MUST respond only in Hindi language using Devanagari script, regardless of the language used in the question.",
        "hindi": "You MUST respond only in Hindi language using Devanagari script, regardless of the language used in the question.",
        "te": "You MUST respond only in Telugu language, regardless of the language used in the question.",
        "telugu": "You MUST respond only in Telugu language, regardless of the language used in the question.",
        "ta": "You MUST respond only in Tamil language, regardless of the language used in the question.",
        "tamil": "You MUST respond only in Tamil language, regardless of the language used in the question.",
        "kn": "You MUST respond only in Kannada language, regardless of the language used in the question.",
        "kannada": "You MUST respond only in Kannada language, regardless of the language used in the question.",
        "bn": "You MUST respond only in Bengali language, regardless of the language used in the question.",
        "bengali": "You MUST respond only in Bengali language, regardless of the language used in the question.",
        "ml": "You MUST respond only in Malayalam language, regardless of the language used in the question.",
        "malayalam": "You MUST respond only in Malayalam language, regardless of the language used in the question.",
    }

    if preferred in language_map:
        return language_map[preferred]

    hindi_chars     = sum(1 for c in question if '\u0900' <= c <= '\u097F')
    tamil_chars     = sum(1 for c in question if '\u0B80' <= c <= '\u0BFF')
    telugu_chars    = sum(1 for c in question if '\u0C00' <= c <= '\u0C7F')
    kannada_chars   = sum(1 for c in question if '\u0C80' <= c <= '\u0CFF')
    malayalam_chars = sum(1 for c in question if '\u0D00' <= c <= '\u0D7F')
    bengali_chars   = sum(1 for c in question if '\u0980' <= c <= '\u09FF')

    if hindi_chars > 2:
        return "The user is asking in Hindi. Respond only in Hindi language using Devanagari script."
    elif tamil_chars > 2:
        return "The user is asking in Tamil. Respond only in Tamil language."
    elif telugu_chars > 2:
        return "The user is asking in Telugu. Respond only in Telugu language."
    elif kannada_chars > 2:
        return "The user is asking in Kannada. Respond only in Kannada language."
    elif malayalam_chars > 2:
        return "The user is asking in Malayalam. Respond only in Malayalam language."
    elif bengali_chars > 2:
        return "The user is asking in Bengali. Respond only in Bengali language."
    else:
        return "Respond only in English."

def get_length_instruction(response_length: str) -> str:
    length = (response_length or "balanced").strip().lower()
    if length == "concise":
        return "Keep the answer concise. Lead with the direct answer and include only the most relevant supporting details."
    if length == "detailed":
        return "Provide a detailed answer with clear explanations, important caveats, and structured supporting points when useful."
    return "Provide a balanced answer with a direct response followed by the most useful supporting detail."


def resolve_generation_preferences(response_length: str, strategy_max_tokens: int) -> tuple[int, float]:
    strategy_limit = max(strategy_max_tokens or 900, 400)
    length = (response_length or "balanced").strip().lower()

    if length == "concise":
        return max(300, int(strategy_limit * 0.6)), 0.1
    if length == "detailed":
        return min(1800, int(strategy_limit * 1.4)), 0.3
    return strategy_limit, 0.2


def build_history_prompt(
    history: list,
    question: str,
    context: str,
    preferred_language: str = "English",
    response_length: str = "balanced"
) -> str:
    history_text = ""
    if history:
        history_text = "Previous conversation:\n"
        for turn in history[-4:]:
            history_text += f"User: {turn['question']}\n"
            history_text += f"Assistant: {turn['answer'][:300]}...\n\n"

    lang_instruction = detect_language_instruction(question, preferred_language)
    length_instruction = get_length_instruction(response_length)

    return f"""You are SpaceIntel, an AI assistant for space research documents.
Use the context and conversation history below to answer the question.
If the question refers to something mentioned earlier, use the history to understand it.
{lang_instruction}
Do not switch output language based on user question language. Follow the selected output language instruction strictly.
{length_instruction}
Base your answer only on the supplied document context and clearly say when the documents do not contain the answer.

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
            preferred_language = normalize_output_language(payload.get("language", "en"))

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
                    "content": get_space_topic_guardrail_message(preferred_language)
                }))
                await websocket.send_text(json.dumps({
                    "type": "done", "sources": [], "fact_check": []
                    , "session_id": session_id
                }))
                continue

            # Cache check
            cached = get_cached_response(
                question,
                user_id=user_id,
                filename=filename,
                response_length=response_length,
                language=preferred_language,
            )
            if cached:
                if user_id:
                    save_turn(user_id, question, cached["answer"], session_id=session_id)
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
            prompt = build_history_prompt(
                chat_history,
                question,
                context,
                preferred_language,
                response_length,
            )
            max_tokens, preferred_temperature = resolve_generation_preferences(
                response_length,
                strategy["max_tokens"],
            )

            # Stream tokens
            full_answer = ""
            if preferred_language == "en":
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
            else:
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=preferred_temperature,
                    max_tokens=max_tokens,
                    stream=False
                )
                generated = (completion.choices[0].message.content or "").strip()
                full_answer = enforce_answer_language(generated, preferred_language, max_tokens)

                for idx in range(0, len(full_answer), 80):
                    delta = full_answer[idx:idx + 80]
                    await websocket.send_text(json.dumps({
                        "type": "token",
                        "content": delta
                    }))

            # Persist turn to Redis + PostgreSQL via memory service
            if user_id:
                save_turn(user_id, question, full_answer, session_id=session_id)

            # Fact check
            fact_results = fact_check_answer(full_answer, relevant_chunks)

            # Cache result
            set_cached_response(
                question,
                {
                    "answer":     full_answer,
                    "sources":    sources,
                    "fact_check": fact_results
                },
                user_id=user_id,
                filename=filename,
                response_length=response_length,
                language=preferred_language,
            )

            await websocket.send_text(json.dumps({
                "type":       "done",
                "sources":    sources,
                "fact_check": fact_results,
                "session_id": session_id
            }))

    except WebSocketDisconnect:
        pass
