-- Crear tabla para el progreso de los atletas en ejercicios
CREATE TABLE IF NOT EXISTS progreso_atleta (
    id_progreso SERIAL PRIMARY KEY,
    id_atleta INTEGER NOT NULL REFERENCES atleta(id_atleta) ON DELETE CASCADE,
    id_ejercicio INTEGER NOT NULL REFERENCES ejercicio(id_ejercicio) ON DELETE CASCADE,
    marca_maxima DECIMAL(10, 2) NOT NULL, -- Marca en libras (lb)
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_atleta, id_ejercicio) -- Un atleta solo puede tener una marca por ejercicio
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_progreso_atleta ON progreso_atleta(id_atleta);
CREATE INDEX IF NOT EXISTS idx_progreso_ejercicio ON progreso_atleta(id_ejercicio);

-- Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_progreso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_fecha_progreso
    BEFORE UPDATE ON progreso_atleta
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_progreso();

-- Comentarios
COMMENT ON TABLE progreso_atleta IS 'Tabla que almacena el progreso de marcas máximas de los atletas por ejercicio';
COMMENT ON COLUMN progreso_atleta.marca_maxima IS 'Marca máxima del atleta en libras (lb)';
