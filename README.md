**1** crear la base de datos en postgre: 
CREATE DATABASE hospital_db;
**2** cargar las estructuras de las tablas del archivo:
sudo -u postgres psql -d hospital_db -f /tmp/hospitalDB_25.sql
**3** cargar los triggers antes de ingresar los datos !!
sudo -u postgres psql -d hospital_db -f /tmp/triggers_25.sql
**4** cargar los datos iniciales:
sudo -u postgres psql -d hospital_db -f /tmp/datos_init_25.sql
**5** por ultimo cargar los stored procedures
sudo -u postgres psql -d hospital_db -f /tmp/store_25.sql
