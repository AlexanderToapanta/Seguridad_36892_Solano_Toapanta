-- Migración: Agregar campo de asistencia y racha
-- Fecha: 2026-02-05

-- Agregar campo de asistencia a la tabla inscripcion
ALTER TABLE inscripcion ADD COLUMN IF NOT EXISTS asistio BOOLEAN DEFAULT FALSE;
ALTER TABLE inscripcion ADD COLUMN IF NOT EXISTS fecha_asistencia TIMESTAMP;

-- Crear tabla para racha de atletas
CREATE TABLE IF NOT EXISTS racha_atleta (
    id_racha SERIAL PRIMARY KEY,
    id_atleta INTEGER NOT NULL REFERENCES atleta(id_atleta) ON DELETE CASCADE,
    racha_actual INTEGER DEFAULT 0,
    racha_maxima INTEGER DEFAULT 0,
    ultima_asistencia DATE,
    fecha_inicio_racha DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_atleta)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_racha_atleta_id_atleta ON racha_atleta(id_atleta);
CREATE INDEX IF NOT EXISTS idx_inscripcion_asistencia ON inscripcion(asistio) WHERE asistio = TRUE;

-- Función para actualizar racha automáticamente
CREATE OR REPLACE FUNCTION actualizar_racha_atleta(p_id_atleta INTEGER, p_fecha_asistencia DATE)
RETURNS TABLE(racha_actual INTEGER, racha_maxima INTEGER) AS $$
DECLARE
    v_ultima_asistencia DATE;
    v_racha_actual INTEGER;
    v_racha_maxima INTEGER;
    v_dias_diferencia INTEGER;
BEGIN
    -- Obtener datos actuales de racha
    SELECT r.ultima_asistencia, r.racha_actual, r.racha_maxima
    INTO v_ultima_asistencia, v_racha_actual, v_racha_maxima
    FROM racha_atleta r
    WHERE r.id_atleta = p_id_atleta;
    
    -- Si no existe registro, crear uno nuevo
    IF NOT FOUND THEN
        INSERT INTO racha_atleta (id_atleta, racha_actual, racha_maxima, ultima_asistencia, fecha_inicio_racha)
        VALUES (p_id_atleta, 1, 1, p_fecha_asistencia, p_fecha_asistencia);
        
        RETURN QUERY SELECT 1, 1;
        RETURN;
    END IF;
    
    -- Calcular diferencia de días
    v_dias_diferencia := p_fecha_asistencia - v_ultima_asistencia;
    
    -- Si es el mismo día, no hacer nada
    IF v_dias_diferencia = 0 THEN
        RETURN QUERY SELECT v_racha_actual, v_racha_maxima;
        RETURN;
    END IF;
    
    -- Si es día consecutivo (1 día de diferencia)
    IF v_dias_diferencia = 1 THEN
        v_racha_actual := v_racha_actual + 1;
        
        -- Actualizar racha máxima si es necesario
        IF v_racha_actual > v_racha_maxima THEN
            v_racha_maxima := v_racha_actual;
        END IF;
        
        UPDATE racha_atleta
        SET racha_actual = v_racha_actual,
            racha_maxima = v_racha_maxima,
            ultima_asistencia = p_fecha_asistencia,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_atleta = p_id_atleta;
    ELSE
        -- Se rompió la racha, reiniciar
        UPDATE racha_atleta
        SET racha_actual = 1,
            ultima_asistencia = p_fecha_asistencia,
            fecha_inicio_racha = p_fecha_asistencia,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_atleta = p_id_atleta;
        
        v_racha_actual := 1;
    END IF;
    
    RETURN QUERY SELECT v_racha_actual, v_racha_maxima;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE racha_atleta IS 'Tabla para almacenar las rachas de asistencia de los atletas';
COMMENT ON COLUMN racha_atleta.racha_actual IS 'Días consecutivos de asistencia actual';
COMMENT ON COLUMN racha_atleta.racha_maxima IS 'Récord de días consecutivos';
COMMENT ON COLUMN racha_atleta.ultima_asistencia IS 'Fecha de la última asistencia registrada';
COMMENT ON COLUMN racha_atleta.fecha_inicio_racha IS 'Fecha en que comenzó la racha actual';
