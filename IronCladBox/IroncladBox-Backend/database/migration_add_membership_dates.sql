-- =========================
-- MIGRATION: Agregar fechas de membresía a tabla atleta
-- Fecha: 2026-01-27
-- =========================

-- Agregar columnas si no existen
DO $$ 
BEGIN
    -- Verificar y agregar fecha_inicio_membresia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='atleta' AND column_name='fecha_inicio_membresia'
    ) THEN
        ALTER TABLE atleta ADD COLUMN fecha_inicio_membresia DATE;
    END IF;

    -- Verificar y agregar fecha_fin_membresia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='atleta' AND column_name='fecha_fin_membresia'
    ) THEN
        ALTER TABLE atleta ADD COLUMN fecha_fin_membresia DATE;
    END IF;
END $$;

-- Mostrar mensaje de confirmación
SELECT 'Migración completada: Columnas fecha_inicio_membresia y fecha_fin_membresia agregadas a tabla atleta' AS resultado;
