// recruitment-backend/websocket.js
const socketIo = require('socket.io');

function setupWebSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Store io instance globally for access in other modules
  global.io = io;

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their specific room
    socket.on('join', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Handle form status updates
    socket.on('subscribeToFormUpdates', (caseId) => {
      socket.join(`case-${caseId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

// Add this to your main server.js
// const http = require('http');
// const server = http.createServer(app);
// const io = setupWebSocket(server);
// server.listen(PORT, () => { ... });

module.exports = setupWebSocket;
