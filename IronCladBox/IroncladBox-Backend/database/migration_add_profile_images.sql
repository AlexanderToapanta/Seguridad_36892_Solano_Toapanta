-- ================================================
-- MIGRACIÓN: Agregar campos de foto de perfil
-- ================================================

-- Agregar columna foto_perfil a la tabla usuario
ALTER TABLE usuario 
ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(255) DEFAULT NULL;

-- Comentario
COMMENT ON COLUMN usuario.foto_perfil IS 'Ruta de la imagen de perfil del usuario';

-- Verificar la columna
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'usuario' AND column_name = 'foto_perfil';
