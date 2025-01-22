import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import app from './app';
import config from './config';
import { logger } from './shared/logger';

// Create HTTP and Socket.IO server
const httpServer = createServer(app);
export const io = new IOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', socket => {
  const userId = socket.handshake.auth.userId; // Pass userId during client connection
  if (!userId) {
    return;
  }
  // Join the user to a specific room
  socket.join(userId);
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const server = httpServer.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

export default server;
