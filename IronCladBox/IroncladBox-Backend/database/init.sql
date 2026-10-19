-- =========================
-- SCRIPT DE INICIALIZACIÓN
-- Base de Datos: CrossFit IroncladBox
-- =========================

-- =========================
-- TABLA: ROL
-- =========================
CREATE TABLE IF NOT EXISTS rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(30) UNIQUE NOT NULL
);

-- =========================
-- TABLA: USUARIO
-- =========================
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    id_rol INTEGER NOT NULL,
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
);

-- =========================
-- TABLA: MEMBRESIA
-- =========================
CREATE TABLE IF NOT EXISTS membresia (
    id_membresia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    duracion_dias INTEGER NOT NULL,
    beneficios TEXT,
    estado BOOLEAN DEFAULT TRUE
);

-- =========================
-- TABLA: ATLETA
-- =========================
CREATE TABLE IF NOT EXISTS atleta (
    id_atleta SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL,
    peso DECIMAL(5,2),
    altura DECIMAL(4,2),
    fecha_registro DATE DEFAULT CURRENT_DATE,
    id_membresia INTEGER,
    fecha_inicio_membresia DATE,
    fecha_fin_membresia DATE,
    CONSTRAINT fk_atleta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario),
    CONSTRAINT fk_atleta_membresia
        FOREIGN KEY (id_membresia)
        REFERENCES membresia(id_membresia)
);

-- =========================
-- TABLA: ENTRENADOR
-- =========================
CREATE TABLE IF NOT EXISTS entrenador (
    id_entrenador SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL,
    especialidad VARCHAR(100),
    anios_experiencia INTEGER,
    certificaciones TEXT,
    biografia TEXT,
    CONSTRAINT fk_entrenador_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
);

-- =========================
-- TABLA: CLASE
-- =========================
CREATE TABLE IF NOT EXISTS clase (
    id_clase SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion INTEGER DEFAULT 60,
    cupo_maximo INTEGER NOT NULL,
    capacidad_maxima INTEGER NOT NULL DEFAULT 20,
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    fecha_hora TIMESTAMP,
    id_entrenador INTEGER NOT NULL,
    CONSTRAINT fk_clase_entrenador
        FOREIGN KEY (id_entrenador)
        REFERENCES entrenador(id_entrenador)
);

-- =========================
-- TABLA: INSCRIPCION
-- =========================
CREATE TABLE IF NOT EXISTS inscripcion (
    id_inscripcion SERIAL PRIMARY KEY,
    id_atleta INTEGER NOT NULL,
    id_clase INTEGER NOT NULL,
    fecha_inscripcion DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    CONSTRAINT fk_inscripcion_atleta
        FOREIGN KEY (id_atleta)
        REFERENCES atleta(id_atleta),
    CONSTRAINT fk_inscripcion_clase
        FOREIGN KEY (id_clase)
        REFERENCES clase(id_clase),
    CONSTRAINT uq_atleta_clase UNIQUE (id_atleta, id_clase)
);

-- =========================
-- INSERTS INICIALES
-- =========================

-- ROLES
INSERT INTO rol (nombre) VALUES
('ATLETA'),
('ENTRENADOR'),
('ADMINISTRADOR')
ON CONFLICT (nombre) DO NOTHING;

-- USUARIO ADMINISTRADOR
-- Contraseña: admin123
INSERT INTO usuario (nombre, apellido, email, password, id_rol)
VALUES (
    'Admin',
    'Sistema',
    'admin@crossfit.com',
    '$2a$10$9AEQ/rfGMY4nWJWyHcJFG.QfopEIIJ21goW7/YoxYGGACWsPZwune', -- admin123 hasheado
    (SELECT id_rol FROM rol WHERE nombre = 'ADMINISTRADOR')
)
ON CONFLICT (email) DO NOTHING;

-- ENTRENADOR DE PRUEBA
INSERT INTO usuario (nombre, apellido, email, password, id_rol)
VALUES (
    'Carlos',
    'Mendoza',
    'carlos@crossfit.com',
    '$2a$10$QxEmZny2i935NI.c8WtLve7Xuz8kVS9gt37Zv5PCt97Pd3ibJ0FLa', -- entrenador123
    (SELECT id_rol FROM rol WHERE nombre = 'ENTRENADOR')
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO entrenador (id_usuario, especialidad, anios_experiencia, certificaciones, biografia)
SELECT 
    id_usuario, 
    'CrossFit & Olympic Lifting', 
    8,
    'CrossFit Level 3 Trainer, Entrenador Personal Certificado',
    'Especialista en entrenamiento funcional y levantamiento olímpico'
FROM usuario WHERE email = 'carlos@crossfit.com'
ON CONFLICT (id_usuario) DO NOTHING;

-- MEMBRESÍAS
INSERT INTO membresia (nombre, descripcion, precio, duracion_dias, beneficios) VALUES
('Básica', 'Membresía básica con acceso limitado', 25.00, 30, 'Acceso ilimitado a clases grupales, 12 clases al mes, Acceso a área de entrenamiento, Evaluación inicial'),
('Premium', 'Membresía premium con todos los beneficios', 40.00, 30, 'Acceso ilimitado a todas las clases, Clases ilimitadas, Programa de nutrición básico, Evaluación mensual de progreso, Acceso a seminarios y talleres, 1 sesión personal al mes'),
('Elite', 'Membresía elite VIP', 65.00, 30, 'Acceso VIP a todas las instalaciones, Clases ilimitadas + Open Gym, Programa de nutrición personalizado, Evaluación semanal, 4 sesiones personales al mes, Acceso prioritario a eventos, Descuento en suplementos'),
('Día de Prueba', 'Pase de un día para probar', 5.00, 1, 'Acceso por 1 día, 1 clase grupal, Tour por las instalaciones, Asesoría inicial');

-- ATLETA DE PRUEBA
INSERT INTO usuario (nombre, apellido, email, password, id_rol)
VALUES (
    'Juan',
    'Pérez',
    'juan@crossfit.com',
    '$2a$10$d2/aT5Oc57SaOUX1eG1nUuSAtoKDi4qPfh3Ck/9r04Q343RuxPPSO', -- atleta123
    (SELECT id_rol FROM rol WHERE nombre = 'ATLETA')
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO atleta (id_usuario, peso, altura)
SELECT id_usuario, 75.5, 1.75
FROM usuario WHERE email = 'juan@crossfit.com'
ON CONFLICT (id_usuario) DO NOTHING;

-- CLASES DE EJEMPLO
INSERT INTO clase (nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador)
SELECT 
    'CrossFit WOD Morning',
    'Workout of the Day intensivo',
    CURRENT_DATE + INTERVAL '1 day',
    '07:00:00',
    20,
    e.id_entrenador
FROM entrenador e
INNER JOIN usuario u ON e.id_usuario = u.id_usuario
WHERE u.email = 'carlos@crossfit.com'
LIMIT 1;

INSERT INTO clase (nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador)
SELECT 
    'Olympic Lifting',
    'Técnica de levantamiento olímpico',
    CURRENT_DATE + INTERVAL '2 days',
    '18:00:00',
    15,
    e.id_entrenador
FROM entrenador e
INNER JOIN usuario u ON e.id_usuario = u.id_usuario
WHERE u.email = 'carlos@crossfit.com'
LIMIT 1;

INSERT INTO clase (nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador)
SELECT 
    'CrossFit Fundamentals',
    'Clase introductoria para principiantes',
    CURRENT_DATE + INTERVAL '3 days',
    '09:00:00',
    12,
    e.id_entrenador
FROM entrenador e
INNER JOIN usuario u ON e.id_usuario = u.id_usuario
WHERE u.email = 'carlos@crossfit.com'
LIMIT 1;

-- Mensaje de confirmación
SELECT 'Base de datos inicializada correctamente' AS mensaje;
SELECT 'Usuarios de prueba:' AS info;
SELECT 'Admin: admin@crossfit.com / admin123' AS admin;
SELECT 'Entrenador: carlos@crossfit.com / entrenador123' AS entrenador;
SELECT 'Atleta: juan@crossfit.com / atleta123' AS atleta;
