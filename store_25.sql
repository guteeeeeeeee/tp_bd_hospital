-- === STORED PROCEDURES // FUNCTIONS ===

-- =========================================================== --
-- CAMAS DISPONIBLES POR SECTOR                                --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_cantidad_camas_libres_por_sector()
RETURNS TABLE(
    sector TIPO_SECTOR,
    cantidad_disponible BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.tipo, COUNT(c.num_cama)
    FROM cama c
    JOIN habitacion h ON h.num_habitacion = c.num_habitacion
    JOIN sector s ON s.id_sector = h.id_sector
    WHERE c.estado = 'LIBRE'
    GROUP BY s.tipo
	ORDER BY cantidad_disponible DESC;
END;
$$ LANGUAGE plpgsql;

-- PRUEBAS --
-- SELECT * FROM sp_cantidad_camas_libres_por_sector() ;

-- =========================================================== --
-- LISTADO DE DETALLES DE LAS CAMAS DISPONIBLES POR SECTOR     --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_detalle_camas_disponibles(sector TIPO_SECTOR DEFAULT NULL)
RETURNS TABLE(
    nombre_sector TEXT,
    piso INT,
    num_habitacion INT,
    num_cama INT,
    orientacion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.tipo::TEXT, h.piso, c.num_habitacion, c.num_cama, h.orientacion::TEXT
    FROM cama c
    JOIN habitacion h ON h.num_habitacion = c.num_habitacion
    JOIN sector s ON s.id_sector = h.id_sector
    WHERE c.estado = 'LIBRE'
      AND (sector IS NULL OR s.tipo = sector)
    ORDER BY s.tipo, h.piso, c.num_habitacion;
END;
$$ LANGUAGE plpgsql;

-- PRUEBA --
-- SELECT * FROM sp_detalle_camas_disponibles();
-- SELECT * FROM sp_detalle_camas_disponibles('QUIRURGICO');

-- =========================================================== --
--  INTERNACIONES POR DNI                                      --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_DNI_internaciones(DNI_paciente INT)
RETURNS TABLE(
    id_internacion INT,
    fecha_inicio DATE,
    fecha_fin DATE,
    matricula_medico INT,
    nombre_medico varchar(30),
    apellido_medico varchar(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id_internacion, i.fecha_inicio, i.fecha_fin, m.matricula, m.nombre, m.apellido
    FROM internacion i
    JOIN medico m ON m.matricula = i.matricula
    JOIN paciente p ON p.dni = i.dni
    WHERE p.dni = DNI_paciente
    ORDER BY i.fecha_inicio DESC;
END;
$$ LANGUAGE plpgsql;

-- PRUEBAS --
-- SELECT * FROM sp_DNI_internaciones(99999999);

-- =========================================================== --
-- COMENTARIOS DE UNA INTERNACIÓN                              --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_comentarios_internacion(id_internacion_requerida INT)
RETURNS TABLE(
    fecha DATE,
    texto VARCHAR(250),
    matricula INT,
    apellido_medico VARCHAR(30),
    nombre_medico VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.fecha, c.texto, m.matricula, m.apellido, m.nombre
    FROM comentario_recorrido c
    JOIN recorrido r ON r.id_recorrido = c.id_recorrido
    JOIN medico m ON m.matricula = r.matricula
    WHERE c.id_internacion = id_internacion_requerida
    ORDER BY r.fecha DESC;
END;
$$ LANGUAGE plpgsql;

-- PRUEBAS --
-- SELECT * FROM sp_comentarios_internacion(1);

-- =========================================================== --
-- PACIENTES INTERNADOS ACTUALMENTE                            --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_pacientes_internados_actualmente()
RETURNS TABLE(
    dni_paciente INT,
    apellido_paciente VARCHAR(30),
    nombre_paciente VARCHAR(30),
    id_internacion INT,
    fecha_inicio_internacion DATE,
    matricula INT,
    apellido_medico VARCHAR(30),
    nombre_medico VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.dni, p.apellido, p.nombre, i.id_internacion, i.fecha_inicio, m.matricula, m.apellido, m.nombre
    FROM paciente p
    JOIN internacion i ON p.dni = i.dni
    JOIN medico m ON m.matricula = i.matricula
    WHERE i.fecha_fin IS NULL
    ORDER BY i.fecha_inicio, m.matricula, p.dni;
END;
$$ LANGUAGE plpgsql;

-- PRUEBA --
-- SELECT * FROM sp_pacientes_internados_actualmente();

-- =========================================================== --
-- PACIENTES ATENDIDOS POR MÉDICO (ACTUALMENTE)                --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_pacientes_atendidos_por_medico_actualmente(MATRICULA_REQUERIDA INT)
RETURNS TABLE(
    dni_paciente INT,
    apellido_paciente VARCHAR(30),
    nombre_paciente VARCHAR(30),
    fecha_inicio_internacion DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.dni, p.apellido, p.nombre, i.fecha_inicio
    FROM paciente p
    JOIN internacion i ON i.dni = p.dni
    WHERE i.matricula = MATRICULA_REQUERIDA
      AND i.fecha_fin IS NULL
    ORDER BY i.fecha_inicio, p.dni;
END;
$$ LANGUAGE plpgsql;

-- PRUEBA --
-- SELECT * FROM sp_pacientes_atendidos_por_medico_actualmente(1002);

-- =========================================================== --
-- PACIENTES ATENDIDOS POR MÉDICO (HISTORIAL)                  --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_pacientes_atendidos_por_medico_historial(MATRICULA_REQUERIDA INT)
RETURNS TABLE(
    dni_paciente INT,
    apellido_paciente VARCHAR(30),
    nombre_paciente VARCHAR(30),
    fecha_inicio_internacion DATE,
    fecha_fin_internacion DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.dni, p.apellido, p.nombre, i.fecha_inicio, i.fecha_fin
    FROM paciente p
    JOIN internacion i ON i.dni = p.dni
    WHERE i.matricula = MATRICULA_REQUERIDA
    ORDER BY i.fecha_inicio, p.dni;
END;
$$ LANGUAGE plpgsql;

-- PRUEBA --
-- SELECT * FROM sp_pacientes_atendidos_por_medico_historial(1002);

-- =========================================================== --
-- MÉDICOS DE VACACIONES ENTRE DOS FECHAS 					   --
-- =========================================================== --
CREATE OR REPLACE FUNCTION sp_get_medicos_de_vacaciones(
    fecha_desde DATE,
    fecha_hasta DATE
)
RETURNS TABLE(
    matricula INT,
    apellido_medico varchar(30),
    nombre_medico varchar(30),
    vacaciones_inicio DATE,
    vacaciones_fin DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.matricula, m.apellido, m.nombre, pv.fecha_inicio, pv.fecha_fin
    FROM medico m
    JOIN tiene t ON t.matricula = m.matricula
    JOIN periodo_vacaciones pv ON pv.id_periodo_vacaciones = t.id_periodo_vacaciones
    WHERE pv.fecha_inicio <= fecha_hasta AND pv.fecha_fin >= fecha_desde
    ORDER BY pv.fecha_inicio, m.matricula;
END;
$$ LANGUAGE plpgsql;

-- PRUEBA --
-- SELECT * FROM sp_get_medicos_de_vacaciones('2025-01-01', '2025-12-31');

-- =========================================================== --
-- Calcula cuantas guardias y cuantos recorridos hizo          --
-- un medico en un mes										   --
-- =========================================================== --
/**
 * "Para efectuar una correcta liquidación de los honorarios por guardia es necesario conocer
el CUIL/CUIT del médico y la fecha en la que ingresó al hospital"
+ extras
 */
CREATE OR REPLACE FUNCTION sp_reporte_actividad_medico(
    p_matricula INT,
    p_mes INT,
    p_anio INT
)
RETURNS TABLE (
    medico TEXT,
    cuit BIGINT,
    fecha_ingreso DATE,
    antiguedad_años INT,
    cant_guardias BIGINT,
    cant_recorridos BIGINT,
    detalle TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (m.apellido || ' ' || m.nombre)::TEXT AS medico,
        m.cuil_cuit,
        m.fecha_ingreso,
        
        (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM m.fecha_ingreso))::INT AS antiguedad_años,
        (
            SELECT COUNT(*) 
            FROM asignacion_guardia ag 
            WHERE ag.matricula = m.matricula
              AND EXTRACT(MONTH FROM ag.fecha) = p_mes
              AND EXTRACT(YEAR  FROM ag.fecha) = p_anio
        ) AS cant_guardias,

        (
            SELECT COUNT(*) 
            FROM recorrido r
            WHERE r.matricula = m.matricula
              AND EXTRACT(MONTH FROM r.fecha) = p_mes
              AND EXTRACT(YEAR  FROM r.fecha) = p_anio
        ) AS cant_recorridos,
           
        'Liquidación generada el ' || CURRENT_DATE::TEXT AS detalle
    FROM medico m
    WHERE m.matricula = p_matricula;
END;
$$ LANGUAGE plpgsql;

