import re

from app.rooms import create_room, delete_room, get_room, room_count


def test_creates_room_with_valid_id_and_starting_position():
    room = create_room()
    assert re.fullmatch(r"[A-Z0-9]{6}", room.id)
    assert room.white is None
    assert room.black is None
    assert room.board.fen() == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_retrieves_created_room_by_id():
    room = create_room()
    assert get_room(room.id) is room


def test_returns_none_for_unknown_id():
    assert get_room("ZZZZZZ") is None


def test_generates_unique_ids_across_many_rooms():
    ids = {create_room().id for _ in range(50)}
    assert len(ids) == 50


def test_removes_room_on_delete():
    room = create_room()
    before = room_count()
    delete_room(room.id)
    assert get_room(room.id) is None
    assert room_count() == before - 1
