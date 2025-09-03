// recruitment-backend/server.js - UPDATED FOR NEW FORM SYSTEM
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Import database
const database = require('./utils/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const formRoutes = require('./routes/form.routes');
const webhookRoutes = require('./routes/webhook.routes');
const formTemplateRoutes = require('./routes/formTemplate.routes');
const responseRoutes = require('./routes/response.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time notifications
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io globally available for notifications
global.io = io;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/templates', formTemplateRoutes);
app.use('/api/responses', responseRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Recruitment Backend API',
    version: '2.0.0',
    endpoints: {
      auth: {
        google: 'GET /api/auth/google',
        googleCallback: 'GET /api/auth/google/callback',
        microsoft: 'GET /api/auth/microsoft',
        microsoftCallback: 'GET /api/auth/microsoft/callback',
        status: 'GET /api/auth/status/:email',
        verify: 'POST /api/auth/verify'
      },
      templates: {
        create: 'POST /api/templates',
        list: 'GET /api/templates',
        get: 'GET /api/templates/:id',
        update: 'PUT /api/templates/:id',
        delete: 'DELETE /api/templates/:id'
      },
      forms: {
        send: 'POST /api/forms/send',
        get: 'GET /api/forms/:token',
        publicForm: 'GET /api/forms/public/:token'
      },
      responses: {
        submit: 'POST /api/responses/submit',
        list: 'GET /api/responses',
        get: 'GET /api/responses/:id',
        process: 'POST /api/responses/:id/process',
        createCandidate: 'POST /api/responses/:id/create-candidate'
      },
      notifications: {
        unread: 'GET /api/notifications/unread',
        markRead: 'POST /api/notifications/:id/read',
        websocket: 'WS /ws - Real-time notifications'
      }
    }
  });
});

// ==================== WEBSOCKET FOR NOTIFICATIONS ====================

// Track connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Register user for notifications
  socket.on('register', (userEmail) => {
    connectedUsers.set(socket.id, userEmail);
    socket.join(`user-${userEmail}`);
    console.log(`📧 User ${userEmail} registered for notifications`);
    
    // Send any unread notifications
    sendUnreadNotifications(socket, userEmail);
  });

  // Handle form response notification
  socket.on('formResponseReceived', async (data) => {
    const { formToken, candidateEmail, candidateName } = data;
    
    // Get form details to find the sender
    const form = await database.getFormByToken(formToken);
    if (form && form.sender_email) {
      // Create notification in database
      await database.createNotification({
        userEmail: form.sender_email,
        type: 'form_response',
        title: 'New Form Response',
        message: `${candidateName || candidateEmail} has submitted their form`,
        data: { formToken, candidateEmail, candidateName },
        priority: 'high',
        actionUrl: `/responses/${formToken}`
      });
      
      // Send real-time notification to the BSM user
      io.to(`user-${form.sender_email}`).emit('notification', {
        type: 'form_response',
        title: 'New Form Response!',
        message: `${candidateName || candidateEmail} has submitted their form`,
        timestamp: new Date().toISOString(),
        priority: 'high',
        data: { formToken, candidateEmail }
      });
      
      console.log(`📬 Notification sent to ${form.sender_email}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userEmail = connectedUsers.get(socket.id);
    if (userEmail) {
      console.log(`📴 User ${userEmail} disconnected`);
      connectedUsers.delete(socket.id);
    }
  });
});

// Send unread notifications when user connects
async function sendUnreadNotifications(socket, userEmail) {
  try {
    const unreadNotifications = await database.getUnreadNotifications(userEmail);
    if (unreadNotifications.length > 0) {
      socket.emit('unreadNotifications', unreadNotifications);
      console.log(`📨 Sent ${unreadNotifications.length} unread notifications to ${userEmail}`);
    }
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
  }
}

// ==================== NOTIFICATION HELPER ====================

// Global function to send notification (can be called from anywhere)
global.sendNotification = async (userEmail, notification) => {
  // Save to database
  await database.createNotification({
    userEmail,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    priority: notification.priority || 'normal',
    actionUrl: notification.actionUrl
  });
  
  // Send real-time if user is connected
  io.to(`user-${userEmail}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
};

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Log to database
  database.logActivity(
    null,
    null,
    'server_error',
    err.message,
    null
  ).catch(console.error);
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connection
  try {
    await database.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  // Exit process
  process.exit(0);
}

// ==================== START SERVER ====================

async function startServer() {
  try {
    // Connect to database
    await database.connect();
    console.log('✅ Database initialized with new tables');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
========================================
🚀 Recruitment Backend Server Started
========================================
📍 URL: http://localhost:${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔔 Notifications: WebSocket Enabled
🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
========================================
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
module.exports = { app, server, io };