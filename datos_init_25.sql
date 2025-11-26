-- === PACIENTES ===

-- Pacientes que SON Médicos
INSERT INTO paciente (dni, nombre, apellido, fecha_nac, sexo) VALUES
(44444444, 'Carlos', 'López', '1980-05-10', 'MASCULINO'),
(66666666, 'Jorge', 'Alonso', '1975-02-15', 'MASCULINO'),
(88888888, 'David', 'Fernández', '1982-07-07', 'MASCULINO');

-- Sólo Pacientes
INSERT INTO paciente (dni, nombre, apellido, fecha_nac, sexo) VALUES
(11111111, 'Juan', 'Pérez', '1985-04-10', 'MASCULINO'),
(22222222, 'María', 'Gómez', '1990-09-21', 'FEMENINO'),
(33333333, 'Alex', 'Suárez', '2001-01-15', 'MASCULINO'),
(99999999, 'Miguel', 'Castro', '1960-03-12', 'MASCULINO'),
(10101010, 'Elena', 'Ruiz', '1995-12-01', 'FEMENINO'),
(12121212, 'Sofía', 'Morales', '2023-01-20', 'FEMENINO'),
(13131313, 'Martín', 'Sosa', '2022-11-10', 'MASCULINO');

-- === GUARDIAS ===

INSERT INTO guardia (tipo_guardia) VALUES
('MATUTINO'),
('VESPERTINO'),
('NOCTURNO');


-- === MÉDICOS ===

INSERT INTO medico (matricula, dni, nombre, apellido, cuil_cuit, fecha_ingreso) VALUES
(1001, 44444444, 'Carlos', 'López', 20444444449, '2023-01-10'),
(1002, 55555555, 'Lucía', 'Martínez', 27555555559, '2022-05-20'),
(1003, 66666666, 'Jorge', 'Alonso', 20666666669, '2024-02-12'),
(1004, 77777777, 'Ana', 'Torres', 27777777779, '2021-03-15'),
(1005, 88888888, 'David', 'Fernández', 20888888889, '2020-06-01');

-- === SECTORES ===

INSERT INTO sector (tipo) VALUES
('QUIRURGICO'),
('TERAPIA_INTENSIVA'),
('PEDIATRIA'),
('MATERNIDAD'),
('NEONATOLOGIA');

-- === HABITACIONES ===

INSERT INTO habitacion (num_habitacion, piso, orientacion, id_sector) VALUES
(101, 1, 'NORTE', 1),
(102, 1, 'SUR', 1),
(201, 2, 'ESTE', 2),
(202, 2, 'OESTE', 2),
(301, 3, 'NORTE', 3),
(302, 3, 'NORTE', 3),
(401, 4, 'SUR', 4),
(402, 4, 'SUR', 4),
(501, 5, 'ESTE', 5);

-- === CAMAS ===

-- Las inicialicé en LIBRE porque los triggers se ocuparán de
-- cambiar el estado de las camas
INSERT INTO cama (num_cama, num_habitacion, estado) VALUES
(1, 101, 'LIBRE'),
(2, 101, 'LIBRE'), 
(1, 102, 'LIBRE'), 
(1, 201, 'LIBRE'),   
(1, 202, 'LIBRE'),
(2, 202, 'LIBRE'),
(1, 301, 'LIBRE'), 
(2, 301, 'LIBRE'),
(1, 302, 'LIBRE'),
(1, 401, 'LIBRE'),
(2, 401, 'LIBRE'),
(1, 402, 'LIBRE'),
(1, 501, 'LIBRE'), 
(4, 101, 'LIBRE');

-- === ESPECIALIDADES ===

INSERT INTO especialidad (nombre) VALUES
('Cardiología'),
('Pediatría'),
('Cirugía General'),
('Neonatología'),
('Clínica Médica'),
('Traumatología');

-- === ESPECIALIZADO EN  ===

INSERT INTO especializado_en (id_especialidad, matricula, realiza_guardia, max_guardia) VALUES
(1, 1001, TRUE, 4), -- Carlos (Cardio)
(2, 1002, TRUE, 3), -- Lucía (Pediatría)
(3, 1003, TRUE, 2), -- Jorge (Cirugía)
(4, 1004, TRUE, 5), -- Ana (Neonatología)
(5, 1005, FALSE, 0), -- David (Clínica) - NO HACE GUARDIA
(6, 1003, TRUE, 2), -- Jorge (Cirugía) también hace Traumatología
(5, 1001, TRUE, 1), -- Carlos (Cardio) también hace Clínica
(2, 1004, TRUE, 1); -- Ana (Neonatología) también hace Pediatría

-- === ASIGNACIÓN DE GUARDIAS ===

-- Solo médicos con realiza_guardia = TRUE 
INSERT INTO asignacion_guardia (id_guardia, matricula, id_especialidad,fecha) VALUES
(1, 1001, 1,'2025-01-15'), -- MATUTINO, Carlos, Cardiología
(2, 1002, 2,'2025-02-15'), -- VESPERTINO, Lucía, Pediatría
(3, 1003, 3,'2025-03-15'), -- NOCTURNO, Jorge, Cirugía
(1, 1004, 4,'2025-01-15'), -- MATUTINO, Ana, Neonatología
(2, 1003, 6,'2025-01-25'), -- VESPERTINO, Jorge, Traumatología
(3, 1001, 5,'2025-05-15'), -- NOCTURNO, Carlos, Clínica Médica
(1, 1002, 2,'2025-06-15'); -- MATUTINO, Lucía, Pediatría

-- === PERÍODOS DE VACACIONES ===

INSERT INTO periodo_vacaciones (fecha_inicio, fecha_fin) VALUES
('2025-01-01', '2025-01-15'),
('2025-02-01', '2025-02-14'),
('2025-03-10', '2025-03-17'),
('2025-07-01', '2025-07-15'),
('2025-12-20', '2025-12-27');

-- === TIENE (VACACIONES) ===

INSERT INTO tiene (id_periodo_vacaciones, matricula) VALUES
(1, 1001), -- Carlos
(2, 1002), -- Lucía
(3, 1003), -- Jorge
(4, 1004), -- Ana
(5, 1005), -- David
(4, 1001); -- Carlos también se toma vacaciones en Julio porque quiere y porque puede

-- === INTERNACIONES ===

INSERT INTO internacion (fecha_inicio, fecha_fin, matricula, dni) VALUES
('2025-10-20', NULL, 1001, 11111111),  -- Dr. López (Cardio) atiende a Juan (ACTIVA)
('2025-10-22', NULL, 1002, 22222222),  -- Dra. Martínez (Pediatra) atiende a María (ACTIVA)
('2025-09-01', '2025-09-10', 1003, 99999999), -- Dr. Alonso (Cirujano) atendió a Miguel (FINALIZADA)
('2025-10-28', NULL, 1003, 33333333),  -- Dr. Alonso (Trauma) atiende a Alex (ACTIVA)
('2025-10-29', '2025-11-05', 1004, 10101010), -- Dra. Torres (Neo) atendió a Elena (FINALIZADA)
('2025-11-01', '2025-11-04', 1004, 12121212), -- Dra. Torres (Neo) atendió a Sofía (FINALIZADA)
('2025-11-10', NULL, 1002, 13131313), -- Dra. Martínez (Pediatra) atiende a Martín (ACTIVA)
('2025-11-12', NULL, 1005, 10101010); -- Dr. Fernández (Clínico) atiende a Elena (ACTIVA, 2da internación)

-- === CORRESPONDE (PACIENTE -> CAMA) ===

INSERT INTO corresponde (id_internacion, num_cama, num_habitacion, fecha, hora) VALUES
(1, 2, 101, '2025-10-20', '2025-10-20 09:00:00'), -- Int 1 Juan -> Cama (2, 101)
(2, 1, 102, '2025-10-22', '2025-10-22 10:30:00'), -- Int 2 María -> Cama (1, 102)
(3, 1, 501, '2025-09-01', '2025-09-01 14:00:00'), -- Int 3 Miguel -> Cama (1, 501)
(4, 1, 302, '2025-10-28', '2025-10-28 11:15:00'), -- Int 4 Alex -> Cama (1, 302)
(5, 1, 501, '2025-10-29', '2025-10-29 16:30:00'), -- Int 5 Elena -> Cama (1, 501)
(6, 1, 401, '2025-11-01', '2025-11-01 10:00:00'), -- Int 6 Sofía -> Cama (1, 401)
(7, 1, 301, '2025-11-10', '2025-11-10 13:00:00'), -- Int 7 Martín -> Cama (1, 301)
(8, 2, 401, '2025-11-12', '2025-11-12 08:00:00'); -- Int 8 Elena -> Cama (2, 401)

-- === RONDAS ===

INSERT INTO ronda (dia, turno) VALUES
('lunes', '1er TURNO'),
('miercoles', '2do TURNO'),
('viernes', '1er TURNO'),
('martes', '3er TURNO'),
('sabado', '1er TURNO');

-- === RECORRIDOS (RONDAS HECHAS) ===

INSERT INTO recorrido (id_ronda, matricula, fecha) VALUES
(1, 1001, '2025-10-27'), -- Dr. López hizo Ronda 1
(2, 1003, '2025-10-29'), -- Dr. Alonso hizo Ronda 2
(3, 1002, '2025-10-31'), -- Dra. Martínez hizo Ronda 3 (Pediatría)
(4, 1004, '2025-11-04'), -- Dra. Torres hizo Ronda 4 (Maternidad)
(5, 1005, '2025-11-08'), -- Dr. Fernández hizo Ronda 5
(1, 1001, '2025-11-10'); -- Dr. López hizo Ronda 1 (otro día)


-- === INCLUYE (HABITACIONES EN RONDA) ===
/**
 *  (1, 'QUIRURGICO'),
	(2, 'TERAPIA_INTENSIVA'),
	(3, 'PEDIATRIA'),
	(4, 'MATERNIDAD'),
	(5, 'NEONATOLOGIA');
 */
INSERT INTO incluye (id_ronda, num_habitacion) VALUES
(1, 101), -- Ronda 1 Quirúrgico
(1, 102),
(2, 201), -- Ronda 2 Terapia
(2, 202), 
(3, 301), -- Ronda 3 Pediatría
(3, 302),
(4, 401), -- Ronda 4 Maternidad
(4, 402),
(5, 101), -- Ronda 5 visita habitaciones de varios sectores
(5, 201),
(5, 501);

-- === COMENTARIOS DE RECORRIDO ===

INSERT INTO comentario_recorrido (Texto, id_recorrido, id_internacion) VALUES
('Paciente estable, control de signos vitales.', 1, 1), -- Dr. López (Rec 1) a Juan (Int 1)
('Paciente B, evoluciona favorablemente.', 1, 2), -- Dr. López (Rec 1) a María (Int 2)
('Paciente en sala 201, se ajusta medicación.', 2, 1), -- Dr. Alonso (Rec 2) a Juan (Int 1) (que estaba en hab 201)
('Paciente pediátrico estable, posible alta mañana.', 3, 7), -- Dra. Martínez (Rec 3) a Martín (Int 7)
('Control de rutina OK.', 3, 4), -- Dra. Martínez (Rec 3) a Alex (Int 4)
('Recién nacido sin complicaciones.', 4, 6), -- Dra. Torres (Rec 4) a Sofía (Int 6)
('Se solicita interconsulta con cardiología.', 5, 8); -- Dr. Fernández (Rec 5) a Elena (Int 8)
