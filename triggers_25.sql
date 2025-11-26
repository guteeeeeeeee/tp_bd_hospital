-- === AUDITORÍA DE ASIGNACIÓN DE GUARDIAS ===

DROP TABLE IF EXISTS aud_asignacion_guardia CASCADE;

CREATE TABLE aud_asignacion_guardia(
    id_auditoria SERIAL PRIMARY KEY,
    accion CHAR(1) NOT NULL, -- 'I' = INSERT, 'U' = UPDATE, 'D' = DELETE
    usuario TEXT NOT NULL,
    fecha_auditoria TIMESTAMP DEFAULT NOW(),

    id_guardia INT NOT NULL,
    matricula INT NOT NULL,
    id_especialidad INT NOT NULL,
    t_guardia TIPO_GUARDIA NOT NULL,
    dni INT NOT NULL,
    nombre_medico VARCHAR(30) NOT NULL,
    apellido_medico VARCHAR(30) NOT NULL,
    especialidad VARCHAR(50) NOT NULL
);

--  FUNCIÓN DE AUDITORÍA 
CREATE OR REPLACE FUNCTION auditLog()
RETURNS TRIGGER AS $$
DECLARE
    v_t_guardia TIPO_GUARDIA;
    v_dni INT;
    v_nombre_medico VARCHAR(30);
    v_apellido_medico VARCHAR(30);
    v_especialidad VARCHAR(50);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT g.tipo_guardia, m.dni, m.nombre, m.apellido, e.nombre
        INTO v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad
        FROM guardia g
        JOIN medico m ON m.matricula = OLD.matricula
        JOIN especialidad e ON e.id_especialidad = OLD.id_especialidad
        WHERE g.id_guardia = OLD.id_guardia;

        INSERT INTO aud_asignacion_guardia
        VALUES (DEFAULT, 'D', current_user, NOW(),
                OLD.id_guardia, OLD.matricula, OLD.id_especialidad,
                v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad);

        RETURN OLD;

    ELSIF TG_OP = 'INSERT' THEN
        SELECT g.tipo_guardia, m.dni, m.nombre, m.apellido, e.nombre
        INTO v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad
        FROM guardia g
        JOIN medico m ON m.matricula = NEW.matricula
        JOIN especialidad e ON e.id_especialidad = NEW.id_especialidad
        WHERE g.id_guardia = NEW.id_guardia;

        INSERT INTO aud_asignacion_guardia
        VALUES (DEFAULT, 'I', current_user, NOW(),
                NEW.id_guardia, NEW.matricula, NEW.id_especialidad,
                v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad);

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT g.tipo_guardia, m.dni, m.nombre, m.apellido, e.nombre
        INTO v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad
        FROM guardia g
        JOIN medico m ON m.matricula = NEW.matricula
        JOIN especialidad e ON e.id_especialidad = NEW.id_especialidad
        WHERE g.id_guardia = NEW.id_guardia;

        INSERT INTO aud_asignacion_guardia
        VALUES (DEFAULT, 'U', current_user, NOW(),
                NEW.id_guardia, NEW.matricula, NEW.id_especialidad,
                v_t_guardia, v_dni, v_nombre_medico, v_apellido_medico, v_especialidad);

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_aud_asig_guard ON asignacion_guardia;
CREATE TRIGGER trig_aud_asig_guard
AFTER INSERT OR UPDATE OR DELETE ON asignacion_guardia
FOR EACH ROW
EXECUTE FUNCTION auditLog();

-- PRUEBA --
-- INSERT INTO asignacion_guardia (id_guardia, matricula, id_especialidad) VALUES (1, 1003, 3);
-- UPDATE asignacion_guardia SET id_especialidad = 2 WHERE id_guardia = 1 AND matricula = 1003;
-- DELETE FROM asignacion_guardia WHERE id_guardia = 1 AND matricula = 1003;
-- SELECT * FROM aud_asignacion_guardia;

-- VALIDAR QUE UN MÉDICO NO PUEDA ATENDER SU PROPIA INTERNACIÓN --
CREATE OR REPLACE FUNCTION validar_internacion_medico()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM medico 
        WHERE matricula = NEW.matricula 
        AND dni = NEW.dni
    ) THEN
        RAISE EXCEPTION 'Un médico no puede atender su propia internación.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_validar_internacion_medico ON internacion;
CREATE TRIGGER trig_validar_internacion_medico
BEFORE INSERT OR UPDATE ON internacion
FOR EACH ROW
EXECUTE FUNCTION validar_internacion_medico();

-- PRUEBAS --
-- INSERT INTO internacion (id_internacion, fecha_inicio, fecha_fin, matricula, dni) VALUES
--(1, '2025-10-20', NULL, 1001, 44444444);

CREATE OR REPLACE FUNCTION validar_fechas_internacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_fin IS NOT NULL AND NEW.fecha_fin < NEW.fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la de inicio';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_validar_fechas_internacion ON internacion;
CREATE TRIGGER trig_validar_fechas_internacion
BEFORE INSERT OR UPDATE ON internacion
FOR EACH ROW
EXECUTE FUNCTION validar_fechas_internacion();

-- PRUEBAS --

--INSERT INTO internacion (id_internacion, fecha_inicio, fecha_fin, matricula, dni) VALUES
--(10, '2025-10-20', '2025-9-20', 1001, 22222222);

-- VALIDA QUE UNA CAMA ESTE LIBRE PARA ASIGNARSELA A UN PACIENTE --
CREATE OR REPLACE FUNCTION validar_cama_libre()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM cama 
        WHERE num_cama = NEW.num_cama 
        AND num_habitacion = NEW.num_habitacion
        AND estado != 'LIBRE'
    ) THEN
        RAISE EXCEPTION 'La cama % de la habitación % no está libre', 
                        NEW.num_cama, NEW.num_habitacion;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_validar_cama_libre ON corresponde;
CREATE TRIGGER trig_validar_cama_libre
BEFORE INSERT ON corresponde 
FOR EACH ROW
EXECUTE FUNCTION validar_cama_libre();

-- =========================================================== --
-- ACTUALIZA EL ESTADO DE UNA CAMA
-- =========================================================== --
/**
 * En teoria deberia de funcionar bien al insertar
 * en momentos anteriores cuando ya hay una actualmente
 */
CREATE OR REPLACE FUNCTION fn_actualizar_cama_historico()
RETURNS TRIGGER AS $$
DECLARE
    v_ant_num_cama INT;
    v_ant_num_habitacion INT;
    v_fecha_fin_internacion DATE; 
	v_es_ultimo_movimiento BOOLEAN;
BEGIN
	
	SELECT NOT EXISTS (
        SELECT 1 FROM corresponde
        WHERE id_internacion = NEW.id_internacion
          AND (fecha, hora) > (NEW.fecha, NEW.hora)
    ) INTO v_es_ultimo_movimiento;

 	-- Aca se verifica si el ultimo movimiento realizado de la internacion es 
	-- un dato historico o anterior
    IF NOT v_es_ultimo_movimiento THEN
        RETURN NEW;
    END IF;
    
    
    -- Buscamos para ésta internación la que tenga una fecha menor
    SELECT num_cama, num_habitacion
    INTO v_ant_num_cama, v_ant_num_habitacion
    FROM corresponde
    WHERE id_internacion = NEW.id_internacion
      AND (fecha, hora) < (NEW.fecha, NEW.hora)
    ORDER BY fecha DESC, hora DESC
    LIMIT 1;

    IF FOUND THEN
        UPDATE cama
        SET estado = 'LIBRE'
        WHERE num_cama = v_ant_num_cama
          AND num_habitacion = v_ant_num_habitacion;
    END IF;
    
    -- Antes de ocupar la cama, verificar el estado de la internación (si finalizo)
    SELECT fecha_fin 
    INTO v_fecha_fin_internacion
    FROM internacion
    WHERE id_internacion = NEW.id_internacion;

    -- Si no tiene fecha de finalización (null) entonces la marcamos
	-- porque el paciente no esta internado dx
    IF v_fecha_fin_internacion IS NULL THEN
        UPDATE cama
        SET estado = 'OCUPADA'
        WHERE num_cama = NEW.num_cama
          AND num_habitacion = NEW.num_habitacion;
    END IF;

      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trig_actualizar_estado_cama ON corresponde;
CREATE TRIGGER trig_actualizar_estado_cama
AFTER INSERT ON corresponde 
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_cama_historico();


-- PRUEBA ??
/**
UPDATE internacion SET fecha_fin = NULL WHERE id_internacion = 1;

INSERT INTO corresponde (id_internacion, num_cama , num_habitacion, fecha, hora)
VALUES (1, 1, 501, '2025-11-20', '2025-11-20 22:00:00');

SELECT * FROM cama WHERE num_habitacion = 501;
**/


-- =========================================================== --
-- ACTUALIZAR EL ESTADO DE UNA CAMA AL DAR DE ALTA UN PACIENTE --
-- =========================================================== --
CREATE OR REPLACE FUNCTION fn_liberar_cama_por_alta()
RETURNS TRIGGER AS $$
DECLARE
    v_ult_num_cama INT;
    v_ult_num_habitacion INT;
BEGIN
    
    IF NEW.fecha_fin IS NOT NULL AND OLD.fecha_fin IS NULL THEN
    
        -- Buscar la ultima cama que tuvo esta internación
        SELECT num_cama, num_habitacion
        INTO v_ult_num_cama, v_ult_num_habitacion
        FROM corresponde
        WHERE id_internacion = NEW.id_internacion
        ORDER BY fecha DESC, hora DESC
        LIMIT 1;
        
        -- Si hay, la marcamos como libre
        IF FOUND THEN
            UPDATE cama
            SET estado = 'LIBRE'
            WHERE num_cama = v_ult_num_cama
              AND num_habitacion = v_ult_num_habitacion;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_liberar_cama_por_alta ON internacion;
CREATE TRIGGER trig_liberar_cama_por_alta
AFTER UPDATE ON internacion
FOR EACH ROW
EXECUTE FUNCTION fn_liberar_cama_por_alta();


-- =========================================================== --
-- VALIDAR FECHA AL INSERTAR EL PACIENTE EN UNA CAMA, HABIT    --
-- =========================================================== --
CREATE OR REPLACE FUNCTION validar_fecha_movimiento()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_inicio DATE;
    v_fecha_fin DATE;
BEGIN
    SELECT fecha_inicio, fecha_fin INTO v_fecha_inicio, v_fecha_fin
    FROM internacion WHERE id_internacion = NEW.id_internacion;

    IF NEW.fecha < v_fecha_inicio THEN
        RAISE EXCEPTION 'No se puede asignar una cama antes del inicio de la internación';
    END IF;

    IF v_fecha_fin IS NOT NULL AND NEW.fecha > v_fecha_fin THEN
        RAISE EXCEPTION 'No se puede asignar una cama después del fin de la internación';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_validar_fecha_movimiento
BEFORE INSERT OR UPDATE ON corresponde
FOR EACH ROW EXECUTE FUNCTION validar_fecha_movimiento();


-- =========================================================== --
-- VERIFICA QUE EL MEDICO REALMENTE REALICE ESA GUARDIA        --
-- Y QUE NO SUPERE LA CANTIDAD MAXIMA POR MES 				   --
-- =========================================================== --
CREATE OR REPLACE FUNCTION validar_reglas_guardia()
RETURNS TRIGGER AS $$
DECLARE
    v_realiza_guardia      BOOLEAN;
    v_max_guardia          INT;
    v_guardias_mes         INT;
    v_mes                  INT := EXTRACT(MONTH FROM NEW.fecha);
    v_anio                 INT := EXTRACT(YEAR  FROM NEW.fecha);
BEGIN
    -- Verifica que el médico hace guardias para esa especialidad
    SELECT realiza_guardia, max_guardia
    INTO  v_realiza_guardia, v_max_guardia
    FROM especializado_en
    WHERE matricula     = NEW.matricula
      AND id_especialidad = NEW.id_especialidad;

    IF v_realiza_guardia IS NULL OR v_realiza_guardia = FALSE THEN
        RAISE EXCEPTION
          'El médico no realiza guardias para esa especialidad';
    END IF;

    -- Contar guardias del mismo médico y especialidad en ese MES/AÑO
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*)
        INTO v_guardias_mes
        FROM asignacion_guardia ag
        WHERE ag.matricula      = NEW.matricula
          AND ag.id_especialidad = NEW.id_especialidad
          AND EXTRACT(MONTH FROM ag.fecha) = v_mes
          AND EXTRACT(YEAR  FROM ag.fecha) = v_anio;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Excluimos la propia fila "vieja" por si estamos moviendo de fecha/esp/etc.
        SELECT COUNT(*)
        INTO v_guardias_mes
        FROM asignacion_guardia ag
        WHERE ag.matricula      = NEW.matricula
          AND ag.id_especialidad = NEW.id_especialidad
          AND EXTRACT(MONTH FROM ag.fecha) = v_mes
          AND EXTRACT(YEAR  FROM ag.fecha) = v_anio
          AND NOT (ag.id_guardia = OLD.id_guardia
                   AND ag.matricula = OLD.matricula
                   AND ag.fecha     = OLD.fecha);
    END IF;

    -- Verificar que no supere el tope mensual
    IF v_guardias_mes + 1 > v_max_guardia THEN
        RAISE EXCEPTION
          'Se excede el máximo mensual de guardias para la especialidad de este medico';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_validar_reglas_guardia ON asignacion_guardia;
CREATE TRIGGER trig_validar_reglas_guardia
BEFORE INSERT OR UPDATE ON asignacion_guardia
FOR EACH ROW
EXECUTE FUNCTION validar_reglas_guardia();


-- =========================================================== --
-- VALIDAR QUE UNA CAMA OCUPADA NO PUEDA SER BORRADA           --
-- =========================================================== --
CREATE OR REPLACE FUNCTION fn_borrar_cama()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.estado = 'OCUPADA' THEN
		RAISE EXCEPTION 'La cama % de la habitación % se encuentra ocupada, no es posible borrarla',
						OLD.num_CAMA, OLD.num_habitacion;
	END IF;

	RETURN OLD;
	
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_borrar_cama ON CAMA;
CREATE TRIGGER trig_borrar_cama
BEFORE DELETE ON cama
FOR EACH ROW EXECUTE FUNCTION fn_borrar_cama();

-- =========================================================== --
-- VALIDAR QUE UN PACIENTE NO TENGA VARIAS INTERNACIONES A LA VEZ           --
-- =========================================================== --

CREATE OR REPLACE FUNCTION validar_unica_internacion_activa()
RETURNS trigger AS $$
DECLARE
    v_id_activa INT;
BEGIN
    -- Si esta internación es historica no pasa nada (tiene fecha fin)
    IF NEW.fecha_fin IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar otra internación activa del mismo paciente
    SELECT id_internacion
    INTO v_id_activa
    FROM internacion i
    WHERE i.dni = NEW.dni
      AND i.fecha_fin IS NULL              -- que este activa
      AND (
            TG_OP = 'INSERT'               -- en INSERT, cualquier activa molesta
            OR i.id_internacion <> NEW.id_internacion  -- en UPDATE, excluirse a sí misma
          )
    LIMIT 1;

    -- Si encontramos una, no permitimos la operación
    IF v_id_activa IS NOT NULL THEN
        RAISE EXCEPTION
          'El paciente % ya tiene una internación activa (id_internacion=%). No se permite otra internación activa simultánea.',
          NEW.dni, v_id_activa;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trig_unica_internacion_activa ON internacion;
CREATE TRIGGER trig_unica_internacion_activa
BEFORE INSERT OR UPDATE ON internacion
FOR EACH ROW
EXECUTE FUNCTION validar_unica_internacion_activa();

-- =========================================================== --
-- VALIDAR QUE UN MEDICO NO TENGA FECHAS DE VACACIONES SUPERPUESTAS           --
-- =========================================================== --

CREATE OR REPLACE FUNCTION validar_solapamiento_vacaciones()
RETURNS trigger AS $$
DECLARE
  v_fecha_inicio DATE;
  v_fecha_fin    DATE;
  v_solapa       INTEGER;
BEGIN
  SELECT fecha_inicio, fecha_fin
  INTO v_fecha_inicio, v_fecha_fin
  FROM periodo_vacaciones
  WHERE id_periodo_vacaciones = NEW.id_periodo_vacaciones;

  SELECT COUNT(*) INTO v_solapa
  FROM tiene t
  JOIN periodo_vacaciones pv
    ON pv.id_periodo_vacaciones = t.id_periodo_vacaciones
  WHERE t.matricula = NEW.matricula
    AND t.id_periodo_vacaciones <> NEW.id_periodo_vacaciones
    AND v_fecha_inicio <= pv.fecha_fin
    AND pv.fecha_inicio <= v_fecha_fin;

  IF v_solapa > 0 THEN
    RAISE EXCEPTION
      'El médico % ya tiene vacaciones que se solapan con este período', NEW.matricula;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_validar_solapamiento_vacaciones
BEFORE INSERT OR UPDATE ON tiene
FOR EACH ROW
EXECUTE FUNCTION validar_solapamiento_vacaciones();

-- =========================================================== --
-- VALIDAR QUE UN MEDICO NO DOS GUARDIAS EL MISMO DIA           --
-- =========================================================== --

CREATE OR REPLACE FUNCTION validar_guardias_por_dia()
RETURNS TRIGGER AS $$
DECLARE
    cant INT;
BEGIN
    SELECT COUNT(*)
    INTO cant
    FROM asignacion_guardia
    WHERE matricula = NEW.matricula
      AND fecha = NEW.fecha;

    IF cant > 0 THEN
        RAISE EXCEPTION 'El médico % ya tiene al menos una guardia asignada el día %', 
            NEW.matricula, NEW.fecha;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_guardias_por_dia
BEFORE INSERT ON asignacion_guardia
FOR EACH ROW
EXECUTE FUNCTION validar_guardias_por_dia();

-- =========================================================== --
-- VALIDAR QUE FECHA DEL RECORRIDO CAIGA EN EL DIA DE RONDA           --
-- =========================================================== --

CREATE OR REPLACE FUNCTION validar_dia_recorrido()
RETURNS TRIGGER AS $$
DECLARE
    v_dia_ronda DIA_SEMANA;
    v_dow INT;
BEGIN
    SELECT dia INTO v_dia_ronda
    FROM ronda
    WHERE id_ronda = NEW.id_ronda;

    -- EXTRACT(DOW): 0=domingo, 1=lunes, ..., 6=sábado
    v_dow := EXTRACT(DOW FROM NEW.fecha);

    IF (v_dia_ronda = 'lunes'     AND v_dow <> 1) OR
       (v_dia_ronda = 'martes'    AND v_dow <> 2) OR
       (v_dia_ronda = 'miercoles' AND v_dow <> 3) OR
       (v_dia_ronda = 'jueves'    AND v_dow <> 4) OR
       (v_dia_ronda = 'viernes'   AND v_dow <> 5) OR
       (v_dia_ronda = 'sabado'    AND v_dow <> 6) OR
       (v_dia_ronda = 'domingo'   AND v_dow <> 0)
    THEN
        RAISE EXCEPTION 
          'La fecha % no coincide con el día de la ronda (%)', 
          NEW.fecha, v_dia_ronda;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_validar_dia_recorrido ON recorrido;
CREATE TRIGGER trig_validar_dia_recorrido
BEFORE INSERT OR UPDATE ON recorrido
FOR EACH ROW
EXECUTE FUNCTION validar_dia_recorrido();

