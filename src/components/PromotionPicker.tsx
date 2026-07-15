import { UNICODE_PIECES } from './Board';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

const CHOICES: { piece: PromotionPiece; label: string }[] = [
  { piece: 'q', label: 'Queen' },
  { piece: 'r', label: 'Rook' },
  { piece: 'b', label: 'Bishop' },
  { piece: 'n', label: 'Knight' },
];

interface PromotionPickerProps {
  color: 'w' | 'b';
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export function PromotionPicker({ color, onPick, onCancel }: PromotionPickerProps) {
  return (
    <div className="promotion-backdrop" onClick={onCancel}>
      <div className="promotion-popup" onClick={(e) => e.stopPropagation()}>
        <div className="promotion-title">Promote to</div>
        <div className="promotion-choices">
          {CHOICES.map(({ piece, label }) => (
            <button
              key={piece}
              className="promotion-choice"
              aria-label={label}
              onClick={() => onPick(piece)}
            >
              <span className={`piece ${color}`}>{UNICODE_PIECES[`${color}${piece}`]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
