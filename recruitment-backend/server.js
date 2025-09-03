// recruitment-backend/server.js - UPDATED COMPLETE VERSION
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import database and services
const database = require('./utils/database');
const pollingService = require('./services/pollingService');

// Import routes
const authRoutes = require('./routes/auth.routes');
const formRoutes = require('./routes/form.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io globally available
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

// Static route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Recruitment Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        google: 'GET /api/auth/google',
        googleCallback: 'GET /api/auth/google/callback',
        microsoft: 'GET /api/auth/microsoft',
        microsoftCallback: 'GET /api/auth/microsoft/callback',
        status: 'GET /api/auth/status/:email',
        refresh: 'POST /api/auth/refresh',
        verify: 'POST /api/auth/verify'
      },
      forms: {
        send: 'POST /api/forms/send',
        get: 'GET /api/forms/:token',
        submit: 'POST /api/forms/:token/submit',
        status: 'GET /api/forms/:token/status',
        responses: 'GET /api/forms/:token/responses',
        resend: 'POST /api/forms/:token/resend',
        byCase: 'GET /api/forms/case/:caseId',
        checkResponses: 'POST /api/forms/check-responses/:caseId',
        pending: 'GET /api/forms/pending/all'
      },
      webhooks: {
        gmail: 'POST /api/webhooks/gmail',
        outlook: 'POST /api/webhooks/outlook',
        formSubmission: 'POST /api/webhooks/form-submission',
        sendgrid: 'POST /api/webhooks/sendgrid',
        status: 'POST /api/webhooks/status',
        register: 'POST /api/webhooks/register',
        verify: 'GET /api/webhooks/verify'
      }
    }
  });
});

// ==================== WEBSOCKET ====================

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Join user to their room
  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join case room for real-time updates
  socket.on('subscribeToCase', (caseId) => {
    socket.join(`case-${caseId}`);
    console.log(`Socket ${socket.id} subscribed to case ${caseId}`);
  });

  // Unsubscribe from case
  socket.on('unsubscribeFromCase', (caseId) => {
    socket.leave(`case-${caseId}`);
    console.log(`Socket ${socket.id} unsubscribed from case ${caseId}`);
  });

  // Manual form check request
  socket.on('checkFormStatus', async (data) => {
    try {
      const { token } = data;
      const form = await database.getFormByToken(token);
      
      if (form) {
        socket.emit('formStatusUpdate', {
          token,
          status: form.status,
          completedDate: form.completed_date
        });
      }
    } catch (error) {
      console.error('Error checking form status:', error);
      socket.emit('error', { message: 'Failed to check form status' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ==================== SCHEDULED TASKS ====================

// Schedule email polling (every minute by default)
const pollingInterval = process.env.POLLING_INTERVAL || '*/1 * * * *';

cron.schedule(pollingInterval, () => {
  console.log('⏰ Running scheduled email check...');
  pollingService.checkForResponses().catch(console.error);
});

// Schedule cleanup of expired forms (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running daily cleanup...');
  
  try {
    // Clean up forms older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await database.run(
      `DELETE FROM forms 
       WHERE created_date < ? 
       AND status != 'completed'`,
      [thirtyDaysAgo.toISOString()]
    );
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

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
  
  // Stop polling service
  pollingService.stop();
  
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
    console.log('✅ Database initialized');
    
    // Start polling service
    if (process.env.ENABLE_POLLING !== 'false') {
      pollingService.start();
      console.log('✅ Polling service started');
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
========================================
🚀 Recruitment Backend Server Started
========================================
📍 URL: http://localhost:${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔄 Polling: ${process.env.ENABLE_POLLING !== 'false' ? 'Enabled' : 'Disabled'}
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