Instalación de la Base de Datos del Hospital

1. Crear la base de datos

Desde PostgreSQL:

CREATE DATABASE hospital_db;

2. Cargar las estructuras de las tablas

Ejecutar el archivo SQL que contiene todos los CREATE TABLE, tipos y claves:

sudo -u postgres psql -d hospital_db -f /tmp/hospitalDB_25.sql

3. Cargar los triggers

⚠️ Los triggers se tienen que cargar antes de ingresar los datos.

sudo -u postgres psql -d hospital_db -f /tmp/triggers_25.sql

4. Cargar los datos iniciales
sudo -u postgres psql -d hospital_db -f /tmp/datos_init_25.sql

5. Cargar los stored procedures
sudo -u postgres psql -d hospital_db -f /tmp/store_25.sql
