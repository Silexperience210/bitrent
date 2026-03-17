/**
 * BitRent Backend Server
 * Local development server
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BitRent Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Auth endpoints
app.post('/api/auth/challenge', (req, res) => {
  const challenge = {
    id: `challenge_${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: 'Sign this message to authenticate with BitRent',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };

  res.json({
    status: 'ok',
    challenge
  });
});

// Mineurs endpoints
app.get('/api/mineurs', async (req, res) => {
  res.json({
    status: 'ok',
    count: 0,
    data: []
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BitRent Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
