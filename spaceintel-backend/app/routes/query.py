from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.agent import run_agent
from app.core.security import get_current_user

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    question: str
    filename: Optional[str] = None

@router.post("/ask")
def ask_question(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = run_agent(
        question=request.question,
        user_id=str(current_user["id"]),
        filename=request.filename
    )
    return result