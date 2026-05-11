# SpaceIntel

SpaceIntel is an AI-powered workspace for space research. Users can upload mission PDFs, ask questions in chat, inspect evidence sources, verify claims, summarize and compare documents, and keep persistent conversation history.

This README explains how the app works functionally, what each feature does, and how to run it locally.

## What The App Does

SpaceIntel solves a practical problem: making large space documents easy to query and analyze.

Instead of manually reading hundreds of pages, users can:

1. Upload PDF reports, papers, mission briefs, and technical documents.
2. Let the backend extract text, split into chunks, and index those chunks.
3. Ask natural-language questions.
4. Receive streamed answers grounded in retrieved document context.
5. Inspect source snippets and jump to the exact PDF page.
6. Run fact-checking over generated claims.
7. Save sessions automatically and return to them later.

## Functional Modules

### 1. Authentication

- Register and login endpoints issue JWT bearer tokens.
- Frontend stores token in local storage and includes it on protected requests.
- Protected areas include document upload, library operations, chat history, and PDF serving.

### 2. Document Ingestion And Indexing

Upload flow:

1. User uploads a PDF.
2. Backend validates file type and stores it under a user-specific safe filename.
3. Text is extracted from the PDF.
4. Extracted text is chunked into retrieval-friendly segments.
5. Chunks are tagged with metadata (user_id, filename, page number).
6. Chunks are embedded and stored in Qdrant.
7. Document metadata is added to manifest storage.

Result:

- The document appears in the library.
- It becomes searchable in chat for that user.

### 3. Chat Question Answering

SpaceIntel chat uses a streaming WebSocket endpoint for real-time interaction.

Per-question runtime behavior:

1. User sends question + token + session_id + settings (response length, language).
2. Topic validation: Non-space-topic questions are rejected by a topic guard to keep responses focused on space research.
3. Rate limiting: Backend enforces request rate limits to prevent abuse.
4. Cache lookup: Existing cache is checked for quick reuse of similar questions.
5. Query classification: Question is routed through an AI agent that classifies it as Simple, Complex, Comparison, or Summary type.
6. Hybrid retrieval: Runs dual search using dense vector embeddings + BM25 lexical matching across indexed documents.
7. Reranking: Results are reranked using Cohere to improve relevance.
8. LLM generation: Response is generated using Groq-hosted LLM and streamed token-by-token to client.
9. Session memory: Latest turns are cached in Redis and persisted in PostgreSQL for context.
10. Fact-checking: Generated claims are automatically extracted and verified against retrieved chunks.
11. Client delivery: Final payload includes answer, sources, fact-check results, session_id.

### 4. Query Classification and Routing (Agent System)

The query classification system intelligently routes questions to the most appropriate handling strategy:

- **Simple queries**: Direct factual questions answered from document context (e.g., "What is the ISS altitude?")
- **Complex queries**: Multi-step reasoning questions requiring synthesis from multiple documents
- **Comparison queries**: Questions asking to compare two or more documents or concepts
- **Summary queries**: Requests to summarize document content or key findings

The agent evaluates each question and selects the optimal retrieval and generation parameters, improving both speed and answer quality.

### 5. Source Transparency

- Each answer can show supporting sources.
- Source entries include filename, page number, and a snippet preview.
- Clicking a source opens the PDF directly to the cited page.

### 6. Fact-Check Layer

- The app extracts factual claims from generated output.
- Each claim is evaluated against retrieved context.
- UI displays claim verdicts (supported or unsupported) for transparency.

### 7. Session Memory And History

- Chat sessions are identified by session_id.
- Latest turns are cached in Redis for fast context retrieval.
- History is persisted in PostgreSQL for long-term access.
- Users can list sessions, open prior sessions, rename, pin, and delete sessions.

### 8. Library Actions

The library supports:

- View all indexed documents for current user.
- Open original PDF.
- Summarize a document.
- Compare two documents.
- Delete a document.

### 9. Multi-Language Support

SpaceIntel supports 7 languages for both document processing and responses:

- **English** (en)
- **Hindi** (hi) - Devanagari script
- **Telugu** (te)
- **Tamil** (ta)
- **Kannada** (kn)
- **Bengali** (bn)
- **Malayalam** (ml)

Features:
- Users can set language preference in profile settings.
- Responses are generated and streamed in the user's preferred language.
- Topic guardrail messages are localized for each language.
- Document summaries and comparisons respect language preferences.

### 10. News Feed And Translation

The News page provides real-time space news updates:

- **Automatic polling**: News feed polls external APIs for latest space missions, satellite launches, and aerospace discoveries.
- **News translation**: News articles can be translated to any of the 7 supported languages for global accessibility.
- **Watchlist**: Users can save interesting articles to a personal watchlist for later reading.
- **Content preservation**: News translation preserves mission names, acronyms, and technical entities while providing fluent translations.

### 11. Report Generation And Export

Chat conversations can be exported as professional PDF reports:

- **Export endpoint**: Users can export a conversation session as a formatted PDF.
- **Report contents**: Includes full Q&A pairs, sources, fact-check results, and timestamps.
- **Formatting**: Reports are generated with proper styling and pagination.
- **Download ready**: Users can download reports for archival, sharing, or offline reference.

### 12. Performance Optimization Features

**Caching Layer**:
- Frequently asked questions and their responses are cached in Redis.
- Cache lookups prevent redundant LLM API calls and improve response latency.
- Cache is user-scoped to maintain privacy and relevance.

**Rate Limiting**:
- Per-user rate limits prevent abuse and ensure fair resource allocation.
- Rate limits are enforced at the WebSocket question endpoint.
- Users are informed of rate limit status via API responses.

**Query Rewriting**:
- Incoming questions are augmented with query variants to improve retrieval recall.
- Multiple query versions are generated (original, context-enhanced, keyword-focused).
- Each variant is searched independently, and results are combined for better coverage.
- Helps find relevant documents that might be missed with a single query formulation.

**Hybrid Search**:
- Combines dense vector embeddings (semantic understanding) with BM25 lexical matching (keyword relevance).
- Dual matching improves recall for both semantic and keyword-based queries.
- Results are fused and reranked for optimal relevance.

### 13. Profile And Settings

Profile section includes:

- Personal details
- Quick library overview
- Settings controls

Settings currently include:

- Response length: concise, balanced, detailed
- Language preference: affects response language instruction in prompt
- Font size preference: applied to chat content rendering
- Notification/auto-export toggles (saved for client behavior)

## User Journey (Typical)

1. Register and login.
2. Open Upload and index one or more PDFs.
3. Open Library to validate metadata and optionally summarize.
4. Open Chat and ask mission-specific questions.
5. Expand sources and fact-check panels to validate responses.
6. Return later and continue from saved session history.
7. Use Profile settings to adjust reading and response behavior.

## Pages And Their Purpose

- `/`: Landing page
- `/login`: User login
- `/register`: User registration
- `/home`: Dashboard-like entry after auth
- `/upload`: Upload and index PDFs
- `/library`: Manage uploaded and indexed documents
- `/chat`: Main AI interaction surface (streaming answers)
- `/news`: Space news feed with polling and watchlist
- `/profile`: User details, settings, personal library view

## API Overview

Auth:

- `POST /auth/register`
- `POST /auth/login`

Documents:

- `POST /documents/upload`
- `GET /documents/list`
- `DELETE /documents/delete/{filename}`
- `GET /documents/summarize/{filename}` (with optional language parameter)
- `POST /documents/compare` (compare two documents with language support)
- `GET /documents/pdf/{filename}`
- `POST /documents/export-report` (export chat session as PDF)

Query:

- `POST /query/ask` (HTTP)
- `WS /ws/ask` (streaming chat with rate limiting and caching)

News:

- `POST /query/news/translate` (translate news articles to supported languages)

History:

- `GET /history/sessions`
- `GET /history/sessions/{session_id}`
- `DELETE /history/sessions/{session_id}`
- `PATCH /history/sessions/{session_id}/title`
- `PATCH /history/sessions/{session_id}/pin`

## Architecture Snapshot

- Frontend: Next.js App Router UI and state management
- Backend: FastAPI routes + service layer
- Retrieval: Qdrant vectors + BM25 hybrid ranking
- Rerank: Cohere reranker
- Generation: Groq-hosted LLM
- Memory: Redis cache + PostgreSQL persistence

## Local Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker Desktop (or Docker Engine)
- Tesseract OCR on PATH
- Poppler on PATH (for pdf2image)

### 1. Start infrastructure

From project root:

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, and Qdrant.

### 2. Create backend env file

Create `spaceintel-backend/.env`:

```env
DATABASE_URL=postgresql://spaceintel:secret@localhost:5432/spaceintel_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=replace_with_a_strong_secret

OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
COHERE_API_KEY=your_cohere_key

LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=spaceintel
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Install and run backend

```bash
cd spaceintel-backend
python -m venv venv

# Windows PowerShell
venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic-settings python-jose passlib[bcrypt] python-multipart redis qdrant-client sentence-transformers rank-bm25 numpy pymupdf pytesseract pdf2image pillow fpdf groq cohere langchain langchain-groq langgraph langsmith

uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.

### 4. Install and run frontend

```bash
cd spaceintel-frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Current Limitations

- Frontend API calls are mostly hardcoded to `localhost:8000`.
- Settings are local-storage based; no server-side profile sync yet.
- News feed depends on external API availability.

## Security Notes

- Never commit API keys.
- Keep `.env` local only.
- Rotate keys if leaked.
- Use stronger production secrets and HTTPS in deployment.

## Troubleshooting

- 401 on protected requests:
  - Re-login and verify token in local storage.
- Backend startup errors:
  - Verify `.env` keys and Docker services.
- OCR extraction issues:
  - Confirm Tesseract and Poppler are installed and on PATH.
- WebSocket disconnects:
  - Ensure backend is up on port 8000 and firewall allows local ws traffic.

## License

No license file is currently included. Add a `LICENSE` file before public distribution.