-- Seed: Ejercicios de CrossFit por defecto
-- Fecha: 2026-02-03

-- Insertar ejercicios comunes de CrossFit
INSERT INTO ejercicio (nombre, descripcion, imagen_url, activo) VALUES
-- Levantamientos Olímpicos y Variantes
('Clean & Jerk', 'Levantamiento olímpico que combina dos movimientos: Clean (cargada) desde el suelo hasta los hombros, y Jerk (envión) desde los hombros hasta la posición overhead.', NULL, TRUE),
('Snatch', 'Levantamiento olímpico que consiste en levantar la barra desde el suelo hasta la posición overhead en un solo movimiento continuo.', NULL, TRUE),
('Clean', 'Primera parte del Clean & Jerk. Levantar la barra desde el suelo hasta los hombros en posición de rack.', NULL, TRUE),
('Power Clean', 'Variante del Clean donde la barra se recibe con las piernas ligeramente flexionadas, sin bajar a sentadilla completa.', NULL, TRUE),
('Hang Power Clean', 'Power Clean iniciado desde posición de hang (colgado), con la barra sobre las rodillas. Excelente para desarrollar potencia.', NULL, TRUE),
('Power Snatch', 'Variante del Snatch donde la barra se recibe con las piernas ligeramente flexionadas, sin bajar a sentadilla completa.', NULL, TRUE),
('Hang Power Snatch', 'Power Snatch iniciado desde posición de hang (colgado). Movimiento explosivo que desarrolla potencia en caderas.', NULL, TRUE),
('Hang Squat Snatch', 'Snatch completo iniciado desde posición de hang, recibiendo la barra en sentadilla profunda.', NULL, TRUE),

-- Ejercicios de Gimnasia
('Pull-ups', 'Dominadas estrictas. Ejercicio de gimnasia que consiste en levantar el cuerpo hasta que la barbilla sobrepase la barra.', NULL, TRUE),
('Chest-to-Bar Pull-ups', 'Dominadas donde el pecho debe tocar la barra. Versión más exigente que las pull-ups regulares.', NULL, TRUE),
('Muscle-ups', 'Movimiento de gimnasia que combina una pull-up explosiva con una transición a dip, terminando con los brazos completamente extendidos sobre los anillos o barra.', NULL, TRUE),
('Handstand Push-ups', 'Flexiones en posición de parada de manos. Se realiza contra una pared y la cabeza debe tocar el suelo.', NULL, TRUE),
('Toes-to-Bar', 'Ejercicio de core donde se cuelga de la barra y se elevan los pies hasta tocar la barra.', NULL, TRUE),
('Knees-to-Elbows', 'Ejercicio de core donde se cuelga de la barra y se elevan las rodillas hasta tocar los codos.', NULL, TRUE),
('Burpees', 'Ejercicio de cuerpo completo que combina una flexión, un salto y palmada sobre la cabeza en un movimiento continuo.', NULL, TRUE),
('Box Jumps', 'Saltos sobre un cajón o plataforma. El atleta debe terminar con las caderas completamente extendidas en la parte superior.', NULL, TRUE),
('Double-unders', 'Saltos de cuerda donde la cuerda pasa dos veces bajo los pies en un solo salto.', NULL, TRUE),

-- Ejercicios de Fuerza
('Back Squat', 'Sentadilla con barra en la espalda. Ejercicio fundamental de fuerza para piernas y core. Uno de los principales benchmarks de fuerza.', NULL, TRUE),
('Front Squat', 'Sentadilla con barra en la parte frontal de los hombros. Mayor énfasis en cuádriceps y core.', NULL, TRUE),
('Overhead Squat', 'Sentadilla con la barra sostenida sobre la cabeza con brazos completamente extendidos. Requiere gran movilidad y estabilidad. Benchmark esencial.', NULL, TRUE),
('Deadlift', 'Levantamiento de peso muerto. Levantar la barra desde el suelo hasta la posición de pie con caderas y rodillas extendidas. Rey de los ejercicios de fuerza.', NULL, TRUE),
('Sumo Deadlift High Pull', 'Variante del deadlift con stance amplio y un pull (jalón) alto hasta el nivel de la barbilla.', NULL, TRUE),
('Bench Press', 'Press de banca. Ejercicio de empuje horizontal para pecho, hombros y tríceps.', NULL, TRUE),
('Shoulder Press', 'Press militar estricto. Levantar la barra desde los hombros hasta overhead sin ayuda de piernas. Benchmark de fuerza de hombros.', NULL, TRUE),
('Push Press', 'Press de hombros con impulso de piernas. Un pequeño dip and drive para ayudar a elevar la barra.', NULL, TRUE),
('Push Jerk', 'Movimiento explosivo donde se empuja la barra overhead mientras las piernas se flexionan para recibir el peso.', NULL, TRUE),
('Split Jerk', 'Variante del jerk donde se recibe la barra en posición de tijera. El movimiento más utilizado en competición.', NULL, TRUE),
('Thruster', 'Combinación de front squat y push press en un movimiento continuo. Ejercicio de cuerpo completo muy exigente.', NULL, TRUE),

-- Ejercicios Metabólicos
('Rowing', 'Remo en máquina de ergómetro. Ejercicio cardiovascular de cuerpo completo.', NULL, TRUE),
('Assault Bike', 'Bicicleta de aire que trabaja brazos y piernas simultáneamente. Conocida por su alta intensidad.', NULL, TRUE),
('Running', 'Carrera. Ejercicio cardiovascular fundamental usado en muchos WODs.', NULL, TRUE),
('Wall Balls', 'Lanzamiento de balón medicinal contra una pared desde posición de sentadilla. La bola debe alcanzar un target a 10 pies (hombres) o 9 pies (mujeres).', NULL, TRUE),

-- Ejercicios Adicionales
('Kettlebell Swings', 'Balanceo de pesa rusa desde entre las piernas hasta la posición overhead o a nivel de los ojos (Russian swing).', NULL, TRUE),
('Turkish Get-ups', 'Movimiento complejo que implica levantarse desde posición acostada hasta de pie sosteniendo una kettlebell overhead.', NULL, TRUE),
('Farmers Carry', 'Caminata sosteniendo pesos pesados en cada mano. Excelente para grip y core.', NULL, TRUE),
('Rope Climbs', 'Escalada de cuerda. El atleta debe subir hasta tocar una viga o marca específica.', NULL, TRUE),
('Ring Dips', 'Fondos en anillos. Ejercicio de gimnasia para tríceps, pecho y hombros.', NULL, TRUE),
('L-Sit', 'Posición isométrica sentado con piernas extendidas paralelas al suelo, sostenido en barras paralelas o anillos.', NULL, TRUE),
('Pistols', 'Sentadillas a una pierna. Ejercicio unilateral que requiere fuerza, balance y movilidad.', NULL, TRUE),
('GHD Sit-ups', 'Abdominales en máquina GHD (Glute-Ham Developer) con rango completo de movimiento.', NULL, TRUE),
('Bear Crawl', 'Gateo en cuadrupedia. Movimiento funcional que trabaja core y coordinación.', NULL, TRUE),
('Sled Push/Pull', 'Empuje o arrastre de trineo con peso. Excelente para fuerza de piernas y acondicionamiento.', NULL, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Verificar inserción
SELECT COUNT(*) as total_ejercicios FROM ejercicio;
