from __future__ import annotations

import json
from typing import Any, Literal

import chess
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .rooms import Room, create_room, delete_room, get_room

app = FastAPI(title="chesseval-online-server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Color = Literal["w", "b"]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _opponent(room: Room, color: Color) -> WebSocket | None:
    return room.black if color == "w" else room.white


async def _send(ws: WebSocket, message: dict[str, Any]) -> None:
    try:
        await ws.send_text(json.dumps(message))
    except RuntimeError:
        pass  # socket already closed


def _apply_move(room: Room, uci_from: str, uci_to: str, promotion: str | None) -> chess.Move | None:
    """Validates and applies a move server-side. Returns the applied Move, or None if illegal."""
    try:
        move = chess.Move.from_uci(f"{uci_from}{uci_to}{promotion or ''}")
    except ValueError:
        return None
    if move not in room.board.legal_moves:
        return None
    room.board.push(move)
    return move


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    room: Room | None = None
    color: Color | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "error", "message": "Malformed message"})
                continue

            msg_type = msg.get("type")

            if msg_type == "create":
                room = create_room()
                room.white = websocket
                color = "w"
                await _send(
                    websocket,
                    {"type": "joined", "roomId": room.id, "color": "w", "fen": room.board.fen()},
                )

            elif msg_type == "join":
                target = get_room(str(msg.get("roomId", "")))
                if target is None:
                    await _send(websocket, {"type": "error", "message": "Room not found"})
                    continue
                if target.white and target.black:
                    await _send(websocket, {"type": "error", "message": "Room is full"})
                    continue
                room = target
                color = "b" if room.white else "w"
                if color == "w":
                    room.white = websocket
                else:
                    room.black = websocket
                await _send(
                    websocket,
                    {"type": "joined", "roomId": room.id, "color": color, "fen": room.board.fen()},
                )
                opponent = _opponent(room, color)
                if opponent:
                    await _send(opponent, {"type": "opponent-joined"})

            elif msg_type == "move":
                if room is None or color is None:
                    continue
                expected_turn = chess.WHITE if color == "w" else chess.BLACK
                if room.board.turn != expected_turn:
                    await _send(websocket, {"type": "error", "message": "Not your turn"})
                    continue
                from_sq, to_sq = str(msg.get("from", "")), str(msg.get("to", ""))
                move = _apply_move(room, from_sq, to_sq, msg.get("promotion"))
                if move is None:
                    await _send(websocket, {"type": "error", "message": "Illegal move"})
                    continue
                payload = {
                    "type": "move",
                    "from": msg.get("from"),
                    "to": msg.get("to"),
                    "promotion": msg.get("promotion"),
                    "fen": room.board.fen(),
                }
                if room.white:
                    await _send(room.white, payload)
                if room.black:
                    await _send(room.black, payload)

            elif msg_type == "resign":
                if room is None or color is None:
                    continue
                payload = {"type": "resigned", "color": color}
                if room.white:
                    await _send(room.white, payload)
                if room.black:
                    await _send(room.black, payload)

    except WebSocketDisconnect:
        pass
    finally:
        if room is not None and color is not None:
            if color == "w":
                room.white = None
            else:
                room.black = None
            opponent = _opponent(room, color)
            if opponent:
                await _send(opponent, {"type": "opponent-left"})
            if room.white is None and room.black is None:
                delete_room(room.id)
