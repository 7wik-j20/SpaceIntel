from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.memory import (
    get_sessions,
    get_session_messages,
    clear_history,
    rename_session,
    set_session_pinned,
)

router = APIRouter(prefix="/history", tags=["History"])


class RenameSessionRequest(BaseModel):
    title: str


class PinSessionRequest(BaseModel):
    pinned: bool

@router.get("/sessions")
def list_sessions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    sessions = get_sessions(str(user_id))
    return {"sessions": sessions}

@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    messages = get_session_messages(str(user_id), session_id)
    return {"session_id": session_id, "messages": messages}

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    clear_history(str(user_id), session_id)
    return {"message": "Session deleted", "session_id": session_id}


@router.patch("/sessions/{session_id}/title")
def update_session_title(
    session_id: str,
    request: RenameSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    rename_session(user_id, session_id, request.title)
    return {"message": "Session renamed", "session_id": session_id, "title": request.title}


@router.patch("/sessions/{session_id}/pin")
def pin_session(
    session_id: str,
    request: PinSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    pinned_sessions = set_session_pinned(user_id, session_id, request.pinned)
    return {
        "message": "Session pin updated",
        "session_id": session_id,
        "pinned": request.pinned,
        "pinned_sessions": pinned_sessions,
    }