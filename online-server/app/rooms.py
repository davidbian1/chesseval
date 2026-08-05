from __future__ import annotations

import random
from dataclasses import dataclass, field

import chess
from fastapi import WebSocket

# Excludes visually ambiguous characters (0/O, 1/I/L) so a code is easy to
# read aloud or copy correctly.
_ROOM_ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_ROOM_ID_LENGTH = 6


@dataclass
class Room:
    id: str
    board: chess.Board = field(default_factory=chess.Board)
    white: WebSocket | None = None
    black: WebSocket | None = None


_rooms: dict[str, Room] = {}


def _generate_room_id() -> str:
    return "".join(random.choice(_ROOM_ID_CHARS) for _ in range(_ROOM_ID_LENGTH))


def create_room() -> Room:
    room_id = _generate_room_id()
    while room_id in _rooms:
        room_id = _generate_room_id()
    room = Room(id=room_id)
    _rooms[room_id] = room
    return room


def get_room(room_id: str) -> Room | None:
    return _rooms.get(room_id)


def delete_room(room_id: str) -> None:
    _rooms.pop(room_id, None)


def room_count() -> int:
    return len(_rooms)
