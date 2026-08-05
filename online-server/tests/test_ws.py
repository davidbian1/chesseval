import re
from contextlib import ExitStack

from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession

from app.main import app

client = TestClient(app)


def _create_and_join(stack: ExitStack) -> tuple[WebSocketTestSession, WebSocketTestSession, str]:
    """Creates a room, joins it with a second connection, and drains the
    "joined"/"opponent-joined" handshake. Returns (white_ws, black_ws, room_id),
    both still open — closed automatically when the ExitStack exits."""
    white = stack.enter_context(client.websocket_connect("/ws"))
    white.send_json({"type": "create"})
    created = white.receive_json()

    black = stack.enter_context(client.websocket_connect("/ws"))
    black.send_json({"type": "join", "roomId": created["roomId"]})
    joined = black.receive_json()
    opponent_joined = white.receive_json()

    assert joined == {"type": "joined", "roomId": created["roomId"], "color": "b", "fen": created["fen"]}
    assert opponent_joined == {"type": "opponent-joined"}

    return white, black, created["roomId"]


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_create_room_becomes_white():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "create"})
        msg = ws.receive_json()
        assert msg["type"] == "joined"
        assert msg["color"] == "w"
        assert re.fullmatch(r"[A-Z0-9]{6}", msg["roomId"])
        assert msg["fen"] == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_second_client_joins_as_black_and_notifies_white():
    with ExitStack() as stack:
        _create_and_join(stack)  # assertions live in the helper


def test_rejects_joining_unknown_room():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "join", "roomId": "ZZZZZZ"})
        msg = ws.receive_json()
        assert msg == {"type": "error", "message": "Room not found"}


def test_rejects_joining_full_room():
    with ExitStack() as stack:
        _white, _black, room_id = _create_and_join(stack)
        third = stack.enter_context(client.websocket_connect("/ws"))
        third.send_json({"type": "join", "roomId": room_id})
        msg = third.receive_json()
        assert msg == {"type": "error", "message": "Room is full"}


def test_relays_a_legal_move_to_both_players_with_the_updated_fen():
    with ExitStack() as stack:
        white, black, _room_id = _create_and_join(stack)
        white.send_json({"type": "move", "from": "e2", "to": "e4"})
        white_echo = white.receive_json()
        black_echo = black.receive_json()
        expected = {"type": "move", "from": "e2", "to": "e4", "promotion": None, "fen": white_echo["fen"]}
        assert white_echo == expected
        assert black_echo == white_echo
        assert " b " in white_echo["fen"]  # black to move next


def test_rejects_a_move_played_out_of_turn():
    with ExitStack() as stack:
        _white, black, _room_id = _create_and_join(stack)
        black.send_json({"type": "move", "from": "e7", "to": "e5"})
        msg = black.receive_json()
        assert msg == {"type": "error", "message": "Not your turn"}


def test_rejects_an_illegal_move():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "create"})
        ws.receive_json()
        ws.send_json({"type": "move", "from": "e2", "to": "e5"})
        msg = ws.receive_json()
        assert msg == {"type": "error", "message": "Illegal move"}


def test_notifies_the_remaining_player_when_their_opponent_disconnects():
    with ExitStack() as stack:
        white, black, _room_id = _create_and_join(stack)
        black.close()
        msg = white.receive_json()
        assert msg == {"type": "opponent-left"}


def test_relays_a_resignation_to_both_players():
    with ExitStack() as stack:
        white, black, _room_id = _create_and_join(stack)
        white.send_json({"type": "resign"})
        white_msg = white.receive_json()
        black_msg = black.receive_json()
        assert white_msg == {"type": "resigned", "color": "w"}
        assert black_msg == white_msg
