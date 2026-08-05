import http from 'node:http';
import { createApp } from './app.js';
import { attachWebSocketServer } from './ws.js';

const port = Number(process.env.PORT) || 4000;

const server = http.createServer(createApp());
attachWebSocketServer(server);

server.listen(port, () => {
  console.log(`chesseval-server listening on port ${port}`);
});
