-- Migración: Crear tabla WOD (Workout of the Day) y horarios
-- Fecha: 2026-02-03

-- Tabla para los WODs diarios
CREATE TABLE IF NOT EXISTS wod (
    id_wod SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50), -- CrossFit, Weightlifting, Gymnastics, etc.
    nivel VARCHAR(20), -- Principiante, Intermedio, Avanzado, Todos
    id_entrenador INTEGER REFERENCES entrenador(id_entrenador),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para los horarios disponibles del día
CREATE TABLE IF NOT EXISTS horario_clase (
    id_horario SERIAL PRIMARY KEY,
    id_wod INTEGER REFERENCES wod(id_wod) ON DELETE CASCADE,
    hora TIME NOT NULL,
    cupo_maximo INTEGER NOT NULL DEFAULT 20,
    id_entrenador INTEGER REFERENCES entrenador(id_entrenador),
    estado VARCHAR(20) DEFAULT 'ACTIVO', -- ACTIVO, CANCELADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_wod, hora)
);

-- Actualizar tabla de inscripciones para referenciar horarios
ALTER TABLE inscripcion 
ADD COLUMN IF NOT EXISTS id_horario INTEGER REFERENCES horario_clase(id_horario);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_wod_fecha ON wod(fecha);
CREATE INDEX IF NOT EXISTS idx_horario_wod ON horario_clase(id_wod);
CREATE INDEX IF NOT EXISTS idx_inscripcion_horario ON inscripcion(id_horario);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_wod_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_wod_timestamp_trigger ON wod;
CREATE TRIGGER update_wod_timestamp_trigger
BEFORE UPDATE ON wod
FOR EACH ROW
EXECUTE FUNCTION update_wod_timestamp();

-- Datos de ejemplo (opcional)
-- WOD de ejemplo para febrero 2026
INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel)
VALUES 
    ('2026-02-03', 'Benchmark Fran', 'For Time: 21-15-9 Thrusters (95/65 lbs) y Pull-ups', 'CrossFit', 'Intermedio'),
    ('2026-02-04', 'Strength Day', 'Back Squat 5x5 @ 80% 1RM + Core Work', 'Weightlifting', 'Todos'),
    ('2026-02-05', 'AMRAP 20', '20 min AMRAP: 5 Pull-ups, 10 Push-ups, 15 Air Squats', 'CrossFit', 'Principiante')
ON CONFLICT (fecha) DO NOTHING;

COMMENT ON TABLE wod IS 'Workout of the Day - Rutina diaria del box';
COMMENT ON TABLE horario_clase IS 'Horarios disponibles para cada WOD del día';
COMMENT ON COLUMN horario_clase.cupo_maximo IS 'Cupo máximo de atletas por horario';
COMMENT ON COLUMN inscripcion.id_horario IS 'Referencia al horario específico de inscripción';
