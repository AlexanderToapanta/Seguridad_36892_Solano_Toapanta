-- Migración: Ajustes para el sistema de inscripciones por horario
-- Fecha: 2026-02-03
-- Descripción: Permite inscripciones sin id_clase y previene inscripciones duplicadas por horario

-- 1. Hacer que id_clase sea opcional (nullable) para permitir inscripciones por horario
ALTER TABLE inscripcion ALTER COLUMN id_clase DROP NOT NULL;

-- 2. Eliminar constraint único de atleta-clase (ya no aplica para el sistema de horarios)
ALTER TABLE inscripcion DROP CONSTRAINT IF EXISTS uq_atleta_clase;

-- 3. Agregar constraint único para atleta-horario (prevenir inscripciones duplicadas)
ALTER TABLE inscripcion ADD CONSTRAINT uq_atleta_horario UNIQUE (id_atleta, id_horario);

-- 4. Verificar la estructura final
-- \d inscripcion

-- Comentarios sobre la nueva estructura:
COMMENT ON COLUMN inscripcion.id_clase IS 'ID de clase (opcional, para compatibilidad con sistema antiguo)';
COMMENT ON COLUMN inscripcion.id_horario IS 'ID de horario del WOD (usado en el nuevo sistema de calendario)';
COMMENT ON CONSTRAINT uq_atleta_horario ON inscripcion IS 'Previene que un atleta se inscriba dos veces al mismo horario';

-- Notas:
-- - El sistema ahora soporta dos tipos de inscripciones:
--   1. Inscripciones antiguas: usando id_clase (para compatibilidad)
--   2. Inscripciones nuevas: usando id_horario (sistema de calendario WOD)
-- - Un atleta solo puede inscribirse una vez por horario
-- - El constraint uq_atleta_horario previene inscripciones duplicadas
