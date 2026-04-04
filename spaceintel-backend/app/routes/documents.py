from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Header
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from app.services.pdf_processor import extract_text_from_pdf, chunk_text
from app.services.vector_store import add_chunks_to_index, search_similar
from app.services.hybrid_search import hybrid_search
from app.services.summarizer import summarize_document
from app.services.comparator import compare_documents
from app.services.report_generator import generate_chat_report
from app.core.security import get_current_user, decode_token
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploaded_pdfs")
MANIFEST_FILE = os.path.join(BASE_DIR, "documents_manifest.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def load_manifest() -> list:
    if os.path.exists(MANIFEST_FILE):
        try:
            with open(MANIFEST_FILE, "r") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception:
            return []
    return []

def save_manifest(docs: list):
    with open(MANIFEST_FILE, "w") as f:
        json.dump(docs, f, indent=2)

router = APIRouter(prefix="/documents", tags=["Documents"])

# ── UPLOAD ──
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    user_id = current_user["id"]
    print(f"[UPLOAD] user_id={user_id} filename={file.filename}")

    safe_filename = f"{user_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    file_bytes = await file.read()

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    result = extract_text_from_pdf(file_bytes)
    pages = result["pages"]
    total_pages = result["total_pages"]
    metadata = result["metadata"]

    chunks = chunk_text(pages)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    for chunk in chunks:
        chunk["user_id"] = user_id
        chunk["filename"] = file.filename

    add_chunks_to_index(chunks)

    manifest = load_manifest()
    manifest = [
        d for d in manifest
        if not (d["filename"] == file.filename and d.get("user_id") == user_id)
    ]
    manifest.append({
        "filename": file.filename,
        "safe_filename": safe_filename,
        "user_id": user_id,
        "total_pages": total_pages,
        "total_chunks": len(chunks),
        "metadata": metadata,
    })
    save_manifest(manifest)

    print(f"[UPLOAD] saved. total manifest entries={len(manifest)}")

    return {
        "filename": file.filename,
        "total_pages": total_pages,
        "total_chunks": len(chunks),
        "metadata": metadata,
    }

# ── LIST ──
@router.get("/list")
def list_documents(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    print(f"[LIST] user_id={user_id}")
    manifest = load_manifest()
    filtered = [d for d in manifest if d.get("user_id") == user_id]
    print(f"[LIST] returning {len(filtered)} docs")
    return filtered

# ── DELETE ──
@router.delete("/delete/{filename}")
def delete_document(filename: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    manifest = load_manifest()
    entry = next(
        (d for d in manifest if d["filename"] == filename and d.get("user_id") == user_id),
        None
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Document not found")

    safe_filename = entry.get("safe_filename", f"{user_id}_{filename}")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    manifest = [
        d for d in manifest
        if not (d["filename"] == filename and d.get("user_id") == user_id)
    ]
    save_manifest(manifest)
    return {"message": "Deleted successfully"}

# ── SUMMARIZE ──
@router.get("/summarize/{filename}")
def summarize_doc(filename: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    manifest = load_manifest()
    entry = next(
        (d for d in manifest if d["filename"] == filename and d.get("user_id") == user_id),
        None
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Document not found")
    return summarize_document(filename, user_id=user_id)

# ── COMPARE ──
class CompareRequest(BaseModel):
    filename1: str
    filename2: str

@router.post("/compare")
def compare_docs(req: CompareRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    return compare_documents(req.filename1, req.filename2, user_id=user_id)

# ── SERVE PDF ──
@router.get("/pdf/{filename}")
def serve_pdf(
    filename: str,
    token: str = Query(default=None),
    authorization: str = Header(default=None)
):
    # Try query param first (new tab), then Authorization header
    raw_token = None
    if token:
        raw_token = token
    elif authorization:
        try:
            _, raw_token = authorization.split(" ")
        except ValueError:
            pass

    if not raw_token:
        raise HTTPException(status_code=401, detail="Token required")

    payload = decode_token(raw_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    safe_filename = f"{user_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, media_type="application/pdf")

# ── EXPORT REPORT ──
class ExportRequest(BaseModel):
    messages: list

@router.post("/export-report")
def export_report(request: ExportRequest):
    pdf_bytes = generate_chat_report(request.messages)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=spaceintel_report.pdf"}
    )