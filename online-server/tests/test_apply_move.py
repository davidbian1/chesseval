from app.main import _apply_move
from app.rooms import create_room


def test_applies_a_legal_move():
    room = create_room()
    move = _apply_move(room, "e2", "e4", None)
    assert move is not None
    assert room.board.fen().startswith("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR")


def test_rejects_an_illegal_move():
    room = create_room()
    move = _apply_move(room, "e2", "e5", None)
    assert move is None
    # Board must be untouched — still the starting position.
    assert room.board.fen() == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_rejects_a_move_from_an_empty_square():
    room = create_room()
    move = _apply_move(room, "e4", "e5", None)
    assert move is None


def test_applies_a_promotion_and_the_pawn_becomes_the_chosen_piece():
    room = create_room()
    # A white pawn one step from queening; black king out of the way on h8 so
    # e8 is actually empty for it to promote onto.
    room.board.set_fen("7k/4P3/8/8/8/8/8/4K3 w - - 0 1")
    move = _apply_move(room, "e7", "e8", "q")
    assert move is not None
    piece = room.board.piece_at(move.to_square)
    assert piece is not None
    assert piece.symbol() == "Q"


def test_rejects_a_promotion_to_an_invalid_piece_letter():
    room = create_room()
    room.board.set_fen("7k/4P3/8/8/8/8/8/4K3 w - - 0 1")
    move = _apply_move(room, "e7", "e8", "z")
    assert move is None
