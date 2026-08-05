import { useState } from 'react';
import type { OnlineStatus } from '../hooks/useOnlineGame';
import type { Side } from './Controls';

interface OnlineLobbyProps {
  status: OnlineStatus;
  roomId: string | null;
  color: Side | null;
  errorMessage: string | null;
  onCreate: () => void;
  onJoin: (roomId: string) => void;
  onLeave: () => void;
}

export function OnlineLobby({ status, roomId, color, errorMessage, onCreate, onJoin, onLeave }: OnlineLobbyProps) {
  const [joinCode, setJoinCode] = useState('');

  if (status === 'idle' || status === 'error') {
    return (
      <div className="online-lobby">
        {errorMessage && <div className="history-error">{errorMessage}</div>}
        <button className="new-game" onClick={onCreate}>
          Create Room
        </button>
        <div className="online-join-row">
          <input
            className="select-input online-code-input"
            placeholder="Room code"
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button className="toggle" disabled={joinCode.length !== 6} onClick={() => onJoin(joinCode)}>
            Join
          </button>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return <div className="online-lobby">Connecting…</div>;
  }

  return (
    <div className="online-lobby">
      <div className="online-room-code">
        Room: <strong>{roomId}</strong> {color && `— you're ${color === 'w' ? 'White' : 'Black'}`}
      </div>
      {status === 'waiting' && <div className="history-empty">Waiting for an opponent to join…</div>}
      {status === 'opponent-left' && <div className="history-error">Opponent disconnected.</div>}
      <button className="resign" onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}
