drop type if exists SEXO cascade;

drop type if exists ORIENTACION cascade;

drop type if exists TIPO_SECTOR cascade;

drop type if exists TIPO_GUARDIA cascade;

drop type if exists ESTADO_CAMA cascade;

drop type if exists TURNO cascade;

/*TIPOS*/
create type SEXO as enum (
'MASCULINO',
'FEMENINO');

create type ORIENTACION as enum (
'NORTE',
'SUR',
'ESTE',
'OESTE');

create type TIPO_SECTOR as enum (
'QUIRURGICO',
'TERAPIA_INTENSIVA',
'PEDIATRIA',
'MATERNIDAD',
'NEONATOLOGIA');

create type TIPO_GUARDIA as enum (
'MATUTINO',
'VESPERTINO',
'NOCTURNO');

create type ESTADO_CAMA as enum (
'LIBRE',
'OCUPADA');

create type TURNO as enum (
'1er TURNO',
'2do TURNO',
'3er TURNO');

CREATE TYPE DIA_SEMANA AS ENUM (
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo'
);

create table paciente (
	dni INT not null,
  nombre VARCHAR(30) not null,
  apellido VARCHAR(30) not null,
  fecha_nac DATE not null,
  sexo SEXO not null,
  
  primary key (dni)
);

create table medico (
	matricula INT not null,
  dni INT unique not null,
  nombre VARCHAR(30) not null,
  apellido VARCHAR(30) not null,
  cuil_cuit BIGINT unique not null,
  fecha_ingreso DATE not null,
  
  primary key (matricula)
);

create table sector (
	id_sector SERIAL,
  tipo TIPO_SECTOR not null,
  
  primary key (id_sector)
);

create table habitacion (
	num_habitacion INT not null,
  piso INT not null,
  orientacion ORIENTACION not null,
  id_sector INT not null, 
  
  primary key (num_habitacion),
  foreign key (id_sector) references sector(id_sector)
);

create table cama (
	num_cama INT not null,
  num_habitacion INT not null,
  estado ESTADO_CAMA not null,
  
  primary key (num_cama,num_habitacion),
  foreign key (num_habitacion) references habitacion(num_habitacion)
);

create table ronda (
	id_ronda SERIAL,
  dia DIA_SEMANA not null,
  turno TURNO not null,
  
  primary key (id_ronda)
);

create table incluye (
	id_ronda INT not null,
  num_habitacion INT not null,
  
  primary key (id_ronda,num_habitacion),
  foreign key (id_ronda) references ronda(id_ronda),
  foreign key (num_habitacion) references habitacion(num_habitacion)
);

create table recorrido (
	id_recorrido SERIAL,
  id_ronda INT not null,
  matricula INT not null,
  fecha DATE not null,
  
  primary key (id_recorrido),
  foreign key (id_ronda) references ronda(id_ronda),
  foreign key (matricula) references medico(matricula)
);

create table internacion (
	id_internacion SERIAL,
  fecha_inicio DATE not null,
  fecha_fin DATE,
  matricula INT not null,
  dni INT not null,
  
  CONSTRAINT check_fin_no_anterior_a_inicio
  	CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  
  primary key (id_internacion),
  foreign key (matricula) references medico(matricula),
  foreign key (dni) references paciente(dni)
);

create table comentario_recorrido (
	nro_comentario SERIAL,
  texto VARCHAR(250),
  id_recorrido INT not null,
  id_internacion INT not null,
  
  primary key (nro_comentario),
  foreign key (id_recorrido) references recorrido(id_recorrido),
  foreign key (id_internacion) references internacion(id_internacion)
);

create table corresponde (
	id_internacion INT not null,
  num_cama INT not null,
  num_habitacion INT not null,
  fecha DATE not null,
  hora TIMESTAMP not null,
  
  primary key (id_internacion,num_cama,fecha,hora),
  foreign key (num_cama,num_habitacion) references cama(num_cama, num_habitacion),
  foreign key (id_internacion) references internacion(id_internacion)
);

create table especialidad (
	id_especialidad SERIAL,
  nombre VARCHAR(50) not null,
  
  primary key(id_especialidad)
);

create table especializado_en (
	id_especialidad INT not null,
  matricula INT not null,
  realiza_guardia BOOLEAN not null,
  max_guardia INT,
  
  primary key (id_especialidad,matricula),
  foreign key (id_especialidad) references especialidad(id_especialidad),
  foreign key (matricula) references medico(matricula)
);

create table guardia (
	id_guardia SERIAL,
  tipo_guardia TIPO_GUARDIA not null UNIQUE,
  
  primary key (id_guardia)
);

create table asignacion_guardia (
	id_guardia INT not null,
  matricula INT not null,
  id_especialidad INT not null, -- id_especializacion --> id_especialidad
  fecha DATE not null,
  
  primary key (id_guardia,matricula,fecha),
  foreign key (id_guardia) references guardia(id_guardia),
  foreign key (matricula) references medico(matricula),
  foreign key (id_especialidad) references especialidad(id_especialidad)
);

create table periodo_vacaciones (
	id_periodo_vacaciones SERIAL,
  fecha_inicio DATE not null,
  fecha_fin DATE not null,
  
  primary key (id_periodo_vacaciones)
);

create table tiene (
	id_periodo_vacaciones INT not null,
  matricula INT not null,
  
  primary key (id_periodo_vacaciones,matricula),
  foreign key (matricula) references medico(matricula),
  foreign key (id_periodo_vacaciones) references periodo_vacaciones(id_periodo_vacaciones)
);
