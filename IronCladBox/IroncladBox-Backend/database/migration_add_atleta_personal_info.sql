-- Migración: Agregar columnas de información personal a tabla atleta
-- Fecha: 2026-02-03

-- Agregar columnas para información personal del atleta
ALTER TABLE atleta 
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS direccion VARCHAR(255),
ADD COLUMN IF NOT EXISTS contacto_emergencia VARCHAR(255);

-- Comentarios descriptivos
COMMENT ON COLUMN atleta.fecha_nacimiento IS 'Fecha de nacimiento del atleta';
COMMENT ON COLUMN atleta.direccion IS 'Dirección de residencia del atleta';
COMMENT ON COLUMN atleta.contacto_emergencia IS 'Nombre y teléfono de contacto de emergencia';

-- Verificar las columnas agregadas
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'atleta' 
AND column_name IN ('fecha_nacimiento', 'direccion', 'contacto_emergencia')
ORDER BY ordinal_position;
