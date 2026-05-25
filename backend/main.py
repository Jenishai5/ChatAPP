import json
import os
from contextlib import asynccontextmanager
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

load_dotenv()


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"],
    )
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageIn(BaseModel):
    username: str
    content: str


class ReactionIn(BaseModel):
    type: Literal["like", "dislike"]


@app.get("/api/messages")
async def get_messages():
    result = (
        app.state.db.table("messages")
        .select("*")
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    return result.data


@app.post("/api/messages")
async def post_message(body: MessageIn):
    result = (
        app.state.db.table("messages")
        .insert({"username": body.username.strip(), "content": body.content.strip()})
        .execute()
    )
    row = result.data[0]
    await manager.broadcast({"type": "new_message", **row})
    return row


@app.post("/api/messages/{message_id}/react")
async def react_to_message(message_id: str, body: ReactionIn):
    current = (
        app.state.db.table("messages")
        .select("likes, dislikes")
        .eq("id", message_id)
        .single()
        .execute()
    )
    data = current.data
    update = (
        {"likes": data["likes"] + 1}
        if body.type == "like"
        else {"dislikes": data["dislikes"] + 1}
    )
    result = (
        app.state.db.table("messages")
        .update(update)
        .eq("id", message_id)
        .execute()
    )
    updated = result.data[0]
    await manager.broadcast({
        "type": "reaction_update",
        "id": message_id,
        "likes": updated["likes"],
        "dislikes": updated["dislikes"],
    })
    return updated


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
