-- ============================================
-- MIGRACIÓN: Validaciones y Constraints Faltantes
-- Fecha: 2026-06-06
-- ============================================

-- =========================
-- TABLA: membresia
-- =========================
ALTER TABLE membresia ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE membresia ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_membresia_precio') THEN
    ALTER TABLE membresia ADD CONSTRAINT chk_membresia_precio CHECK (precio > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_membresia_duracion') THEN
    ALTER TABLE membresia ADD CONSTRAINT chk_membresia_duracion CHECK (duracion_dias > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_membresia_nombre') THEN
    ALTER TABLE membresia ADD CONSTRAINT uq_membresia_nombre UNIQUE (nombre);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_membresia_timestamp()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'membresia_update_timestamp') THEN
    CREATE TRIGGER membresia_update_timestamp BEFORE UPDATE ON membresia
    FOR EACH ROW EXECUTE FUNCTION update_membresia_timestamp();
  END IF;
END $$;

-- =========================
-- TABLA: usuario
-- =========================
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION update_usuario_timestamp()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'usuario_update_timestamp') THEN
    CREATE TRIGGER usuario_update_timestamp BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION update_usuario_timestamp();
  END IF;
END $$;

-- =========================
-- TABLA: entrenador
-- =========================
ALTER TABLE entrenador ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE entrenador ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION update_entrenador_timestamp()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'entrenador_update_timestamp') THEN
    CREATE TRIGGER entrenador_update_timestamp BEFORE UPDATE ON entrenador
    FOR EACH ROW EXECUTE FUNCTION update_entrenador_timestamp();
  END IF;
END $$;

-- =========================
-- TABLA: atleta
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_atleta_peso') THEN
    ALTER TABLE atleta ADD CONSTRAINT chk_atleta_peso CHECK (peso IS NULL OR (peso > 0 AND peso < 500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_atleta_altura') THEN
    ALTER TABLE atleta ADD CONSTRAINT chk_atleta_altura CHECK (altura IS NULL OR (altura > 0 AND altura < 3));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_atleta_fechas_membresia') THEN
    ALTER TABLE atleta ADD CONSTRAINT chk_atleta_fechas_membresia CHECK (
      fecha_fin_membresia IS NULL OR fecha_inicio_membresia IS NULL OR fecha_fin_membresia >= fecha_inicio_membresia
    );
  END IF;
END $$;

ALTER TABLE atleta DROP CONSTRAINT IF EXISTS fk_atleta_membresia;
ALTER TABLE atleta ADD CONSTRAINT fk_atleta_membresia FOREIGN KEY (id_membresia) REFERENCES membresia(id_membresia) ON DELETE SET NULL;

-- =========================
-- TABLA: clase
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_clase_cupo_check') THEN
    ALTER TABLE clase ADD CONSTRAINT chk_clase_cupo_check CHECK (cupo_maximo > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_clase_duracion_check') THEN
    ALTER TABLE clase ADD CONSTRAINT chk_clase_duracion_check CHECK (duracion > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_clase_estado') THEN
    ALTER TABLE clase ADD CONSTRAINT chk_clase_estado CHECK (estado IN ('ACTIVA', 'CANCELADA', 'COMPLETADA'));
  END IF;
END $$;

ALTER TABLE clase DROP CONSTRAINT IF EXISTS fk_clase_entrenador;
ALTER TABLE clase ADD CONSTRAINT fk_clase_entrenador FOREIGN KEY (id_entrenador) REFERENCES entrenador(id_entrenador) ON DELETE SET NULL;

-- =========================
-- TABLA: inscripcion
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inscripcion_estado') THEN
    ALTER TABLE inscripcion ADD CONSTRAINT chk_inscripcion_estado CHECK (estado IN ('ACTIVA', 'CANCELADA'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inscripcion_referencia') THEN
    ALTER TABLE inscripcion ADD CONSTRAINT chk_inscripcion_referencia CHECK (id_clase IS NOT NULL OR id_horario IS NOT NULL);
  END IF;
END $$;

ALTER TABLE inscripcion DROP CONSTRAINT IF EXISTS fk_inscripcion_clase;
ALTER TABLE inscripcion ADD CONSTRAINT fk_inscripcion_clase FOREIGN KEY (id_clase) REFERENCES clase(id_clase) ON DELETE SET NULL;

-- =========================
-- TABLA: wod
-- =========================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wod_nivel') THEN
    ALTER TABLE wod ADD CONSTRAINT chk_wod_nivel CHECK (nivel IS NULL OR nivel IN ('Principiante', 'Intermedio', 'Avanzado', 'Todos'));
  END IF;
END $$;

-- =========================
-- TABLA: horario_clase
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_horario_cupo') THEN
    ALTER TABLE horario_clase ADD CONSTRAINT chk_horario_cupo CHECK (cupo_maximo > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_horario_estado') THEN
    ALTER TABLE horario_clase ADD CONSTRAINT chk_horario_estado CHECK (estado IN ('ACTIVO', 'CANCELADO'));
  END IF;
END $$;

-- =========================
-- TABLA: progreso_atleta
-- =========================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_progreso_marca') THEN
    ALTER TABLE progreso_atleta ADD CONSTRAINT chk_progreso_marca CHECK (marca_maxima > 0);
  END IF;
END $$;

-- =========================
-- TABLA: contacto (NUEVA)
-- =========================
CREATE TABLE IF NOT EXISTS contacto (
  id_contacto SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefono VARCHAR(20),
  mensaje TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDIENTE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_contacto_estado CHECK (estado IN ('PENDIENTE', 'LEIDO', 'RESPONDIDO')),
  CONSTRAINT chk_contacto_mensaje_length CHECK (LENGTH(mensaje) >= 10 AND LENGTH(mensaje) <= 1000)
);

COMMENT ON TABLE contacto IS 'Mensajes del formulario de contacto de la landing page';
COMMENT ON COLUMN contacto.estado IS 'Estado del mensaje: PENDIENTE, LEIDO, RESPONDIDO';

-- =========================
-- USUARIO: FK ON DELETE (rol)
-- =========================
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS fk_usuario_rol;
ALTER TABLE usuario ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON DELETE RESTRICT;
