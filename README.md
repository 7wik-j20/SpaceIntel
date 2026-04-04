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

SpaceIntel chat uses a streaming WebSocket endpoint.

Per-question runtime behavior:

1. User sends question + token + session_id + settings (response length, language).
2. Backend enforces rate limiting.
3. Non-space-topic questions are rejected by a topic guard.
4. Existing cache is checked for quick reuse.
5. Query is classified (Simple, Complex, Comparison, Summary) to choose strategy.
6. Retrieval runs with hybrid search (dense vector + BM25 lexical).
7. Results are reranked with Cohere.
8. LLM response is generated and streamed token-by-token.
9. Session memory is updated in Redis and PostgreSQL.
10. Claims are fact-checked against retrieved chunks.
11. Client receives final payload: answer, sources, fact-check results, session_id.

### 4. Source Transparency

- Each answer can show supporting sources.
- Source entries include filename, page number, and a snippet preview.
- Clicking a source opens the PDF directly to the cited page.

### 5. Fact-Check Layer

- The app extracts factual claims from generated output.
- Each claim is evaluated against retrieved context.
- UI displays claim verdicts (supported or unsupported) for transparency.

### 6. Session Memory And History

- Chat sessions are identified by session_id.
- Latest turns are cached for fast context retrieval.
- History is persisted in PostgreSQL for long-term access.
- Users can list sessions, open prior sessions, rename, pin, and delete sessions.

### 7. Library Actions

The library supports:

- View all indexed documents for current user.
- Open original PDF.
- Summarize a document.
- Compare two documents.
- Delete a document.

### 8. Profile And Settings

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
- `GET /documents/summarize/{filename}`
- `POST /documents/compare`
- `GET /documents/pdf/{filename}`
- `POST /documents/export-report`

Query:

- `POST /query/ask` (HTTP)
- `WS /ws/ask` (streaming chat)

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