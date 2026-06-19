require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes    = require('./routes/auth.routes');
const clasesRoutes  = require('./routes/clases.routes');
const reservasRoutes= require('./routes/reservas.routes');
const adminRoutes   = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware global ──────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/clases',  clasesRoutes);
app.use('/api/reservas',reservasRoutes);
app.use('/api/admin',   adminRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Manejador de errores global ────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🌿 RespiraApp API corriendo en http://localhost:${PORT}`);
});
