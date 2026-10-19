-- Script para poblar WODs y horarios según el horario del box IronCladBox
-- Este script crea WODs para una semana de ejemplo con los horarios establecidos

-- Nota: Asegúrate de tener al menos un entrenador en la base de datos
-- Puedes obtener el id_entrenador con: SELECT id_entrenador FROM entrenador LIMIT 1;

-- Variable para el id_entrenador (ajustar según tu base de datos)
-- SELECT id_entrenador FROM entrenador LIMIT 1;

DO $$
DECLARE
    v_id_entrenador INTEGER;
    v_id_wod INTEGER;
    v_fecha_lunes DATE := '2026-02-03'; -- Ajustar a la fecha de inicio deseada
BEGIN
    -- Obtener un entrenador (tomar el primero disponible)
    SELECT id_entrenador INTO v_id_entrenador FROM entrenador LIMIT 1;
    
    IF v_id_entrenador IS NULL THEN
        RAISE EXCEPTION 'No hay entrenadores en la base de datos. Crea al menos un entrenador primero.';
    END IF;

    -- ===== LUNES =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes, 'Monday Motivation', 
            'For Time:
21-15-9
- Thrusters (95/65 lbs)
- Pull-ups
- Box Jumps (24/20")

Time Cap: 15 min', 
            'CrossFit', 'Intermedio', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    -- Horarios Lunes (5, 6, 7 AM y 5, 6, 7, 8 PM)
    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '05:00:00', 20, v_id_entrenador),
    (v_id_wod, '06:00:00', 20, v_id_entrenador),
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '17:00:00', 20, v_id_entrenador),
    (v_id_wod, '18:00:00', 20, v_id_entrenador),
    (v_id_wod, '19:00:00', 20, v_id_entrenador),
    (v_id_wod, '20:00:00', 20, v_id_entrenador);

    -- ===== MARTES =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '1 day', 'Tuesday Grind', 
            'EMOM 20:
Min 1: 15 Kettlebell Swings (53/35 lbs)
Min 2: 12 Burpees
Min 3: 15 Wall Balls (20/14 lbs)
Min 4: Rest', 
            'CrossFit', 'Todos', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '05:00:00', 20, v_id_entrenador),
    (v_id_wod, '06:00:00', 20, v_id_entrenador),
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '17:00:00', 20, v_id_entrenador),
    (v_id_wod, '18:00:00', 20, v_id_entrenador),
    (v_id_wod, '19:00:00', 20, v_id_entrenador),
    (v_id_wod, '20:00:00', 20, v_id_entrenador);

    -- ===== MIÉRCOLES =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '2 days', 'Hump Day Power', 
            '5 Rounds For Time:
- 400m Run
- 15 Power Cleans (135/95 lbs)
- 15 Box Jump Overs (24/20")

Time Cap: 25 min', 
            'CrossFit', 'Avanzado', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '05:00:00', 20, v_id_entrenador),
    (v_id_wod, '06:00:00', 20, v_id_entrenador),
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '17:00:00', 20, v_id_entrenador),
    (v_id_wod, '18:00:00', 20, v_id_entrenador),
    (v_id_wod, '19:00:00', 20, v_id_entrenador),
    (v_id_wod, '20:00:00', 20, v_id_entrenador);

    -- ===== JUEVES =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '3 days', 'Thursday Thruster', 
            'Death by Thrusters
Min 1: 1 Thruster (95/65 lbs)
Min 2: 2 Thrusters
Min 3: 3 Thrusters
...continue until failure', 
            'CrossFit', 'Intermedio', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '05:00:00', 20, v_id_entrenador),
    (v_id_wod, '06:00:00', 20, v_id_entrenador),
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '17:00:00', 20, v_id_entrenador),
    (v_id_wod, '18:00:00', 20, v_id_entrenador),
    (v_id_wod, '19:00:00', 20, v_id_entrenador),
    (v_id_wod, '20:00:00', 20, v_id_entrenador);

    -- ===== VIERNES =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '4 days', 'Friday Frenzy', 
            '3 Rounds For Time:
- 30 Double Unders
- 20 Toes to Bar
- 10 Devil Press (50/35 lbs)

Time Cap: 18 min', 
            'CrossFit', 'Intermedio', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '05:00:00', 20, v_id_entrenador),
    (v_id_wod, '06:00:00', 20, v_id_entrenador),
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '17:00:00', 20, v_id_entrenador),
    (v_id_wod, '18:00:00', 20, v_id_entrenador),
    (v_id_wod, '19:00:00', 20, v_id_entrenador),
    (v_id_wod, '20:00:00', 20, v_id_entrenador);

    -- ===== SÁBADO =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '5 days', 'Saturday Scorcher', 
            'AMRAP 20:
- 15 Calorie Row
- 12 Dumbbell Snatches (50/35 lbs)
- 9 Pull-ups
- 6 Burpee Box Jump Overs (24/20")', 
            'CrossFit', 'Todos', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    -- Horarios Sábado (7, 8 AM y 8, 9 AM según la imagen)
    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '07:00:00', 20, v_id_entrenador),
    (v_id_wod, '08:00:00', 20, v_id_entrenador),
    (v_id_wod, '09:00:00', 20, v_id_entrenador);

    -- ===== DOMINGO =====
    INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
    VALUES (v_fecha_lunes + INTERVAL '6 days', 'Open Box Sunday', 
            'Open Box - Trabajo libre guiado
Enfoque en técnica y movilidad
Disponible bajo reserva', 
            'Open Box', 'Todos', v_id_entrenador)
    RETURNING id_wod INTO v_id_wod;

    -- Horarios Domingo (7:30 AM y 8 AM, 9 PM bajo reserva)
    INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador) VALUES
    (v_id_wod, '07:30:00', 15, v_id_entrenador),
    (v_id_wod, '08:00:00', 15, v_id_entrenador),
    (v_id_wod, '21:00:00', 10, v_id_entrenador);

    RAISE NOTICE 'WODs y horarios creados exitosamente para la semana del % al %', 
                 v_fecha_lunes, v_fecha_lunes + INTERVAL '6 days';
END $$;

-- Verificar los datos insertados
SELECT 
    w.fecha,
    w.titulo,
    w.tipo,
    COUNT(h.id_horario) as total_horarios
FROM wod w
LEFT JOIN horario_clase h ON w.id_wod = h.id_wod
GROUP BY w.id_wod, w.fecha, w.titulo, w.tipo
ORDER BY w.fecha;
