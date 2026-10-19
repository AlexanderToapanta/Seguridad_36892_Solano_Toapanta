-- =========================
-- MIGRACIÓN: Agregar campo teléfono a tabla usuario
-- Fecha: 2026-02-03
-- =========================

-- Agregar columna telefono a la tabla usuario
ALTER TABLE usuario 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- Comentario explicativo
COMMENT ON COLUMN usuario.telefono IS 'Número de teléfono celular del usuario';
