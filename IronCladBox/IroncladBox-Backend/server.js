require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

// Importar conexión a base de datos
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'ironcladbox_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(express.static('public'));

// Routes
const authRoutes = require('./app/routes/authRoutes');
const membersRoutes = require('./app/routes/membersRoutes');
const contactRoutes = require('./app/routes/contactRoutes');
const trainersRoutes = require('./app/routes/trainersRoutes');
const adminRoutes = require('./app/routes/adminRoutes');
const wodRoutes = require('./app/routes/wodRoutes');
const ejerciciosRoutes = require('./app/routes/ejerciciosRoutes');
const progresoRoutes = require('./app/routes/progresoRoutes');
const classesRoutes = require('./app/routes/classesRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wod', wodRoutes);
app.use('/api/ejercicios', ejerciciosRoutes);
app.use('/api/progreso', progresoRoutes);
app.use('/api/classes', classesRoutes);

// Servir páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🏋️ Servidor IroncladBox CrossFit ejecutándose en http://localhost:${PORT}`);
  
  // Probar conexión a base de datos
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Base de datos PostgreSQL conectada');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error.message);
  }

  // Tarea programada: Desactivar atletas con membresías vencidas
  const AtletaModel = require('./app/models/AtletaModel');
  
  const deactivateExpiredMembershipsTask = async () => {
    try {
      console.log('🔒 Verificando membresías vencidas...');
      const deactivated = await AtletaModel.deactivateExpiredMemberships();
      if (deactivated.length > 0) {
        console.log(`⚠️ Se desactivaron ${deactivated.length} atleta(s) con membresía vencida`);
      } else {
        console.log('✅ No hay membresías vencidas');
      }
    } catch (error) {
      console.error('❌ Error al desactivar membresías vencidas:', error);
    }
  };

  // Ejecutar limpieza cada 24 horas (86400000 ms)
  setInterval(deactivateExpiredMembershipsTask, 24 * 60 * 60 * 1000);
  
  // Ejecutar limpieza inicial al iniciar el servidor
  setTimeout(deactivateExpiredMembershipsTask, 10000); // Esperar 10 segundos después del inicio
});

module.exports = app;
