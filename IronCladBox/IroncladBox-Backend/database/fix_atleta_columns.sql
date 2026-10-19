-- Agregar columnas de fechas de membresía a la tabla atleta
-- Ejecuta este script en tu base de datos PostgreSQL

ALTER TABLE atleta 
ADD COLUMN IF NOT EXISTS fecha_inicio_membresia DATE,
ADD COLUMN IF NOT EXISTS fecha_fin_membresia DATE;

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'atleta' 
AND column_name IN ('fecha_inicio_membresia', 'fecha_fin_membresia');
