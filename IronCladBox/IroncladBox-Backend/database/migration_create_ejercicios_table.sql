-- Migración: Crear tabla de ejercicios
-- Fecha: 2026-02-03

-- Crear tabla de ejercicios
CREATE TABLE IF NOT EXISTS ejercicio (
    id_ejercicio SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    imagen_url VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ejercicio_nombre ON ejercicio(nombre);
CREATE INDEX IF NOT EXISTS idx_ejercicio_activo ON ejercicio(activo);

-- Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_ejercicio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ejercicio_update_timestamp
    BEFORE UPDATE ON ejercicio
    FOR EACH ROW
    EXECUTE FUNCTION update_ejercicio_timestamp();

-- Comentarios descriptivos
COMMENT ON TABLE ejercicio IS 'Tabla que almacena los ejercicios de CrossFit disponibles en el gimnasio';
COMMENT ON COLUMN ejercicio.id_ejercicio IS 'Identificador único del ejercicio';
COMMENT ON COLUMN ejercicio.nombre IS 'Nombre del ejercicio';
COMMENT ON COLUMN ejercicio.descripcion IS 'Descripción detallada del ejercicio';
COMMENT ON COLUMN ejercicio.imagen_url IS 'URL o ruta de la imagen del ejercicio (opcional)';
COMMENT ON COLUMN ejercicio.activo IS 'Indica si el ejercicio está activo o deshabilitado';
