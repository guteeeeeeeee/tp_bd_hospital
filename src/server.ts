import express, {Request, Response} from 'express';
import {Pool} from 'pg';

const app = express();
const PORT = 3000;

app.use(express.urlencoded({extended: true}));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db', // cambiar
    password: 'postgres', // cambiar
    port: 5432,
});

app.get('/', async (req: Request, res: Response) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM paciente) as total_pacientes,
                (SELECT COUNT(*) FROM medico) as total_medicos,
                (SELECT COUNT(*) FROM internacion WHERE fecha_fin IS NULL) as internaciones_activas,
                (SELECT COUNT(*) FROM cama WHERE estado = 'LIBRE') as camas_libres,
                (SELECT COUNT(*) FROM cama WHERE estado = 'OCUPADA') as camas_ocupadas
        `);

        const s = stats.rows[0];

        res.send(`
        <style>
            .dashboard-card { background: #f8f9fa; padding: 10px 15px; border-radius: 5px; border: 1px solid #ddd; text-align: center; }
            .dashboard-container { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
            h2 { margin: 5px 0; font-size: 1.5em; color: #007bff; }
        </style>

        <h1>Panel Hospital - ABM</h1>
        
        <div class="dashboard-container">
            <div class="dashboard-card">
                <h2>${s.total_pacientes}</h2>
                <span>Pacientes</span>
            </div>
            <div class="dashboard-card">
                <h2>${s.total_medicos}</h2>
                <span>Médicos</span>
            </div>
            <div class="dashboard-card">
                <h2 style="color: #dc3545;">${s.internaciones_activas}</h2>
                <span>Internaciones Activas</span>
            </div>
            <div class="dashboard-card">
                <h2 style="color: #28a745;">${s.camas_libres}</h2>
                <span>Camas Libres</span>
            </div>
        </div>
        <hr>

        <div>
            <div>
                <h3>Gestión General</h3>
                <ul>
                    <li><a href="/paciente">Pacientes</a></li>
                    <li><a href="/medico">Médicos</a></li>
                    <li><a href="/sector">Sectores</a></li>
                    <li><a href="/habitacion">Habitaciones</a></li>
                    <li><a href="/cama">Camas</a></li>
                    <li><a href="/especialidad">Especialidades</a></li>
                    <li><a href="/especializado_en">Médico x Especialidad</a></li>
                    <li><a href="/guardia">Guardias</a></li>
                    <li><a href="/asignacion_guardia">Asignación de guardias</a></li>
                    <li><a href="/periodo_vacaciones">Períodos de vacaciones</a></li>
                    <li><a href="/tiene">Asignar vacaciones a médicos</a></li>
                    <li><a href="/internacion">Internaciones</a></li>
                    <li><a href="/ronda">Rondas</a></li>
                    <li><a href="/incluye">Habitaciones por ronda</a></li>
                    <li><a href="/recorrido">Recorridos</a></li>
                    <li><a href="/comentario_recorrido">Comentarios de recorrido</a></li>
                    <li><a href="/corresponde">Corresponde</a></li>
                </ul>
            </div>
            <div>
                <h3>Reportes y Consultas</h3>
                <ul>
                    <li><a href="/reportes/camas-disponibles">Camas Disponibles (Internaciones)</a></li>
                    <li><a href="/reportes/auditoria">Auditoría de Guardias (Admin)</a></li>
                    <li><a href="/reportes/internados">Reportes de internados</a></li>
                    <li><a href="/reportes/liquidacion">Reportes de liquidación</a></li>
                    <li><i>Para "Seguimiento Médico", ir a Internaciones > Ver Seguimiento</i></li>
                </ul>
            </div>
            <div>
                <h3>Gestión dual Médico y Paciente</h3>
                <ul>
                    <li><a href="/internar_medico">Internar Médico (Transacción)</a></li>
                </ul>       
            </div>
        </div>
      `);
    } catch (err: any) {
        res.status(500).send(`<pre>Error al cargar el panel: ${err.message}</pre>`);
    }
});

//PACIENTE

app.get('/paciente', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT dni, nombre, apellido, fecha_nac, sexo FROM paciente ORDER BY apellido, nombre'
        );
        const filas = result.rows.map((p: any) => `
      <tr>
        <td>${p.dni}</td>
        <td>${p.apellido}</td>
        <td>${p.nombre}</td>
        <td>${p.fecha_nac}</td>
        <td>${p.sexo}</td>
        <td>
          <a href="/paciente/editar/${p.dni}">Editar</a>
          |
          <form method="POST" action="/paciente/borrar/${p.dni}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar paciente?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Pacientes</h1>
      <a href="/paciente/nuevo">➕ Nuevo paciente</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>DNI</th><th>Apellido</th><th>Nombre</th><th>Fecha nac.</th><th>Sexo</th><th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="6">Sin pacientes.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/paciente/nuevo', (_req, res) => {
    res.send(`
    <h1>Nuevo paciente</h1>
    <form method="POST" action="/paciente/nuevo">
      DNI: <input type="number" name="dni" required><br><br>
      Nombre: <input type="text" name="nombre" required><br><br>
      Apellido: <input type="text" name="apellido" required><br><br>
      Fecha de nacimiento: <input type="date" name="fecha_nac" required><br><br>
      Sexo:
      <select name="sexo" required>
        <option value="MASCULINO">MASCULINO</option>
        <option value="FEMENINO">FEMENINO</option>
      </select><br><br>
      <button type="submit">Guardar</button>
    </form>
    <br><a href="/paciente">Volver</a>
  `);
});
//AGREGAR PACIENTE
app.post('/paciente/nuevo', async (req, res) => {
    const {dni, nombre, apellido, fecha_nac, sexo} = req.body;
    try {
        await pool.query(
            `INSERT INTO paciente(dni, nombre, apellido, fecha_nac, sexo)
             VALUES ($1, $2, $3, $4, $5)`,
            [Number(dni), nombre, apellido, fecha_nac, sexo]
        );
        res.redirect('/paciente');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/paciente/nuevo">Volver</a>`);
    }
});
//SELECCIONAR PACIENTE
app.get('/paciente/editar/:dni', async (req, res) => {
    const dni = Number(req.params.dni);
    try {
        const result = await pool.query(
            'SELECT dni,nombre,apellido,fecha_nac,sexo FROM paciente WHERE dni=$1',
            [dni]
        );
        if (result.rowCount === 0) return res.send('Paciente no encontrado');

        const p = result.rows[0];
        const fecha = (p.fecha_nac instanceof Date)
            ? p.fecha_nac.toISOString().slice(0, 10)
            : p.fecha_nac;

        res.send(`
      <h1>Editar paciente ${p.dni}</h1>
      <form method="POST" action="/paciente/editar/${p.dni}">
        DNI: <input type="number" value="${p.dni}" disabled><br><br>
        Nombre: <input type="text" name="nombre" value="${p.nombre}" required><br><br>
        Apellido: <input type="text" name="apellido" value="${p.apellido}" required><br><br>
        Fecha de nacimiento: <input type="date" name="fecha_nac" value="${fecha}" required><br><br>
        Sexo:
        <select name="sexo" required>
          <option value="MASCULINO" ${p.sexo === 'MASCULINO' ? 'selected' : ''}>MASCULINO</option>
          <option value="FEMENINO" ${p.sexo === 'FEMENINO' ? 'selected' : ''}>FEMENINO</option>
        </select><br><br>
        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/paciente">Volver</a>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});
//EDITAR PACIENTE
app.post('/paciente/editar/:dni', async (req, res) => {
    const dni = Number(req.params.dni);
    const {nombre, apellido, fecha_nac, sexo} = req.body;
    try {
        await pool.query(
            `UPDATE paciente
             SET nombre=$1,
                 apellido=$2,
                 fecha_nac=$3,
                 sexo=$4
             WHERE dni = $5`,
            [nombre, apellido, fecha_nac, sexo, dni]
        );
        res.redirect('/paciente');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/paciente">Volver</a>`);
    }
});
//BORRAR PACIENTE
app.post('/paciente/borrar/:dni', async (req, res) => {
    const dni = Number(req.params.dni);
    try {
        await pool.query('DELETE FROM paciente WHERE dni=$1', [dni]);
        res.redirect('/paciente');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/paciente">Volver</a>`);
    }
});

//MEDICO
app.get('/medico', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT matricula,dni,nombre,apellido,cuil_cuit,fecha_ingreso FROM medico ORDER BY apellido,nombre'
        );
        const filas = result.rows.map((m: any) => `
      <tr>
        <td>${m.matricula}</td>
        <td>${m.dni}</td>
        <td>${m.apellido}</td>
        <td>${m.nombre}</td>
        <td>${m.cuil_cuit}</td>
        <td>${m.fecha_ingreso}</td>
        <td>
          <a href="/medico/editar/${m.matricula}">Editar</a>
          |
          <form method="POST" action="/medico/borrar/${m.matricula}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar médico?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Médicos</h1>
      <a href="/medico/nuevo">➕ Nuevo médico</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>Matrícula</th><th>DNI</th><th>Apellido</th><th>Nombre</th><th>CUIL/CUIT</th><th>Ingreso</th><th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="7">Sin médicos.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/medico/nuevo', (_req, res) => {
    res.send(`
    <h1>Nuevo médico</h1>
    <form method="POST" action="/medico/nuevo">
      Matrícula: <input type="number" name="matricula" required><br><br>
      DNI (debe existir en paciente): <input type="number" name="dni" required><br><br>
      Nombre: <input type="text" name="nombre" required><br><br>
      Apellido: <input type="text" name="apellido" required><br><br>
      CUIL/CUIT: <input type="number" name="cuil_cuit" required><br><br>
      Fecha ingreso: <input type="date" name="fecha_ingreso" required><br><br>
      <button type="submit">Guardar</button>
    </form>
    <br><a href="/medico">Volver</a>
  `);
});
//AGREGAR MEDICO
app.post('/medico/nuevo', async (req, res) => {
    const {matricula, dni, nombre, apellido, cuil_cuit, fecha_ingreso} = req.body;
    try {
        await pool.query(
            `INSERT INTO medico(matricula, dni, nombre, apellido, cuil_cuit, fecha_ingreso)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [Number(matricula), Number(dni), nombre, apellido, cuil_cuit, fecha_ingreso]
        );
        res.redirect('/medico');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/medico/nuevo">Volver</a>`);
    }
});

app.get('/medico/editar/:matricula', async (req, res) => {
    const matricula = Number(req.params.matricula);
    try {
        const result = await pool.query(
            'SELECT matricula,dni,nombre,apellido,cuil_cuit,fecha_ingreso FROM medico WHERE matricula=$1',
            [matricula]
        );
        if (result.rowCount === 0) return res.send('Médico no encontrado');

        const m = result.rows[0];
        const fecha = (m.fecha_ingreso instanceof Date)
            ? m.fecha_ingreso.toISOString().slice(0, 10)
            : m.fecha_ingreso;

        res.send(`
      <h1>Editar médico ${m.matricula}</h1>
      <form method="POST" action="/medico/editar/${m.matricula}">
        Matrícula: <input type="number" value="${m.matricula}" disabled><br><br>
        DNI: <input type="number" name="dni" value="${m.dni}" required><br><br>
        Nombre: <input type="text" name="nombre" value="${m.nombre}" required><br><br>
        Apellido: <input type="text" name="apellido" value="${m.apellido}" required><br><br>
        CUIL/CUIT: <input type="number" name="cuil_cuit" value="${m.cuil_cuit}" required><br><br>
        Fecha ingreso: <input type="date" name="fecha_ingreso" value="${fecha}" required><br><br>
        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/medico">Volver</a>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});
//ACTUALIZAR MEDICO
app.post('/medico/editar/:matricula', async (req, res) => {
    const matricula = Number(req.params.matricula);
    const {dni, nombre, apellido, cuil_cuit, fecha_ingreso} = req.body;
    try {
        await pool.query(
            `UPDATE medico
             SET dni=$1,
                 nombre=$2,
                 apellido=$3,
                 cuil_cuit=$4,
                 fecha_ingreso=$5
             WHERE matricula = $6`,
            [Number(dni), nombre, apellido, cuil_cuit, fecha_ingreso, matricula]
        );
        res.redirect('/medico');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/medico">Volver</a>`);
    }
});
//BORRAR MEDICO
app.post('/medico/borrar/:matricula', async (req, res) => {
    const matricula = Number(req.params.matricula);
    try {
        await pool.query('DELETE FROM medico WHERE matricula=$1', [matricula]);
        res.redirect('/medico');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/medico">Volver</a>`);
    }
});

//SECTOR
app.get('/sector', async (_req, res) => {
    try {
        const result = await pool.query('SELECT id_sector,tipo FROM sector ORDER BY id_sector');
        const filas = result.rows.map((s: any) => `
      <tr>
        <td>${s.id_sector}</td>
        <td>${s.tipo}</td>
        <td>
          <a href="/sector/editar/${s.id_sector}">Editar</a>
          |
          <form method="POST" action="/sector/borrar/${s.id_sector}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar sector?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');
        res.send(`
      <h1>Sectores</h1>
      <a href="/sector/nuevo">➕ Nuevo sector</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr><th>ID</th><th>Tipo</th><th>Acciones</th></tr>
        ${filas || '<tr><td colspan="3">Sin sectores.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/sector/nuevo', (_req, res) => {
    res.send(`
    <h1>Nuevo sector</h1>
    <form method="POST" action="/sector/nuevo">
      Tipo:
      <input type="text" name="tipo" required><br><br>
      <button type="submit">Guardar</button>
    </form>
    <br><a href="/sector">Volver</a>
  `);
});
//AGREGAR SECTOR
app.post('/sector/nuevo', async (req, res) => {
    const {tipo} = req.body;
    try {
        await pool.query('INSERT INTO sector(tipo) VALUES($1)', [tipo]);
        res.redirect('/sector');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/sector/nuevo">Volver</a>`);
    }
});

app.get('/sector/editar/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
        const result = await pool.query('SELECT id_sector,tipo FROM sector WHERE id_sector=$1', [id]);
        if (result.rowCount === 0) return res.send('Sector no encontrado');
        const s = result.rows[0];
        res.send(`
      <h1>Editar sector ${s.id_sector}</h1>
      <form method="POST" action="/sector/editar/${s.id_sector}">
        Tipo: <input type="text" name="tipo" value="${s.tipo}" required><br><br>
        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/sector">Volver</a>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});
//ACTUALIZAR SECTOR
app.post('/sector/editar/:id', async (req, res) => {
    const id = Number(req.params.id);
    const {tipo} = req.body;
    try {
        await pool.query('UPDATE sector SET tipo=$1 WHERE id_sector=$2', [tipo, id]);
        res.redirect('/sector');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/sector">Volver</a>`);
    }
});
//BORRAR SECTOR
app.post('/sector/borrar/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
        await pool.query('DELETE FROM sector WHERE id_sector=$1', [id]);
        res.redirect('/sector');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/sector">Volver</a>`);
    }
});

//HABITACION
app.get('/habitacion', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT h.num_habitacion, h.piso, h.orientacion, s.tipo AS sector
            FROM habitacion h
                     JOIN sector s ON s.id_sector = h.id_sector
            ORDER BY h.num_habitacion
        `);
        const filas = result.rows.map((h: any) => `
      <tr>
        <td>${h.num_habitacion}</td>
        <td>${h.piso}</td>
        <td>${h.orientacion}</td>
        <td>${h.sector}</td>
        <td>
          <a href="/habitacion/editar/${h.num_habitacion}">Editar</a>
          |
          <form method="POST" action="/habitacion/borrar/${h.num_habitacion}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar habitación?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');
        res.send(`
      <h1>Habitaciones</h1>
      <a href="/habitacion/nueva">➕ Nueva habitación</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr><th>N°</th><th>Piso</th><th>Orientación</th><th>Sector</th><th>Acciones</th></tr>
        ${filas || '<tr><td colspan="5">Sin habitaciones.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/habitacion/nueva', async (_req, res) => {
    try {
        const sectores = await pool.query('SELECT id_sector,tipo FROM sector ORDER BY id_sector');
        const options = sectores.rows.map((s: any) =>
            `<option value="${s.id_sector}">${s.id_sector} - ${s.tipo}</option>`
        ).join('');
        res.send(`
      <h1>Nueva habitación</h1>
      <form method="POST" action="/habitacion/nueva">
        Número de Habitación: <input type="number" name="num_habitacion" required><br><br>
        Piso: <input type="number" name="piso" required><br><br>
        Orientación:
        <select name="orientacion" required>
          <option value="NORTE">NORTE</option>
          <option value="SUR">SUR</option>
          <option value="ESTE">ESTE</option>
          <option value="OESTE">OESTE</option>
        </select><br><br>
        Sector:
        <select name="id_sector" required>
          ${options}
        </select><br><br>
        <button type="submit">Guardar</button>
      </form>
      <br><a href="/habitacion">Volver</a>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//AGREGAR HABITACION
app.post('/habitacion/nueva', async (req, res) => {
    const {num_habitacion, piso, orientacion, id_sector} = req.body;
    try {
        await pool.query(
            `INSERT INTO habitacion(num_habitacion, piso, orientacion, id_sector)
             VALUES ($1, $2, $3, $4)`,
            [Number(num_habitacion), Number(piso), orientacion, Number(id_sector)]
        );
        res.redirect('/habitacion');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/habitacion/nueva">Volver</a>`);
    }
});

//EDITAR HABITACION
app.get('/habitacion/editar/:num_habitacion', async (req, res) => {
    const num_habitacion = Number(req.params.num_habitacion);
    try {
        const habitacionResult = await pool.query(`
                    SELECT num_habitacion, piso, orientacion, id_sector
                    FROM habitacion
                    WHERE num_habitacion = $1`,
            [num_habitacion]
        );

        if (habitacionResult.rowCount === 0) {
            return res.send('Habitación no encontrada');
        }
        const h = habitacionResult.rows[0];

        const sectoresResult = await pool.query(`
            SELECT id_sector, tipo
            FROM sector
            ORDER BY id_sector`);

        const options = sectoresResult.rows.map((s: any) => {
            const isSelected = s.id_sector === h.id_sector ? 'selected' : '';
            return `<option value="${s.id_sector}" ${isSelected}>${s.id_sector} - ${s.tipo}</option>`;
        }).join('');

        res.send(`
      <h1>Editar habitación ${h.num_habitacion}</h1>
      <form method="POST" action="/habitacion/editar/${h.num_habitacion}">
        Número (No editable): <input type="number" value="${h.num_habitacion}" disabled><br><br>
        
        Piso: <input type="number" name="piso" value="${h.piso}" required><br><br>
        
        Orientación:
        <select name="orientacion" required>
          <option value="NORTE" ${h.orientacion === 'NORTE' ? 'selected' : ''}>NORTE</option>
          <option value="SUR" ${h.orientacion === 'SUR' ? 'selected' : ''}>SUR</option>
          <option value="ESTE" ${h.orientacion === 'ESTE' ? 'selected' : ''}>ESTE</option>
          <option value="OESTE" ${h.orientacion === 'OESTE' ? 'selected' : ''}>OESTE</option>
        </select><br><br>
        
        Sector:
        <select name="id_sector" required>
          ${options}
        </select><br><br>
        
        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/habitacion">Volver</a>
    `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//ACTUALIZAR HABITACION
app.post('/habitacion/editar/:num_habitacion', async (req, res) => {
    const num_habitacion = Number(req.params.num_habitacion);
    const {piso, orientacion, id_sector} = req.body;

    try {
        await pool.query(
            `UPDATE habitacion
             SET piso=$1,
                 orientacion=$2,
                 id_sector=$3
             WHERE num_habitacion = $4`,
            [Number(piso), orientacion, Number(id_sector), num_habitacion]
        );
        res.redirect('/habitacion');
    } catch (err: any) {
        res.status(400).send(`<h1>Error al actualizar</h1><pre>${err.message}</pre><a href="/habitacion">Volver</a>`);
    }
});

//BORRAR HABITACION
app.post('/habitacion/borrar/:num_habitacion', async (req, res) => {
    const num_habitacion = Number(req.params.num_habitacion);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM corresponde WHERE num_habitacion=$1', [num_habitacion]);

        await client.query('DELETE FROM cama WHERE num_habitacion=$1', [num_habitacion]);

        await client.query('DELETE FROM incluye WHERE num_habitacion=$1', [num_habitacion]);

        await client.query('DELETE FROM habitacion WHERE num_habitacion=$1', [num_habitacion]);

        await client.query('COMMIT');
        res.redirect('/habitacion');

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/habitacion">Volver</a>`);
    } finally {
        client.release();
    }
});

//CAMAS
app.get('/cama', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.num_habitacion, c.num_cama, c.estado
            FROM cama c
            ORDER BY c.num_habitacion, c.num_cama
        `);

        const filas = result.rows.map((c: any) => `
            <tr>
                <td>${c.num_habitacion}</td>
                <td>${c.num_cama}</td>
                <td>${c.estado}</td>
                <td>
                <a href="/cama/editar/${c.num_cama}/${c.num_habitacion}">Editar</a>
                |
                    <form method="POST" action="/cama/borrar/${c.num_cama}/${c.num_habitacion}" style="display:inline">
                        <button type="submit" onclick="return confirm('¿Borrar cama ${c.num_cama} de la habitación ${c.num_habitacion}?')">Borrar</button>
                    </form>
                </td>
            </tr>
        `).join('');

        res.send(`
            <h1>Gestión de Camas</h1>
            <a href="/cama/nueva">➕ Nueva Cama</a> | <a href="/">Inicio</a><br><br>
            <table border="1" cellpadding="5">
                <tr>
                    <th>Habitación</th>
                    <th>N° Cama</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="4">No hay camas registradas.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//NUEVA CAMA
app.get('/cama/nueva', async (_req, res) => {
    try {
        const habitacionResult = await pool.query('SELECT num_habitacion, piso, id_sector FROM habitacion ORDER BY num_habitacion');

        const opcionesHabitacion = habitacionResult.rows.map((h: any) =>
            `<option value="${h.num_habitacion}">Hab: ${h.num_habitacion} (Piso ${h.piso})</option>`
        ).join('');

        res.send(`
            <h1>Nueva Cama</h1>
            <form method="POST" action="/cama/nueva">
                
                <label>Seleccionar Habitación:</label><br>
                <select name="num_habitacion" required>
                    ${opcionesHabitacion}
                </select><br><br>

                <label>Número de Cama (dentro de la habitación):</label><br>
                <input type="number" name="num_cama" required min="1" placeholder="Ej: 1, 2, 3"><br><br>

                <label>Estado Inicial:</label><br>
                <select name="estado">
                    <option value="LIBRE">LIBRE</option>
                    <option value="OCUPADA">OCUPADA</option>
                </select><br><br>

                <button type="submit">Guardar Cama</button>
            </form>
            <br><a href="/cama">Volver</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//AGREGAR NUEVA CAMA
app.post('/cama/nueva', async (req, res) => {
    const {num_cama, num_habitacion, estado} = req.body;
    try {
        await pool.query(
            `INSERT INTO cama (num_cama, num_habitacion, estado)
             VALUES ($1, $2, $3)`,
            [Number(num_cama), Number(num_habitacion), estado]
        );
        res.redirect('/cama');
    } catch (err: any) {
        res.status(400).send(`
            <h1>Error al guardar</h1>
            <p>Es probable que ese número de cama ya exista en esa habitación.</p>
            <pre>${err.message}</pre>
            <a href="/cama/nueva">Volver</a>
        `);
    }
});

//EDITAR CAMA
app.get('/cama/editar/:num_cama/:num_habitacion', async (req, res) => {
    const num_cama = Number(req.params.num_cama);
    const num_habitacion = Number(req.params.num_habitacion);
    try {
        const result = await pool.query(`
                    SELECT num_cama, num_habitacion, estado
                    FROM cama
                    WHERE num_cama = $1
                      AND num_habitacion = $2`,
            [num_cama, num_habitacion]
        );
        if (result.rowCount === 0) return res.send('Cama no encontrada');
        const c = result.rows[0];

        res.send(`
            <h1>Editar Cama ${c.num_cama} (Hab: ${c.num_habitacion})</h1>
            <form method="POST" action="/cama/editar/${c.num_cama}/${c.num_habitacion}">
                Habitación: <input type="number" value="${c.num_habitacion}" disabled><br><br>
                N° Cama: <input type="number" value="${c.num_cama}" disabled><br><br>
                
                Estado:
                <select name="estado">
                    <option value="LIBRE" ${c.estado === 'LIBRE' ? 'selected' : ''}>LIBRE</option>
                    <option value="OCUPADA" ${c.estado === 'OCUPADA' ? 'selected' : ''}>OCUPADA</option>
                </select><br><br>

                <button type="submit">Guardar cambios</button>
            </form>
            <br><a href="/cama">Volver</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//ACTUALIZAR CAMA
app.post('/cama/editar/:num_cama/:num_habitacion', async (req, res) => {
    const num_cama = Number(req.params.num_cama);
    const num_habitacion = Number(req.params.num_habitacion);
    const {estado} = req.body;
    try {
        await pool.query(`UPDATE cama
                          SET estado=$1
                          WHERE num_cama = $2
                            AND num_habitacion = $3`,
            [estado, num_cama, num_habitacion]
        );
        res.redirect('/cama');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/cama">Volver</a>`);
    }
});

//BORRAR CAMA
app.post('/cama/borrar/:num_cama/:num_habitacion', async (req, res) => {
    const num_cama = Number(req.params.num_cama);
    const num_habitacion = Number(req.params.num_habitacion);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'DELETE FROM corresponde WHERE num_cama=$1 AND num_habitacion=$2',
            [num_cama, num_habitacion]
        );

        await client.query(
            'DELETE FROM cama WHERE num_cama=$1 AND num_habitacion=$2',
            [num_cama, num_habitacion]
        );

        await client.query('COMMIT');
        res.redirect('/cama');

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/cama">Volver</a>`);
    } finally {
        client.release();
    }
});

//ESPECIALIDAD
app.get('/especialidad', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id_especialidad, e.nombre
            FROM especialidad e
            ORDER BY e.id_especialidad
        `);

        const filas = result.rows.map((e: any) => `
            <tr>
                <td>${e.id_especialidad}</td>
                <td>${e.nombre}</td>
                <td>
                    <a href="/especialidad/editar/${e.id_especialidad}">Editar</a>
                    |
                    <form method="POST" action="/especialidad/borrar/${e.id_especialidad}" style="display:inline">
                        <button type="submit" onclick="return confirm('¿Borrar especialidad id:${e.id_especialidad}  nombre:${e.nombre}?')">Borrar</button>
                    </form>
                </td>
            </tr>
        `).join('');

        res.send(`
            <h1>Gestión de Especialidades</h1>
            <a href="/especialidad/nueva">➕ Nueva Especialidad</a> | <a href="/">Inicio</a><br><br>
            <table border="1" cellpadding="5">
                <tr>
                    <th>ID Especialidad</th>
                    <th>Nombre</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="2">No hay camas especialidades registradas.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//NUEVA ESPECIALIDAD
app.get('/especialidad/nueva', async (_req, res) => {
    try {
        res.send(`
            <h1>Nueva Especialidad</h1>
            <form method="POST" action="/especialidad/nueva">
            Nombre:
            <input type="text" name="nombre" required><br><br>
            <button type="submit">Guardar Especialidad</button>
            </form>
            <br><a href="/cama">Volver</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//AGREGAR NUEVA ESPECIALIDAD
app.post('/especialidad/nueva', async (req, res) => {
    const {nombre} = req.body;
    try {
        await pool.query(
            `INSERT INTO especialidad (nombre)
             VALUES ($1)`,
            [nombre]
        );
        res.redirect('/especialidad');
    } catch (err: any) {
        res.status(400).send(`
            <h1>Error al guardar</h1>
            <pre>${err.message}</pre>
            <a href="/especialidad/nueva">Volver</a>
        `);
    }
});

//EDITAR ESPECIALIDAD
app.get('/especialidad/editar/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
        const result = await pool.query(`
                    SELECT id_especialidad, nombre
                    FROM especialidad
                    WHERE id_especialidad = $1`,
            [id]);

        if (result.rowCount === 0) return res.send('Especialidad no encontrada');
        const e = result.rows[0];

        res.send(`
            <h1>Editar Especialidad ${e.id_especialidad}</h1>
            <form method="POST" action="/especialidad/editar/${e.id_especialidad}">
                Nombre: <input type="text" name="nombre" value="${e.nombre}" required><br><br>
                <button type="submit">Guardar cambios</button>
            </form>
            <br><a href="/especialidad">Volver</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//ACTUALIZAR ESPECIALIDAD
app.post('/especialidad/editar/:id', async (req, res) => {
    const id = Number(req.params.id);
    const {nombre} = req.body;
    try {
        await pool.query('' +
            'UPDATE especialidad ' +
            'SET nombre=$1 ' +
            'WHERE id_especialidad=$2', [nombre, id]);

        res.redirect('/especialidad');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/especialidad">Volver</a>`);
    }
});

/**
 * Se podria usar un ON DELETE CASCADE en las claves foraneas de la BD?
 * No se si es recomendado hacerlo pero vi que se puede hacer asi tambien
 * en vez de escribir siempre tanto codigo manual
 * (Aunque en general se utiliza un flag de activo/inactivo)
 */
//BORRAR ESPECIALIDAD
app.post('/especialidad/borrar/:id_especialidad', async (req, res) => {
    const id_especialidad = Number(req.params.id_especialidad);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'DELETE FROM asignacion_guardia WHERE id_especialidad=$1',
            [id_especialidad]
        );

        await client.query(
            'DELETE FROM especializado_en WHERE id_especialidad=$1',
            [id_especialidad]
        );

        await client.query(
            'DELETE FROM especialidad WHERE id_especialidad=$1',
            [id_especialidad]
        );

        await client.query('COMMIT');
        res.redirect('/especialidad');

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/especialidad">Volver</a>`);
    } finally {
        client.release();
    }
});

//ESPECIALIZADO_EN
app.get('/especializado_en', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT en.id_especialidad,
                   en.matricula,
                   en.realiza_guardia,
                   en.max_guardia,
                   es.nombre  as nombre_especialidad,
                   m.nombre   as nombre_medico,
                   m.apellido as apellido_medico
            FROM especializado_en en
                     JOIN medico m ON en.matricula = m.matricula
                     JOIN especialidad es ON en.id_especialidad = es.id_especialidad
            ORDER BY en.id_especialidad
        `);

        const filas = result.rows.map((en: any) => `
            <tr>
                <td>${en.id_especialidad}</td>
                <td>
                    <b>${en.nombre_especialidad}</b> <br>
                    <small>Dr. ${en.nombre_medico} ${en.apellido_medico}</small>
                </td>
                <td>${en.realiza_guardia ? 'SI' : 'NO'}</td>
                <td>${en.max_guardia}</td>
                <td>
                    <a href="/especializado_en/editar/${en.id_especialidad}/${en.matricula}">Editar</a>
                    |
                    <form method="POST" action="/especializado_en/borrar/${en.id_especialidad}/${en.matricula}" style="display:inline">
                        <button type="submit" onclick="return confirm('¿Borrar especialidado_en id:${en.id_especialidad}  nombre:${en.nombre_medico} matricula:${en.matricula}?')">Borrar</button>
                    </form>
                </td>
            </tr>
        `).join('');

        res.send(`
            <h1>Gestión de Especialidades x Médico</h1>
            <a href="/especializado_en/nueva">➕ Nueva Especialidad x Médico</a> | <a href="/">Inicio</a><br><br>
            <table border="1" cellpadding="5">
                <tr>
                    <th>ID Especialidad</th>
                    <th>Detalle (Especialidad / Médico)</th>
                    <th>Realiza Guardia?</th>
                    <th>Cantidad Máxima</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="2">No hay registros.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//NUEVA ESPECIALIZADO_EN
app.get('/especializado_en/nueva', async (_req, res) => {
    try {
        res.send(`
    <h1>Nueva Especialidad</h1>
    <form method="POST" action="/especializado_en/nueva">
        ID Especialidad:
        <input type="text" name="id_especialidad" required autofocus><br><br>
        
        Matrícula:
        <input type="text" name="matricula" required><br><br>
        
        Realiza Guardia:
        <input type="checkbox" id="check_guardia" name="realiza_guardia"><br><br>
        
        Cantidad Máxima de Guardias:
        <input type="number" id="input_max" name="max_guardia" required disabled><br><br>
        
        <button type="submit">Guardar Especialidad x Médico</button>
    </form>
    <br><a href="/especializado_en">Volver</a>

    <script>
        const checkbox = document.getElementById('check_guardia');
        const inputMax = document.getElementById('input_max');

        checkbox.addEventListener('change', function() {
            inputMax.disabled = !this.checked;

            if (!this.checked) {
                inputMax.value = "";
            }
        });
    </script>
`);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//AGREGAR NUEVA ESPECIALIZADO_EN
app.post('/especializado_en/nueva', async (req, res) => {
    const {id_especialidad, matricula, realiza_guardia, max_guardia} = req.body;

    const haceGuardia = !!realiza_guardia;
    const max = haceGuardia ? max_guardia : 0;
    try {
        await pool.query(
            `INSERT INTO especializado_en (id_especialidad, matricula, realiza_guardia, max_guardia)
             VALUES ($1, $2, $3, $4)`,
            [id_especialidad, matricula, haceGuardia, max]
        );
        res.redirect('/especializado_en');
    } catch (err: any) {
        res.status(400).send(`
            <h1>Error al guardar</h1>
            <pre>${err.message}</pre>
            <a href="/especializado_en/nueva">Volver</a>
        `);
    }
});

//EDITAR ESPECIALIZADO_EN
app.get('/especializado_en/editar/:id_esp/:matricula', async (req, res) => {
    const id_esp = Number(req.params.id_esp);
    const matricula = Number(req.params.matricula);

    try {
        const result = await pool.query(`
                    SELECT *
                    FROM especializado_en
                    WHERE id_especialidad = $1
                      AND matricula = $2`,
            [id_esp, matricula]
        );

        if (result.rowCount === 0) return res.send('Registro no encontrado');
        const r = result.rows[0];

        res.send(`
            <h1>Editar Especialidad x Médico</h1>
            <form method="POST" action="/especializado_en/editar/${id_esp}/${matricula}">
                ID Especialidad: <input type="text" value="${r.id_especialidad}" disabled><br><br>
                Matrícula: <input type="text" value="${r.matricula}" disabled><br><br>
                
                Realiza Guardia:
                <input type="checkbox" id="check_guardia" name="realiza_guardia" ${r.realiza_guardia ? 'checked' : ''}><br><br>
                
                Cantidad Máxima de Guardias:
                <input type="number" id="input_max" name="max_guardia" value="${r.max_guardia}" ${!r.realiza_guardia ? 'disabled' : ''}><br><br>
                
                <button type="submit">Guardar cambios</button>
            </form>
            <br><a href="/especializado_en">Volver</a>

            <script>
                const checkbox = document.getElementById('check_guardia');
                const inputMax = document.getElementById('input_max');
                checkbox.addEventListener('change', function() {
                    inputMax.disabled = !this.checked;
                    if (!this.checked) inputMax.value = 0;
                });
            </script>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//ACTUALIZAR ESPECIALIZADO_EN
app.post('/especializado_en/editar/:id_esp/:matricula', async (req, res) => {
    const id_esp = Number(req.params.id_esp);
    const matricula = Number(req.params.matricula);
    const {realiza_guardia, max_guardia} = req.body;

    const haceGuardia = !!realiza_guardia;
    const max = haceGuardia ? Number(max_guardia) : 0;

    try {
        await pool.query(
            `UPDATE especializado_en
             SET realiza_guardia=$1,
                 max_guardia=$2
             WHERE id_especialidad = $3
               AND matricula = $4`,
            [haceGuardia, max, id_esp, matricula]
        );
        res.redirect('/especializado_en');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/especializado_en">Volver</a>`);
    }
});

//BORRAR ESPECIALIZADO_EN
app.post('/especializado_en/borrar/:id_especialidad/:matricula', async (req, res) => {
    const id_especialidad = Number(req.params.id_especialidad);
    const matricula = Number(req.params.matricula);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'DELETE FROM asignacion_guardia WHERE id_especialidad=$1 and matricula=$2',
            [id_especialidad, matricula]
        );

        await client.query(
            'DELETE FROM especializado_en WHERE id_especialidad=$1 AND matricula=$2',
            [id_especialidad, matricula]
        );

        await client.query('COMMIT');
        res.redirect('/especializado_en');

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/especializado_en">Volver</a>`);
    } finally {
        client.release();
    }
});

//GUARDIA
app.get('/guardia', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT g.id_guardia, g.tipo_guardia
            FROM guardia g
            ORDER BY g.id_guardia
        `);

        const filas = result.rows.map((f: any) => `
            <tr>
                <td>${f.id_guardia}</td>
                <td>${f.tipo_guardia}</td>
                <td>
                    <form method="POST" action="/guardia/borrar/${f.id_guardia}" style="display:inline">
                        <button type="submit" onclick="return confirm('¿Borrar guardia id:${f.id_guardia}  tipo:${f.tipo_guardia} ?')">Borrar</button>
                    </form>
                </td>
            </tr>
        `).join('');

        res.send(`
            <h1>Gestión de Guardias</h1>
            <a href="/guardia/nueva">➕ Nueva Guardia</a> | <a href="/">Inicio</a><br><br>
            <table border="1" cellpadding="5">
                <tr>
                    <th>ID Guardia</th>
                    <th>Tipo Guardia</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="2">No hay registros.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//NUEVA GUARDIA
app.get('/guardia/nueva', async (_req, res) => {
    try {
        res.send(`
    <h1>Nueva Guardia</h1>
    <form method="POST" action="/guardia/nueva">
        Tipo Guardia:
        <select name="tipo_guardia" required>
            <option value="MATUTINO">MATUTINO</option>
            <option value="VESPERTINO">VESPERTINO</option>
            <option value="NOCTURNO">NOCTURNO</option>
        </select> <br><br>
        
        <button type="submit">Guardar Guardia</button>
    </form>
    <br><a href="/guardia">Volver</a>
`);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//AGREGAR NUEVA GUARDIA
app.post('/guardia/nueva', async (req, res) => {
    const {tipo_guardia} = req.body;

    try {
        await pool.query(
            `INSERT INTO guardia (tipo_guardia)
             VALUES ($1)`,
            [tipo_guardia]
        );
        res.redirect('/guardia');
    } catch (err: any) {
        res.status(400).send(`
            <h1>Error al guardar</h1>
            <pre>${err.message}</pre>
            <a href="/guardia/nueva">Volver</a>
        `);
    }
});

//BORRAR ESPECIALIZADO_EN
app.post('/guardia/borrar/:id_guardia', async (req, res) => {
    const id_guardia = Number(req.params.id_guardia);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'DELETE FROM asignacion_guardia WHERE id_guardia=$1',
            [id_guardia]
        );

        await client.query(
            'DELETE FROM guardia WHERE id_guardia=$1 ',
            [id_guardia]
        );

        await client.query('COMMIT');
        res.redirect('/guardia');

    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/guardia">Volver</a>`);
    } finally {
        client.release();
    }
});

//ASIGNACION_GUARDIA
app.get('/asignacion_guardia', async (_req, res) => {
    try {
        const result = await pool.query(`
  			SELECT ag.id_guardia,
         		ag.matricula,
         		ag.fecha,
         		gu.tipo_guardia,
         		m.apellido,
         		m.nombre,
         		e.nombre AS nombre_esp
  			FROM asignacion_guardia ag
  			JOIN medico       m  ON ag.matricula      = m.matricula
  			JOIN guardia      gu ON ag.id_guardia     = gu.id_guardia
  			JOIN especialidad e  ON ag.id_especialidad = e.id_especialidad
  			ORDER BY ag.fecha, ag.id_guardia, m.apellido
		`);

        const filas = result.rows.map((f: any) => `
  <tr>
    <td>${f.fecha}</td>
    <td>${f.id_guardia} - ${f.tipo_guardia}</td>
    <td>Dr. <b>${f.apellido}</b>, ${f.nombre} <small>(Mat: ${f.matricula})</small></td>
    <td>${f.nombre_esp}</td>
    <td>
      <form method="POST" action="/asignacion_guardia/borrar/${f.id_guardia}/${f.matricula}/${f.fecha}" style="display:inline">
        <button type="submit" onclick="return confirm('¿Seguro que querés borrar la guardia ${f.id_guardia} del día ${f.fecha} para la matrícula ${f.matricula}?')">Borrar</button>
      </form>
    </td>
  </tr>
`).join('');


        res.send(`
            <h1>Gestión de Asignación de Guardias</h1>
            <a href="/asignacion_guardia/nueva">➕ Nueva Asignación de Guardia</a> | <a href="/">Inicio</a><br><br>
            <table border="1" cellpadding="5">
                <tr>
                    <th>Guardia</th>
                    <th>Médico</th>
                    <th>Especialidad</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="4">No hay asignaciones.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//NUEVA GUARDIA
app.get('/asignacion_guardia/nueva', async (_req, res) => {
    res.send(`
    <h1>Nueva Asignación de Guardia</h1>
    <form method="POST" action="/asignacion_guardia/nueva">
      ID Guardia:
      <input type="number" name="id_guardia" required><br><br>

      Matrícula:
      <input type="number" name="matricula" required><br><br>

      ID Especialidad:
      <input type="number" name="id_especialidad" required><br><br>

      Fecha:
      <input type="date" name="fecha" required><br><br>

      <button type="submit">Guardar Asignación de Guardia</button>
    </form>
    <br><a href="/asignacion_guardia">Volver</a>
  `);
});

//AGREGAR NUEVA ASIGNACION DE GUARDIA
app.post('/asignacion_guardia/nueva', async (req, res) => {
    const {id_guardia, matricula, id_especialidad, fecha} = req.body;

    try {
        await pool.query(
            `INSERT INTO asignacion_guardia (id_guardia, matricula, id_especialidad, fecha)
       VALUES ($1, $2, $3, $4)`,
            [Number(id_guardia), Number(matricula), Number(id_especialidad), fecha]
        );
        res.redirect('/asignacion_guardia');
    } catch (err: any) {
        res.status(400).send(`
      <h1>Error al guardar asignación</h1>
      <pre>${err.message}</pre>
      <a href="/asignacion_guardia/nueva">Volver</a>
    `);
    }
});


//BORRAR asignacion_guardia
app.post('/asignacion_guardia/borrar/:id_guardia/:matricula/:fecha', async (req, res) => {
    const id_guardia = Number(req.params.id_guardia);
    const matricula  = Number(req.params.matricula);
    const fecha      = req.params.fecha; // viene como 'YYYY-MM-DD'

    try {
        await pool.query(
            'DELETE FROM asignacion_guardia WHERE id_guardia=$1 AND matricula=$2 AND fecha=$3',
            [id_guardia, matricula, fecha]
        );
        res.redirect('/asignacion_guardia');
    } catch (err: any) {
        res.status(400).send(`<h1>Error</h1><pre>${err.message}</pre><a href=" asignacion_guardia">Volver</a>`);
    }
});


// LISTADO DE INTERNACIONES
app.get('/internacion', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `
      SELECT 
        i.id_internacion,
        i.fecha_inicio,
        i.fecha_fin,
        m.matricula,
        m.apellido AS apellido_medico,
        m.nombre   AS nombre_medico,
        p.dni,
        p.apellido AS apellido_paciente,
        p.nombre   AS nombre_paciente
      FROM internacion i
      JOIN medico m   ON m.matricula = i.matricula
      JOIN paciente p ON p.dni = i.dni
      ORDER BY i.id_internacion;
      `
        );

        const filas = result.rows.map((i: any) => `
      <tr>
        <td>${i.id_internacion}</td>
        <td>${i.fecha_inicio}</td>
        <td>${i.fecha_fin ?? ''}</td>
        <td>${i.matricula} - ${i.apellido_medico}, ${i.nombre_medico}</td>
        <td>${i.dni} - ${i.apellido_paciente}, ${i.nombre_paciente}</td>
        <td>
          <a href="/internacion/editar/${i.id_internacion}">Editar</a>
          |
          <a href="/internacion/seguimiento/${i.id_internacion}">Ver seguimiento</a>
          |
          <form method="POST" action="/internacion/borrar/${i.id_internacion}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar internación?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Internaciones</h1>
      <a href="/internacion/nueva">➕ Nueva internación</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID</th>
          <th>Fecha inicio</th>
          <th>Fecha fin</th>
          <th>Médico principal</th>
          <th>Paciente</th>
          <th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="6">Sin internaciones.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// FORMULARIO NUEVA INTERNACION
app.get('/internacion/nueva', async (_req: Request, res: Response) => {
    try {
        const medicos = await pool.query(
            'SELECT matricula, apellido, nombre FROM medico ORDER BY apellido, nombre'
        );
        const pacientes = await pool.query(
            'SELECT dni, apellido, nombre FROM paciente ORDER BY apellido, nombre'
        );

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}">${m.matricula} - ${m.apellido}, ${m.nombre}</option>`
        ).join('');

        const opcionesPaciente = pacientes.rows.map((p: any) =>
            `<option value="${p.dni}">${p.dni} - ${p.apellido}, ${p.nombre}</option>`
        ).join('');

        res.send(`
      <h1>Nueva internación</h1>
      <form method="POST" action="/internacion/nueva">
        <label>Fecha inicio:</label><br>
        <input type="date" name="fecha_inicio" required><br><br>

        <label>Fecha fin (opcional):</label><br>
        <input type="date" name="fecha_fin"><br><br>

        <label>Médico principal:</label><br>
        <select name="matricula" required>
          <option value="">-- Seleccionar médico --</option>
          ${opcionesMedico}
        </select><br><br>

        <label>Paciente:</label><br>
        <select name="dni" required>
          <option value="">-- Seleccionar paciente --</option>
          ${opcionesPaciente}
        </select><br><br>

        <button type="submit">Guardar</button>
      </form>
      <br><a href="/internacion">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// ALTA INTERNACION
app.post('/internacion/nueva', async (req: Request, res: Response) => {
    const { fecha_inicio, fecha_fin, matricula, dni } = req.body;
    try {
        const fechaFinValue = fecha_fin && fecha_fin !== '' ? fecha_fin : null;

        await pool.query(
            `
      INSERT INTO internacion (fecha_inicio, fecha_fin, matricula, dni)
      VALUES ($1, $2, $3, $4)
      `,
            [fecha_inicio, fechaFinValue, Number(matricula), Number(dni)]
        );

        res.redirect('/internacion');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al guardar internación</h1>
      <pre>${err.message}</pre>
      <a href="/internacion/nueva">Volver</a>
    `);
    }
});

// FORMULARIO EDITAR INTERNACION
app.get('/internacion/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        // Traigo la internación
        const intResult = await pool.query(
            `
      SELECT id_internacion, fecha_inicio, fecha_fin, matricula, dni
      FROM internacion
      WHERE id_internacion = $1
      `,
            [id]
        );

        if (intResult.rowCount === 0) {
            return res.status(404).send('<h1>Internación no encontrada</h1><a href="/internacion">Volver</a>');
        }

        const i = intResult.rows[0];

        const fechaInicio = i.fecha_inicio instanceof Date
            ? i.fecha_inicio.toISOString().slice(0, 10)
            : i.fecha_inicio;

        const fechaFin = i.fecha_fin instanceof Date
            ? i.fecha_fin.toISOString().slice(0, 10)
            : (i.fecha_fin || '');

        // combos médico y paciente
        const medicos = await pool.query(
            'SELECT matricula, apellido, nombre FROM medico ORDER BY apellido, nombre'
        );
        const pacientes = await pool.query(
            'SELECT dni, apellido, nombre FROM paciente ORDER BY apellido, nombre'
        );

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}" ${m.matricula === i.matricula ? 'selected' : ''}>
        ${m.matricula} - ${m.apellido}, ${m.nombre}
      </option>`
        ).join('');

        const opcionesPaciente = pacientes.rows.map((p: any) =>
            `<option value="${p.dni}" ${p.dni === i.dni ? 'selected' : ''}>
        ${p.dni} - ${p.apellido}, ${p.nombre}
      </option>`
        ).join('');

        res.send(`
      <h1>Editar internación ${i.id_internacion}</h1>
      <form method="POST" action="/internacion/editar/${i.id_internacion}">
        <label>ID:</label><br>
        <input type="number" value="${i.id_internacion}" disabled><br><br>

        <label>Fecha inicio:</label><br>
        <input type="date" name="fecha_inicio" value="${fechaInicio}" required><br><br>

        <label>Fecha fin (opcional):</label><br>
        <input type="date" name="fecha_fin" value="${fechaFin}"><br><br>

        <label>Médico principal:</label><br>
        <select name="matricula" required>
          ${opcionesMedico}
        </select><br><br>

        <label>Paciente:</label><br>
        <select name="dni" required>
          ${opcionesPaciente}
        </select><br><br>

        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/internacion">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// GUARDAR EDICION INTERNACION
app.post('/internacion/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { fecha_inicio, fecha_fin, matricula, dni } = req.body;
    try {
        const fechaFinValue = fecha_fin && fecha_fin !== '' ? fecha_fin : null;

        await pool.query(
            `
      UPDATE internacion
      SET fecha_inicio = $1,
          fecha_fin    = $2,
          matricula    = $3,
          dni          = $4
      WHERE id_internacion = $5
      `,
            [fecha_inicio, fechaFinValue, Number(matricula), Number(dni), id]
        );

        res.redirect('/internacion');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al actualizar internación</h1>
      <pre>${err.message}</pre>
      <a href="/internacion">Volver</a>
    `);
    }
});

// BORRAR INTERNACION
app.post('/internacion/borrar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await pool.query('DELETE FROM internacion WHERE id_internacion = $1', [id]);
        res.redirect('/internacion');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al borrar internación</h1>
      <p>Probablemente haya registros relacionados (corresponde, comentario_recorrido, etc.).</p>
      <pre>${err.message}</pre>
      <a href="/internacion">Volver</a>
    `);
    }
});

/* ========== PERIODO_VACACIONES ========== */

// Listado
app.get('/periodo_vacaciones', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id_periodo_vacaciones, fecha_inicio, fecha_fin FROM periodo_vacaciones ORDER BY id_periodo_vacaciones'
        );

        const filas = result.rows.map((v: any) => `
      <tr>
        <td>${v.id_periodo_vacaciones}</td>
        <td>${v.fecha_inicio}</td>
        <td>${v.fecha_fin}</td>
        <td>
          <a href="/periodo_vacaciones/editar/${v.id_periodo_vacaciones}">Editar</a>
          |
          <form method="POST" action="/periodo_vacaciones/borrar/${v.id_periodo_vacaciones}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar periodo de vacaciones?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Períodos de vacaciones</h1>
      <a href="/periodo_vacaciones/nuevo">➕ Nuevo período</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID</th><th>Fecha inicio</th><th>Fecha fin</th><th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="4">Sin períodos cargados.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// Form nuevo
app.get('/periodo_vacaciones/nuevo', (_req: Request, res: Response) => {
    res.send(`
    <h1>Nuevo período de vacaciones</h1>
    <form method="POST" action="/periodo_vacaciones/nuevo">
      <label>Fecha inicio:</label><br>
      <input type="date" name="fecha_inicio" required><br><br>
      <label>Fecha fin:</label><br>
      <input type="date" name="fecha_fin" required><br><br>
      <button type="submit">Guardar</button>
    </form>
    <br><a href="/periodo_vacaciones">Volver</a>
  `);
});

// Alta
app.post('/periodo_vacaciones/nuevo', async (req: Request, res: Response) => {
    const { fecha_inicio, fecha_fin } = req.body;
    try {
        await pool.query(
            `INSERT INTO periodo_vacaciones (fecha_inicio, fecha_fin)
       VALUES ($1, $2)`,
            [fecha_inicio, fecha_fin]
        );
        res.redirect('/periodo_vacaciones');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al guardar período</h1>
      <pre>${err.message}</pre>
      <a href="/periodo_vacaciones/nuevo">Volver</a>
    `);
    }
});

// Form editar
app.get('/periodo_vacaciones/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const result = await pool.query(
            `SELECT id_periodo_vacaciones, fecha_inicio, fecha_fin
       FROM periodo_vacaciones
       WHERE id_periodo_vacaciones = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>Período no encontrado</h1><a href="/periodo_vacaciones">Volver</a>');
        }

        const v = result.rows[0];

        const fechaInicio = v.fecha_inicio instanceof Date
            ? v.fecha_inicio.toISOString().slice(0, 10)
            : v.fecha_inicio;

        const fechaFin = v.fecha_fin instanceof Date
            ? v.fecha_fin.toISOString().slice(0, 10)
            : v.fecha_fin;

        res.send(`
      <h1>Editar período ${v.id_periodo_vacaciones}</h1>
      <form method="POST" action="/periodo_vacaciones/editar/${v.id_periodo_vacaciones}">
        ID: <input type="number" value="${v.id_periodo_vacaciones}" disabled><br><br>
        <label>Fecha inicio:</label><br>
        <input type="date" name="fecha_inicio" value="${fechaInicio}" required><br><br>
        <label>Fecha fin:</label><br>
        <input type="date" name="fecha_fin" value="${fechaFin}" required><br><br>
        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/periodo_vacaciones">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// Guardar edición
app.post('/periodo_vacaciones/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { fecha_inicio, fecha_fin } = req.body;
    try {
        await pool.query(
            `UPDATE periodo_vacaciones
       SET fecha_inicio = $1, fecha_fin = $2
       WHERE id_periodo_vacaciones = $3`,
            [fecha_inicio, fecha_fin, id]
        );
        res.redirect('/periodo_vacaciones');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al actualizar período</h1>
      <pre>${err.message}</pre>
      <a href="/periodo_vacaciones">Volver</a>
    `);
    }
});

// Borrar
app.post('/periodo_vacaciones/borrar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await pool.query(
            'DELETE FROM periodo_vacaciones WHERE id_periodo_vacaciones = $1',
            [id]
        );
        res.redirect('/periodo_vacaciones');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al borrar período</h1>
      <p>Probablemente haya médicos asignados a este período (tabla tiene).</p>
      <pre>${err.message}</pre>
      <a href="/periodo_vacaciones">Volver</a>
    `);
    }
});

/* ========== TIENE (médico ↔ período_vacaciones) ========== */

// Listado
app.get('/tiene', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `
      SELECT 
        t.id_periodo_vacaciones,
        t.matricula,
        m.apellido AS apellido_medico,
        m.nombre   AS nombre_medico,
        pv.fecha_inicio,
        pv.fecha_fin
      FROM tiene t
      JOIN medico m ON m.matricula = t.matricula
      JOIN periodo_vacaciones pv ON pv.id_periodo_vacaciones = t.id_periodo_vacaciones
      ORDER BY pv.fecha_inicio, m.apellido, m.nombre;
      `
        );

        const filas = result.rows.map((r: any) => `
      <tr>
        <td>${r.id_periodo_vacaciones}</td>
        <td>${r.fecha_inicio} → ${r.fecha_fin}</td>
        <td>${r.matricula} - ${r.apellido_medico}, ${r.nombre_medico}</td>
        <td>
          <form method="POST" action="/tiene/borrar" style="display:inline">
            <input type="hidden" name="id_periodo_vacaciones" value="${r.id_periodo_vacaciones}">
            <input type="hidden" name="matricula" value="${r.matricula}">
            <button type="submit" onclick="return confirm('¿Quitar este período de vacaciones del médico?')">
              Quitar
            </button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Asignación de períodos de vacaciones a médicos</h1>
      <a href="/tiene/nuevo">➕ Asignar vacaciones a médico</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID período</th>
          <th>Rango de fechas</th>
          <th>Médico</th>
          <th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="4">Sin asignaciones.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// Form nuevo (asignar vacaciones a un médico)
app.get('/tiene/nuevo', async (_req: Request, res: Response) => {
    try {
        const medicos = await pool.query(
            'SELECT matricula, apellido, nombre FROM medico ORDER BY apellido, nombre'
        );
        const periodos = await pool.query(
            'SELECT id_periodo_vacaciones, fecha_inicio, fecha_fin FROM periodo_vacaciones ORDER BY fecha_inicio'
        );

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}">${m.matricula} - ${m.apellido}, ${m.nombre}</option>`
        ).join('');

        const opcionesPeriodo = periodos.rows.map((p: any) =>
            `<option value="${p.id_periodo_vacaciones}">
        ${p.id_periodo_vacaciones} - ${p.fecha_inicio} → ${p.fecha_fin}
      </option>`
        ).join('');

        res.send(`
      <h1>Asignar período de vacaciones a médico</h1>
      <form method="POST" action="/tiene/nuevo">
        <label>Médico:</label><br>
        <select name="matricula" required>
          <option value="">-- Seleccionar médico --</option>
          ${opcionesMedico}
        </select><br><br>

        <label>Período de vacaciones:</label><br>
        <select name="id_periodo_vacaciones" required>
          <option value="">-- Seleccionar período --</option>
          ${opcionesPeriodo}
        </select><br><br>

        <button type="submit">Guardar</button>
      </form>
      <br><a href="/tiene">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// Alta en tiene
app.post('/tiene/nuevo', async (req: Request, res: Response) => {
    const { id_periodo_vacaciones, matricula } = req.body;
    try {
        await pool.query(
            `
      INSERT INTO tiene (id_periodo_vacaciones, matricula)
      VALUES ($1, $2)
      `,
            [Number(id_periodo_vacaciones), Number(matricula)]
        );
        res.redirect('/tiene');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al asignar vacaciones</h1>
      <p>Puede ser que ya exista esa combinación (PK compuesta) o que no existan el médico o el período.</p>
      <pre>${err.message}</pre>
      <a href="/tiene/nuevo">Volver</a>
    `);
    }
});

// Borrar una asignación (tiene)
app.post('/tiene/borrar', async (req: Request, res: Response) => {
    const id_periodo_vacaciones = Number(req.body.id_periodo_vacaciones);
    const matricula = Number(req.body.matricula);

    try {
        await pool.query(
            `
      DELETE FROM tiene
      WHERE id_periodo_vacaciones = $1
        AND matricula = $2
      `,
            [id_periodo_vacaciones, matricula]
        );
        res.redirect('/tiene');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al quitar asignación</h1>
      <pre>${err.message}</pre>
      <a href="/tiene">Volver</a>
    `);
    }
});

/* ========== RONDA ========== */

// LISTADO DE RONDAS
app.get('/ronda', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id_ronda, dia, turno FROM ronda ORDER BY id_ronda'
        );

        const filas = result.rows.map((r: any) => `
      <tr>
        <td>${r.id_ronda}</td>
        <td>${r.dia}</td>
        <td>${r.turno}</td>
        <td>
          <a href="/ronda/editar/${r.id_ronda}">Editar</a>
          |
          <form method="POST" action="/ronda/borrar/${r.id_ronda}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar ronda?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Rondas</h1>
      <a href="/ronda/nueva">➕ Nueva ronda</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID</th><th>Día</th><th>Turno</th><th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="4">Sin rondas.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// FORM NUEVA RONDA
app.get('/ronda/nueva', (_req: Request, res: Response) => {
    res.send(`
    <h1>Nueva ronda</h1>
    <form method="POST" action="/ronda/nueva">
		<label>Día de la semana:</label><br>
		<select name="dia" required>
  			<option value="">-- Seleccionar --</option>
  			<option value="lunes">Lunes</option>
  			<option value="martes">Martes</option>
  			<option value="miercoles">Miércoles</option>
  			<option value="jueves">Jueves</option>
  			<option value="viernes">Viernes</option>
  			<option value="sabado">Sábado</option>
  			<option value="domingo">Domingo</option>
		</select>
	  <br><br>

      <label>Turno:</label><br>
      <select name="turno" required>
        <option value="1er TURNO">1er TURNO</option>
        <option value="2do TURNO">2do TURNO</option>
        <option value="3er TURNO">3er TURNO</option>
      </select><br><br>

      <button type="submit">Guardar</button>
    </form>
    <br><a href="/ronda">Volver</a>
  `);
});

// ALTA RONDA
app.post('/ronda/nueva', async (req: Request, res: Response) => {
    const { dia, turno } = req.body;
    try {
        await pool.query(
            `INSERT INTO ronda (dia, turno) VALUES ($1, $2)`,
            [dia, turno]
        );
        res.redirect('/ronda');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al guardar ronda</h1>
      <pre>${err.message}</pre>
      <a href="/ronda/nueva">Volver</a>
    `);
    }
});

// FORM EDITAR RONDA
app.get('/ronda/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const result = await pool.query(
            'SELECT id_ronda, dia, turno FROM ronda WHERE id_ronda = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>Ronda no encontrada</h1><a href="/ronda">Volver</a>');
        }

        const r = result.rows[0];

        res.send(`
      <h1>Editar ronda ${r.id_ronda}</h1>
      <form method="POST" action="/ronda/editar/${r.id_ronda}">
        ID: <input type="number" value="${r.id_ronda}" disabled><br><br>

        <label>Día de la semana:</label><br>
<select name="dia" required>
  <option value="lunes" ${r.dia === 'lunes' ? 'selected' : ''}>Lunes</option>
  <option value="martes" ${r.dia === 'martes' ? 'selected' : ''}>Martes</option>
  <option value="miercoles" ${r.dia === 'miercoles' ? 'selected' : ''}>Miércoles</option>
  <option value="jueves" ${r.dia === 'jueves' ? 'selected' : ''}>Jueves</option>
  <option value="viernes" ${r.dia === 'viernes' ? 'selected' : ''}>Viernes</option>
  <option value="sabado" ${r.dia === 'sabado' ? 'selected' : ''}>Sábado</option>
  <option value="domingo" ${r.dia === 'domingo' ? 'selected' : ''}>Domingo</option>
</select><br><br>

        <label>Turno:</label><br>
        <select name="turno" required>
          <option value="1er TURNO" ${r.turno === '1er TURNO' ? 'selected' : ''}>1er TURNO</option>
          <option value="2do TURNO" ${r.turno === '2do TURNO' ? 'selected' : ''}>2do TURNO</option>
          <option value="3er TURNO" ${r.turno === '3er TURNO' ? 'selected' : ''}>3er TURNO</option>
        </select><br><br>

        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/ronda">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// GUARDAR EDICIÓN RONDA
app.post('/ronda/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { dia, turno } = req.body;
    try {
        await pool.query(
            `UPDATE ronda SET dia = $1, turno = $2 WHERE id_ronda = $3`,
            [dia, turno, id]
        );
        res.redirect('/ronda');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al actualizar ronda</h1>
      <pre>${err.message}</pre>
      <a href="/ronda">Volver</a>
    `);
    }
});

// BORRAR RONDA
app.post('/ronda/borrar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await pool.query('DELETE FROM ronda WHERE id_ronda = $1', [id]);
        res.redirect('/ronda');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al borrar ronda</h1>
      <p>Probablemente existan habitaciones asignadas a esta ronda (tabla incluye).</p>
      <pre>${err.message}</pre>
      <a href="/ronda">Volver</a>
    `);
    }
});

/* ========== INCLUYE (habitaciones por ronda) ========== */

// LISTADO
app.get('/incluye', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `
      SELECT 
        i.id_ronda,
        i.num_habitacion,
        r.dia,
        r.turno,
        h.piso,
        h.orientacion
      FROM incluye i
      JOIN ronda      r ON r.id_ronda = i.id_ronda
      JOIN habitacion h ON h.num_habitacion = i.num_habitacion
      ORDER BY r.id_ronda, i.num_habitacion;
      `
        );

        const filas = result.rows.map((r: any) => `
      <tr>
        <td>${r.id_ronda}</td>
        <td>${r.dia} (${r.turno})</td>
        <td>${r.num_habitacion}</td>
        <td>Piso ${r.piso} - ${r.orientacion}</td>
        <td>
          <form method="POST" action="/incluye/borrar" style="display:inline">
            <input type="hidden" name="id_ronda" value="${r.id_ronda}">
            <input type="hidden" name="num_habitacion" value="${r.num_habitacion}">
            <button type="submit" onclick="return confirm('¿Quitar habitación de esta ronda?')">
              Quitar
            </button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Habitaciones por ronda</h1>
      <a href="/incluye/nuevo">➕ Agregar habitación a ronda</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID Ronda</th>
          <th>Descripción ronda</th>
          <th>N° Habitación</th>
          <th>Detalle habitación</th>
          <th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="5">Sin habitaciones asignadas a rondas.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// FORM NUEVO (agregar habitación a una ronda)
app.get('/incluye/nuevo', async (_req: Request, res: Response) => {
    try {
        const rondas = await pool.query(
            'SELECT id_ronda, dia, turno FROM ronda ORDER BY id_ronda'
        );
        const habitaciones = await pool.query(
            'SELECT num_habitacion, piso, orientacion FROM habitacion ORDER BY num_habitacion'
        );

        const opcionesRonda = rondas.rows.map((r: any) =>
            `<option value="${r.id_ronda}">
        ${r.id_ronda} - ${r.dia} (${r.turno})
      </option>`
        ).join('');

        const opcionesHabitacion = habitaciones.rows.map((h: any) =>
            `<option value="${h.num_habitacion}">
        ${h.num_habitacion} - Piso ${h.piso} - ${h.orientacion}
      </option>`
        ).join('');

        res.send(`
      <h1>Agregar habitación a una ronda</h1>
      <form method="POST" action="/incluye/nuevo">
        <label>Ronda:</label><br>
        <select name="id_ronda" required>
          <option value="">-- Seleccionar ronda --</option>
          ${opcionesRonda}
        </select><br><br>

        <label>Habitación:</label><br>
        <select name="num_habitacion" required>
          <option value="">-- Seleccionar habitación --</option>
          ${opcionesHabitacion}
        </select><br><br>

        <button type="submit">Guardar</button>
      </form>
      <br><a href="/incluye">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// ALTA EN INCLUYE
app.post('/incluye/nuevo', async (req: Request, res: Response) => {
    const { id_ronda, num_habitacion } = req.body;
    try {
        await pool.query(
            `
      INSERT INTO incluye (id_ronda, num_habitacion)
      VALUES ($1, $2)
      `,
            [Number(id_ronda), Number(num_habitacion)]
        );
        res.redirect('/incluye');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al agregar habitación a la ronda</h1>
      <p>Puede ser que ya exista esa combinación (PK compuesta) o que no existan la ronda o la habitación.</p>
      <pre>${err.message}</pre>
      <a href="/incluye/nuevo">Volver</a>
    `);
    }
});

// BORRAR UNA FILA DE INCLUYE
app.post('/incluye/borrar', async (req: Request, res: Response) => {
    const id_ronda = Number(req.body.id_ronda);
    const num_habitacion = Number(req.body.num_habitacion);
    try {
        await pool.query(
            `
      DELETE FROM incluye
      WHERE id_ronda = $1 AND num_habitacion = $2
      `,
            [id_ronda, num_habitacion]
        );
        res.redirect('/incluye');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al quitar habitación de ronda</h1>
      <pre>${err.message}</pre>
      <a href="/incluye">Volver</a>
    `);
    }
});
/* ========== RECORRIDO ========== */

// LISTADO
app.get('/recorrido', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `
      SELECT 
        r.id_recorrido,
        r.fecha,
        ron.id_ronda,
        ron.dia,
        ron.turno,
        m.matricula,
        m.apellido AS apellido_medico,
        m.nombre   AS nombre_medico
      FROM recorrido r
      JOIN ronda  ron ON ron.id_ronda = r.id_ronda
      JOIN medico m   ON m.matricula = r.matricula
      ORDER BY r.fecha DESC, r.id_recorrido;
      `
        );

        const filas = result.rows.map((rec: any) => `
      <tr>
        <td>${rec.id_recorrido}</td>
        <td>${rec.fecha}</td>
        <td>${rec.id_ronda} - ${rec.dia} (${rec.turno})</td>
        <td>${rec.matricula} - ${rec.apellido_medico}, ${rec.nombre_medico}</td>
        <td>
          <a href="/recorrido/editar/${rec.id_recorrido}">Editar</a>
          |
          <form method="POST" action="/recorrido/borrar/${rec.id_recorrido}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar recorrido?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Recorridos</h1>
      <a href="/recorrido/nuevo">➕ Nuevo recorrido</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID</th>
          <th>Fecha</th>
          <th>Ronda</th>
          <th>Médico</th>
          <th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="5">Sin recorridos.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// FORM NUEVO RECORRIDO
app.get('/recorrido/nuevo', async (_req: Request, res: Response) => {
    try {
        const rondas = await pool.query(
            'SELECT id_ronda, dia, turno FROM ronda ORDER BY id_ronda'
        );
        const medicos = await pool.query(
            'SELECT matricula, apellido, nombre FROM medico ORDER BY apellido, nombre'
        );

        const opcionesRonda = rondas.rows.map((r: any) =>
            `<option value="${r.id_ronda}">${r.id_ronda} - ${r.dia} (${r.turno})</option>`
        ).join('');

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}">${m.matricula} - ${m.apellido}, ${m.nombre}</option>`
        ).join('');

        res.send(`
      <h1>Nuevo recorrido</h1>
      <form method="POST" action="/recorrido/nuevo">
        <label>Fecha del recorrido:</label><br>
        <input type="date" name="fecha" required><br><br>

        <label>Ronda:</label><br>
        <select name="id_ronda" required>
          <option value="">-- Seleccionar ronda --</option>
          ${opcionesRonda}
        </select><br><br>

        <label>Médico que realiza el recorrido:</label><br>
        <select name="matricula" required>
          <option value="">-- Seleccionar médico --</option>
          ${opcionesMedico}
        </select><br><br>

        <button type="submit">Guardar</button>
      </form>
      <br><a href="/recorrido">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// ALTA RECORRIDO
app.post('/recorrido/nuevo', async (req: Request, res: Response) => {
    const { fecha, id_ronda, matricula } = req.body;
    try {
        await pool.query(
            `
      INSERT INTO recorrido (fecha, id_ronda, matricula)
      VALUES ($1, $2, $3)
      `,
            [fecha, Number(id_ronda), Number(matricula)]
        );
        res.redirect('/recorrido');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al guardar recorrido</h1>
      <pre>${err.message}</pre>
      <a href="/recorrido/nuevo">Volver</a>
    `);
    }
});

// FORM EDITAR RECORRIDO
app.get('/recorrido/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const recResult = await pool.query(
            `
      SELECT id_recorrido, fecha, id_ronda, matricula
      FROM recorrido
      WHERE id_recorrido = $1
      `,
            [id]
        );

        if (recResult.rowCount === 0) {
            return res.status(404).send('<h1>Recorrido no encontrado</h1><a href="/recorrido">Volver</a>');
        }

        const rec = recResult.rows[0];

        const fechaStr = rec.fecha instanceof Date
            ? rec.fecha.toISOString().slice(0, 10)
            : rec.fecha;

        const rondas = await pool.query(
            'SELECT id_ronda, dia, turno FROM ronda ORDER BY id_ronda'
        );
        const medicos = await pool.query(
            'SELECT matricula, apellido, nombre FROM medico ORDER BY apellido, nombre'
        );

        const opcionesRonda = rondas.rows.map((r: any) =>
            `<option value="${r.id_ronda}" ${r.id_ronda === rec.id_ronda ? 'selected' : ''}>
        ${r.id_ronda} - ${r.dia} (${r.turno})
      </option>`
        ).join('');

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}" ${m.matricula === rec.matricula ? 'selected' : ''}>
        ${m.matricula} - ${m.apellido}, ${m.nombre}
      </option>`
        ).join('');

        res.send(`
      <h1>Editar recorrido ${rec.id_recorrido}</h1>
      <form method="POST" action="/recorrido/editar/${rec.id_recorrido}">
        ID: <input type="number" value="${rec.id_recorrido}" disabled><br><br>

        <label>Fecha del recorrido:</label><br>
        <input type="date" name="fecha" value="${fechaStr}" required><br><br>

        <label>Ronda:</label><br>
        <select name="id_ronda" required>
          ${opcionesRonda}
        </select><br><br>

        <label>Médico que realiza el recorrido:</label><br>
        <select name="matricula" required>
          ${opcionesMedico}
        </select><br><br>

        <button type="submit">Guardar cambios</button>
      </form>
      <br><a href="/recorrido">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// GUARDAR EDICIÓN
app.post('/recorrido/editar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { fecha, id_ronda, matricula } = req.body;
    try {
        await pool.query(
            `
      UPDATE recorrido
      SET fecha = $1,
          id_ronda = $2,
          matricula = $3
      WHERE id_recorrido = $4
      `,
            [fecha, Number(id_ronda), Number(matricula), id]
        );
        res.redirect('/recorrido');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al actualizar recorrido</h1>
      <pre>${err.message}</pre>
      <a href="/recorrido">Volver</a>
    `);
    }
});

// BORRAR
app.post('/recorrido/borrar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await pool.query(
            'DELETE FROM comentario_recorrido WHERE id_recorrido = $1',
            [id]
        );
        await pool.query(
            'DELETE FROM recorrido WHERE id_recorrido = $1',
            [id]
        );
        res.redirect('/recorrido');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al borrar recorrido</h1>
      <pre>${err.message}</pre>
      <a href="/recorrido">Volver</a>
    `);
    }
});

/* ========== COMENTARIO_RECORRIDO ========== */

app.get('/comentario_recorrido', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT 
        c.nro_comentario,
        c.texto,
        c.id_recorrido,
        c.id_internacion,
        r.id_ronda,
        ron.dia,
        ron.turno,
        m.matricula,
        m.apellido AS apellido_medico,
        m.nombre   AS nombre_medico,
        p.dni,
        p.apellido AS apellido_paciente,
        p.nombre   AS nombre_paciente
      FROM comentario_recorrido c
      JOIN recorrido   r   ON r.id_recorrido = c.id_recorrido
      JOIN ronda       ron ON ron.id_ronda   = r.id_ronda
      JOIN internacion i   ON i.id_internacion = c.id_internacion
      JOIN paciente    p   ON p.dni = i.dni
      JOIN medico      m   ON m.matricula = r.matricula
      ORDER BY ron.dia DESC, c.nro_comentario;
    `);

        const filas = result.rows.map((c: any) => `
      <tr>
        <td>${c.nro_comentario}</td>
        <td>${c.dia} (${c.turno})</td>
        <td>${c.id_recorrido} - ${c.matricula} ${c.apellido_medico}, ${c.nombre_medico}</td>
        <td>${c.id_internacion} - ${c.apellido_paciente}, ${c.nombre_paciente}</td>
        <td>${c.texto}</td>
        <td>
          <a href="/comentario_recorrido/editar/${c.nro_comentario}">Editar</a>
          |
          <form method="POST" action="/comentario_recorrido/borrar/${c.nro_comentario}" style="display:inline">
            <button type="submit" onclick="return confirm('¿Borrar comentario?')">Borrar</button>
          </form>
        </td>
      </tr>
    `).join('');

        res.send(`
      <h1>Comentarios de recorrido</h1>
      <a href="/comentario_recorrido/nuevo">➕ Nuevo comentario</a> | <a href="/">Inicio</a><br><br>
      <table border="1" cellpadding="5">
        <tr>
          <th>N°</th>
          <th>Ronda (fecha/turno)</th>
          <th>Recorrido / Médico</th>
          <th>Internación / Paciente</th>
          <th>Texto</th>
          <th>Acciones</th>
        </tr>
        ${filas || '<tr><td colspan="6">Sin comentarios.</td></tr>'}
      </table>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// nuevo comentario
app.get('/comentario_recorrido/nuevo', async (_req: Request, res: Response) => {
    try {
        const recorridos = await pool.query(`
      SELECT 
        r.id_recorrido,
        ron.dia,
        ron.turno,
        m.matricula,
        m.apellido,
        m.nombre
      FROM recorrido r
      JOIN ronda  ron ON ron.id_ronda = r.id_ronda
      JOIN medico m   ON m.matricula = r.matricula
      ORDER BY ron.dia DESC, ron.turno, r.id_recorrido;
    `);

        const internaciones = await pool.query(`
      SELECT 
        i.id_internacion,
        i.fecha_inicio,
        i.fecha_fin,
        p.apellido,
        p.nombre
      FROM internacion i
      JOIN paciente p ON p.dni = i.dni
      ORDER BY i.id_internacion DESC;
    `);

        const opcionesRecorrido = recorridos.rows.map((r: any) =>
            `<option value="${r.id_recorrido}">
        ${r.id_recorrido} - ${r.dia} (${r.turno}) - ${r.matricula} ${r.apellido}, ${r.nombre}
      </option>`
        ).join('');

        const opcionesInternacion = internaciones.rows.map((i: any) =>
            `<option value="${i.id_internacion}">
        ${i.id_internacion} - ${i.apellido}, ${i.nombre} (${i.fecha_inicio} → ${i.fecha_fin ?? ''})
      </option>`
        ).join('');

        res.send(`
      <h1>Nuevo comentario de recorrido</h1>
      <form method="POST" action="/comentario_recorrido/nuevo">
        <label>Recorrido:</label><br>
        <select name="id_recorrido" required>
          <option value="">-- Seleccionar recorrido --</option>
          ${opcionesRecorrido}
        </select><br><br>

        <label>Internación:</label><br>
        <select name="id_internacion" required>
          <option value="">-- Seleccionar internación --</option>
          ${opcionesInternacion}
        </select><br><br>

        <label>Texto del comentario:</label><br>
        <textarea name="texto" rows="4" cols="60" required></textarea><br><br>

        <button type="submit">Guardar</button>
      </form>
      <br><a href="/comentario_recorrido">Volver</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// ALTA
app.post('/comentario_recorrido/nuevo', async (req: Request, res: Response) => {
    const { texto, id_recorrido, id_internacion } = req.body;
    try {
        await pool.query(
            `
      INSERT INTO comentario_recorrido (texto, id_recorrido, id_internacion)
      VALUES ($1, $2, $3)
      `,
            [texto, Number(id_recorrido), Number(id_internacion)]
        );
        res.redirect('/comentario_recorrido');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al guardar comentario</h1>
      <pre>${err.message}</pre>
      <a href="/comentario_recorrido/nuevo">Volver</a>
    `);
    }
});

app.post('/comentario_recorrido/borrar/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await pool.query(
            'DELETE FROM comentario_recorrido WHERE nro_comentario = $1',
            [id]
        );
        res.redirect('/comentario_recorrido');
    } catch (err: any) {
        console.error(err);
        res.status(400).send(`
      <h1>Error al borrar comentario</h1>
      <pre>${err.message}</pre>
      <a href="/comentario_recorrido">Volver</a>
    `);
    }
});


//aca vendrian los reportes

app.get('/reportes/camas-disponibles', async (_req: Request, res: Response) => {
    try {
        // 1. Obtener el resumen (Conteo)
        const resumenResult = await pool.query('SELECT * FROM sp_cantidad_camas_libres_por_sector()');

        // 2. Obtener el detalle completo
        const detalleResult = await pool.query('SELECT * FROM sp_detalle_camas_disponibles()');

        // Renderizar tabla resumen
        const filasResumen = resumenResult.rows.map((r: any) => `
            <tr>
                <td><b>${r.sector}</b></td>
                <td style="text-align:center; font-size: 1.2em;">${r.cantidad_disponible}</td>
            </tr>
        `).join('');

        // Renderizar tabla detalle
        const filasDetalle = detalleResult.rows.map((d: any) => `
            <tr>
                <td>${d.nombre_sector}</td>
                <td>${d.piso}</td>
                <td>Hab. ${d.num_habitacion}</td>
                <td>Cama ${d.num_cama}</td>
                <td>${d.orientacion}</td>
            </tr>
        `).join('');

        res.send(`
            <h1>Disponibilidad de Camas (Área de Internación)</h1>
            <a href="/">Volver al Inicio</a>
            
            <h3>Resumen por Sector</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 50%;">
                <tr style="background-color: #f2f2f2;"><th>Sector</th><th>Cantidad Libre</th></tr>
                ${filasResumen || '<tr><td colspan="2">No hay camas libres.</td></tr>'}
            </table>

            <h3>Detalle de Ubicación</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 80%;">
                <tr style="background-color: #f2f2f2;">
                    <th>Sector</th><th>Piso</th><th>Habitación</th><th>Cama</th><th>Orientación</th>
                </tr>
                ${filasDetalle || '<tr><td colspan="5">No hay camas libres.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/internacion/seguimiento/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        // 1. Datos básicos de la internación y paciente
        const encabezado = await pool.query(`
            SELECT i.id_internacion, p.apellido, p.nombre, p.dni 
            FROM internacion i 
            JOIN paciente p ON i.dni = p.dni 
            WHERE i.id_internacion = $1`, [id]);

        if (encabezado.rowCount === 0) return res.send('Internación no encontrada');
        const pac = encabezado.rows[0];

        // 2. Llamada al Stored Procedure
        const comentariosResult = await pool.query('SELECT * FROM sp_comentarios_internacion($1)', [id]);

        const timeline = comentariosResult.rows.map((c: any) => `
            <div style="border: 1px solid #ccc; margin-bottom: 10px; padding: 10px; border-radius: 5px;">
                <div style="color: #555; font-size: 0.9em;">
                    <strong>Fecha:</strong> ${new Date(c.fecha).toLocaleDateString()} | 
                    <strong>Dr/a:</strong> ${c.apellido_medico}, ${c.nombre_medico} (Mat. ${c.matricula})
                </div>
                <p style="margin-top: 5px; font-size: 1.1em;">${c.texto}</p>
            </div>
        `).join('');

        res.send(`
            <h1>Seguimiento Médico</h1>
            <h3>Paciente: ${pac.apellido}, ${pac.nombre} (DNI: ${pac.dni})</h3>
            <p>Internación N°: ${pac.id_internacion}</p>
            <hr>
            
            <div style="max-width: 800px;">
                ${timeline || '<p><i>No hay comentarios registrados para esta internación.</i></p>'}
            </div>
            
            <br>
            <a href="/comentario_recorrido/nuevo">Agregar Nuevo Comentario</a> | 
            <a href="/internacion">Volver a Internaciones</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

app.get('/reportes/auditoria', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_auditoria,
                accion,
                usuario,
                to_char(fecha_auditoria, 'DD/MM/YYYY HH24:MI:SS') as fecha,
                id_guardia,
                t_guardia,
                matricula,
                nombre_medico,
                apellido_medico,
                especialidad
            FROM aud_asignacion_guardia
            ORDER BY fecha_auditoria DESC
        `);

        // Función auxiliar para formatear la acción
        const getEtiquetaAccion = (char: string) => {
            switch(char) {
                case 'I': return '<span style="color:green; font-weight:bold;">ALTA (INSERT)</span>';
                case 'U': return '<span style="color:orange; font-weight:bold;">MODIFICACIÓN (UPDATE)</span>';
                case 'D': return '<span style="color:red; font-weight:bold;">BAJA (DELETE)</span>';
                default: return char;
            }
        };

        const filas = result.rows.map((r: any) => `
            <tr>
                <td>${r.fecha}</td>
                <td>${r.usuario}</td>
                <td>${getEtiquetaAccion(r.accion)}</td>
                <td>
                    <strong>${r.apellido_medico}, ${r.nombre_medico}</strong><br>
                    <small>Mat: ${r.matricula} - DNI: ${r.dni || 'N/D'}</small>
                </td>
                <td>
                    ID: ${r.id_guardia} <br> 
                    Tipo: <b>${r.t_guardia}</b>
                </td>
                <td>${r.especialidad}</td>
            </tr>
        `).join('');

        res.send(`
            <h1>Auditoría de Asignación de Guardias</h1>
            <p>Historial detallado de cambios.</p>
            <a href="/">Volver al Inicio</a><br><br>
            
            <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-family: sans-serif;">
                <thead style="background-color: #333; color: white;">
                    <tr>
                        <th>Fecha y Hora</th>
                        <th>Usuario Sistema</th>
                        <th>Acción Realizada</th>
                        <th>Médico Afectado</th>
                        <th>Guardia</th>
                        <th>Especialidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay registros de auditoría.</td></tr>'}
                </tbody>
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<h1>Error</h1><pre>${err.message}</pre><a href="/">Volver</a>`);
    }
});

// Internar médico como paciente
app.get('/internar_medico', async (_req: Request, res: Response) => {
    try {
        // Solo médicos que NO estén actualmente internados
        const medicos = await pool.query(`
      SELECT m.matricula, m.dni, m.apellido, m.nombre
      FROM medico m
      WHERE NOT EXISTS (
        SELECT 1 FROM internacion i 
        WHERE i.dni = m.dni AND i.fecha_fin IS NULL
      )
      ORDER BY m.apellido, m.nombre
    `);

        // Médicos disponibles para ser médico tratante
        const medicosTratantes = await pool.query(`
      SELECT matricula, apellido, nombre
      FROM medico
      ORDER BY apellido, nombre
    `);

        // Sectores con camas libres
        const sectores = await pool.query(`
      SELECT DISTINCT s.id_sector, s.tipo, COUNT(c.num_cama) as camas_libres
      FROM sector s
      JOIN habitacion h ON h.id_sector = s.id_sector
      JOIN cama c ON c.num_habitacion = h.num_habitacion
      WHERE c.estado = 'LIBRE'
      GROUP BY s.id_sector, s.tipo
      ORDER BY s.tipo
    `);

        const opcionesMedico = medicos.rows.map((m: any) =>
            `<option value="${m.matricula}">
        ${m.matricula} - ${m.apellido}, ${m.nombre} (DNI: ${m.dni})
      </option>`
        ).join('');

        const opcionesTratante = medicosTratantes.rows.map((m: any) =>
            `<option value="${m.matricula}">
        ${m.matricula} - ${m.apellido}, ${m.nombre}
      </option>`
        ).join('');

        const opcionesSector = sectores.rows.map((s: any) =>
            `<option value="${s.id_sector}">
        ${s.tipo} (${s.camas_libres} camas libres)
      </option>`
        ).join('');

        res.send(`
      <h1>🏥 Internar Médico como Paciente</h1>
      <p><strong>Operación con TRANSACCIÓN</strong> - Demuestra atomicidad en operaciones múltiples</p>
      <hr>
      
      <form method="POST" action="/internar_medico">
        <label><strong>Médico a internar:</strong></label><br>
        <select name="matricula_paciente" required>
          <option value="">-- Seleccionar médico --</option>
          ${opcionesMedico || '<option disabled>No hay médicos disponibles</option>'}
        </select><br><br>

        <label><strong>Médico tratante (quien lo atenderá):</strong></label><br>
        <select name="matricula_tratante" required>
          <option value="">-- Seleccionar médico tratante --</option>
          ${opcionesTratante}
        </select><br><br>

        <label><strong>Sector de internación:</strong></label><br>
        <select name="id_sector" required>
          <option value="">-- Seleccionar sector --</option>
          ${opcionesSector || '<option disabled>No hay sectores con camas libres</option>'}
        </select><br><br>

        <label><strong>Fecha de nacimiento</strong> (si no existe como paciente):</label><br>
        <input type="date" name="fecha_nac" value="1980-01-01"><br><br>

        <label><strong>Sexo</strong> (si no existe como paciente):</label><br>
        <select name="sexo">
          <option value="MASCULINO">MASCULINO</option>
          <option value="FEMENINO">FEMENINO</option>
        </select><br><br>

        <button type="submit" style="padding: 10px 20px; font-size: 16px;">
          💾 Ejecutar Internación (con Transacción)
        </button>
      </form>
      
      <br>
      <hr>
      <h3>¿Qué hace esta operación?</h3>
      <ol>
        <li>Verifica que el médico existe</li>
        <li>Verifica que no sea su propio médico tratante</li>
        <li>Crea registro de PACIENTE si no existe (rol dual)</li>
        <li>Crea la INTERNACIÓN</li>
        <li>Busca una CAMA libre en el sector</li>
        <li>Asigna la cama (tabla CORRESPONDE)</li>
      </ol>
      <p><strong>Si cualquier paso falla → ROLLBACK (se deshace todo)</strong></p>
      
      <br><a href="/">← Volver al inicio</a>
    `);
    } catch (err: any) {
        console.error(err);
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// EJECUTAR TRANSACCIÓN: Internar médico como paciente
app.post('/internar_medico', async (req: Request, res: Response) => {
    const { matricula_paciente, matricula_tratante, id_sector, fecha_nac, sexo } = req.body;

    const client = await pool.connect();

    let resumen = {
        medico: '',
        dni: 0,
        pacienteCreado: false,
        id_internacion: 0,
        cama: '',
        habitacion: 0,
        sector: ''
    };

    try {
        await client.query('BEGIN');

        // Verificar que el médico a internar existe
        const medicoResult = await client.query(
            `SELECT dni, nombre, apellido FROM medico WHERE matricula = $1`,
            [Number(matricula_paciente)]
        );

        if (medicoResult.rowCount === 0) {
            throw new Error(`No existe médico con matrícula ${matricula_paciente}`);
        }

        const medico = medicoResult.rows[0];
        resumen.medico = `${medico.apellido}, ${medico.nombre}`;
        resumen.dni = medico.dni;

        // Verificar que no se auto-interne
        if (Number(matricula_paciente) === Number(matricula_tratante)) {
            throw new Error('Un médico no puede ser su propio médico tratante');
        }
        console.log('[2/6] Validación: médico tratante diferente ✓');

        // Verificar/crear registro de paciente
        const pacienteExiste = await client.query(
            `SELECT dni FROM paciente WHERE dni = $1`,
            [medico.dni]
        );

        if (pacienteExiste.rowCount === 0) {
            await client.query(
                `INSERT INTO paciente (dni, nombre, apellido, fecha_nac, sexo)
         VALUES ($1, $2, $3, $4, $5)`,
                [medico.dni, medico.nombre, medico.apellido, fecha_nac, sexo]
            );
            resumen.pacienteCreado = true;
        } else {
        }

        // Verificar que no tenga internación activa
        const internacionActiva = await client.query(
            `SELECT id_internacion FROM internacion 
       WHERE dni = $1 AND fecha_fin IS NULL`,
            [medico.dni]
        );

        if (internacionActiva.rowCount! > 0) {
            throw new Error(`El paciente DNI ${medico.dni} ya tiene una internación activa`);
        }

        // Buscar cama libre en el sector
        const camaResult = await client.query(
            `SELECT c.num_cama, c.num_habitacion, h.piso, s.tipo as sector
       FROM cama c
       JOIN habitacion h ON h.num_habitacion = c.num_habitacion
       JOIN sector s ON s.id_sector = h.id_sector
       WHERE h.id_sector = $1 
         AND c.estado = 'LIBRE'
       ORDER BY h.piso, c.num_habitacion, c.num_cama
       LIMIT 1
       FOR UPDATE`,
            [Number(id_sector)]
        );

        if (camaResult.rowCount === 0) {
            throw new Error(`No hay camas disponibles en el sector seleccionado`);
        }

        const cama = camaResult.rows[0];
        resumen.cama = `Cama ${cama.num_cama}`;
        resumen.habitacion = cama.num_habitacion;
        resumen.sector = cama.sector;

        // Crear internación
        const fechaHoy = new Date().toISOString().slice(0, 10);
        const horaActual = new Date().toISOString();

        const internacionResult = await client.query(
            `INSERT INTO internacion (fecha_inicio, fecha_fin, matricula, dni)
       VALUES ($1, NULL, $2, $3)
       RETURNING id_internacion`,
            [fechaHoy, Number(matricula_tratante), medico.dni]
        );

        resumen.id_internacion = internacionResult.rows[0].id_internacion;

        // Asignar cama
        await client.query(
            `INSERT INTO corresponde (id_internacion, num_cama, num_habitacion, fecha, hora)
       VALUES ($1, $2, $3, $4, $5)`,
            [resumen.id_internacion, cama.num_cama, cama.num_habitacion, fechaHoy, horaActual]
        );

        await client.query('COMMIT');
        console.log('>>> TRANSACCIÓN COMPLETADA (COMMIT)');

        res.send(`
      <h1>✅ Internación Exitosa</h1>
      <h2>Transacción completada (COMMIT)</h2>
      
      <table border="1" cellpadding="10">
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Médico internado</td><td>${resumen.medico}</td></tr>
        <tr><td>DNI</td><td>${resumen.dni}</td></tr>
        <tr><td>Paciente creado</td><td>${resumen.pacienteCreado ? 'SÍ (nuevo registro)' : 'NO (ya existía)'}</td></tr>
        <tr><td>ID Internación</td><td>${resumen.id_internacion}</td></tr>
        <tr><td>Ubicación</td><td>Habitación ${resumen.habitacion}, ${resumen.cama}</td></tr>
        <tr><td>Sector</td><td>${resumen.sector}</td></tr>
        <tr><td>Fecha</td><td>${fechaHoy}</td></tr>
      </table>
      
      <br>
      <p><strong>Todas las operaciones se ejecutaron correctamente:</strong></p>
      <ol>
        <li>✓ Médico verificado</li>
        <li>✓ Validación de médico tratante</li>
        <li>✓ Registro de paciente ${resumen.pacienteCreado ? 'creado' : 'existente'}</li>
        <li>✓ Internación creada</li>
        <li>✓ Cama asignada</li>
      </ol>
      
      <br>
      <a href="/internar_medico">← Nueva internación</a> | 
      <a href="/internacion">Ver internaciones</a> |
      <a href="/">Inicio</a>
    `);

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.log('TRANSACCIÓN REVERTIDA (ROLLBACK)');
        console.error('Error:', err.message);

        res.status(400).send(`
      <h1>❌ Error en la Transacción</h1>
      <h2>ROLLBACK ejecutado - Ningún cambio fue guardado</h2>
      
      <div style="background: #ffeeee; padding: 15px; border: 1px solid #ff0000;">
        <strong>Error:</strong> ${err.message}
      </div>
      
      <br>
      
      <a href="/internar_medico">← Volver a intentar</a> | 
      <a href="/">Inicio</a>
    `);

    } finally {
        client.release();
    }
});

// =================================================================
//   ASIGNACIÓN DE CAMAS
// =================================================================

// 1. LISTADO DE ASIGNACIONES
app.get('/corresponde', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id_internacion,
                c.num_cama,
                c.num_habitacion,
                c.fecha,
                c.hora,
                p.apellido,
                p.nombre,
                s.tipo as sector
            FROM corresponde c
            JOIN internacion i ON i.id_internacion = c.id_internacion
            JOIN paciente p ON p.dni = i.dni
            JOIN habitacion h ON h.num_habitacion = c.num_habitacion
            JOIN sector s ON s.id_sector = h.id_sector
            ORDER BY c.fecha DESC, c.hora DESC
        `);

        const filas = result.rows.map((r: any) => `
            <tr>
                <td>${new Date(r.fecha).toLocaleDateString()} ${r.hora}</td>
                <td>${r.apellido}, ${r.nombre} (Int #${r.id_internacion})</td>
                <td>${r.sector} - Hab ${r.num_habitacion} - Cama ${r.num_cama}</td>
            </tr>
        `).join('');

        res.send(`
            <h1>Movimientos de Camas</h1>
            <a href="/corresponde/nueva">➕ Asignar Cama</a> | <a href="/">Inicio</a>
            <table border="1" cellpadding="5" style="margin-top:20px; border-collapse: collapse; width: 100%;">
                <tr style="background:#eee;"><th>Fecha/Hora</th><th>Paciente</th><th>Ubicación</th></tr>
                ${filas || '<tr><td colspan="3">Sin movimientos registrados.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// FORMULARIO
app.get('/corresponde/nueva', async (_req, res) => {
    try {
        const internaciones = await pool.query(`
            SELECT i.id_internacion, p.apellido, p.nombre 
            FROM internacion i 
            JOIN paciente p ON p.dni = i.dni 
            WHERE i.fecha_fin IS NULL 
            ORDER BY p.apellido
        `);

        const camas = await pool.query('SELECT * FROM sp_detalle_camas_disponibles()');

        const optInt = internaciones.rows.map((i: any) =>
            `<option value="${i.id_internacion}">#${i.id_internacion} - ${i.apellido}, ${i.nombre}</option>`
        ).join('');

        const optCamas = camas.rows.map((c: any) =>
            `<option value="${c.num_cama},${c.num_habitacion}">
                ${c.nombre_sector} - Hab ${c.num_habitacion} - Cama ${c.num_cama} (${c.orientacion})
             </option>`
        ).join('');

        res.send(`
            <h1>Asignar Paciente a Cama</h1>
            <form method="POST" action="/corresponde/nueva">
                <label>Internación Activa:</label><br>
                <select name="id_internacion" required>
                    <option value="">-- Seleccionar --</option>
                    ${optInt}
                </select><br><br>

                <label>Cama Disponible:</label><br>
                <select name="datos_cama" required>
                    <option value="">-- Seleccionar --</option>
                    ${optCamas}
                </select><br><br>

                <button type="submit">Guardar Movimiento</button>
            </form>
            <br><a href="/corresponde">Volver</a>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

//ASIGNACIÓN
app.post('/corresponde/nueva', async (req, res) => {
    const { id_internacion, datos_cama } = req.body;
    const [num_cama, num_habitacion] = datos_cama.split(',');

    try {
        const momentoActual = new Date();
        const fechaSolo = momentoActual.toISOString().slice(0, 10);
        const horaCompleta = momentoActual;

        await pool.query(
            `INSERT INTO corresponde (id_internacion, num_cama, num_habitacion, fecha, hora)
             VALUES ($1, $2, $3, $4, $5)`,
            [Number(id_internacion), Number(num_cama), Number(num_habitacion), fechaSolo, horaCompleta]
        );

        res.redirect('/corresponde');

    } catch (err: any) {
        res.status(400).send(`
            <h1>Error al asignar cama</h1>
            <p style="color:red; font-weight:bold;">${err.message}</p>
            <p>Es probable que la cama haya sido ocupada por otro usuario o la validación de fechas falló.</p>
            <a href="/corresponde/nueva">Intentar de nuevo</a>
        `);
    }
});

// Pacientes Internados Actualmente
app.get('/reportes/internados', async (_req, res) => {
    try {

        const result = await pool.query('SELECT * FROM sp_pacientes_internados_actualmente()');

        const filas = result.rows.map((p: any) => `
            <tr>
                <td>${p.apellido_paciente}, ${p.nombre_paciente} (DNI ${p.dni_paciente})</td>
                <td>${new Date(p.fecha_inicio_internacion).toLocaleDateString()}</td>
                <td>Dr/a. ${p.apellido_medico}</td>
                <td><a href="/internacion/seguimiento/${p.id_internacion}">Ver Evolución</a></td>
            </tr>
        `).join('');

        res.send(`
            <h1>Pacientes Actualmente Internados</h1>
            <a href="/">Volver</a>
            <table border="1" cellpadding="5" style="width:100%; border-collapse:collapse; margin-top:15px;">
                <tr>
                    <th>Paciente</th>
                    <th>Fecha Ingreso</th>
                    <th>Médico Cabecera</th>
                    <th>Acciones</th>
                </tr>
                ${filas || '<tr><td colspan="4">No hay pacientes internados.</td></tr>'}
            </table>
        `);
    } catch (err: any) {
        res.status(500).send(`<pre>${err.message}</pre>`);
    }
});

// Actividad de Médicos (Liquidación)
app.get('/reportes/liquidacion', async (req, res) => {
    const { matricula, mes, anio } = req.query;

    const mesActual = mes ? Number(mes) : new Date().getMonth() + 1;
    const anioActual = anio ? Number(anio) : new Date().getFullYear();

    let contenido = '<p>Seleccione un médico para ver su liquidación.</p>';

    if (matricula) {
        try {
            const result = await pool.query(
                'SELECT * FROM sp_reporte_actividad_medico($1, $2, $3)',
                [matricula, mesActual, anioActual]
            );

            if(result.rows.length > 0) {
                const r = result.rows[0];
                contenido = `
                    <div style="border:1px solid #333; padding:20px; background:#fff; max-width:600px;">
                        <h3>Reporte de Actividad Mensual</h3>
                        <p><strong>Médico:</strong> ${r.medico}</p>
                        <p><strong>CUIT:</strong> ${r.cuit}</p>
                        <p><strong>Antigüedad:</strong> ${r.antiguedad_años} años</p>
                        <hr>
                        <p>Período: ${mesActual}/${anioActual}</p>
                        <ul>
                            <li><strong>Guardias realizadas:</strong> ${r.cant_guardias}</li>
                            <li><strong>Recorridos efectuados:</strong> ${r.cant_recorridos}</li>
                        </ul>
                        <p><small>${r.detalle}</small></p>
                    </div>
                `;
            } else {
                contenido = '<p>No se encontraron datos para ese médico en este período.</p>';
            }
        } catch (err: any) {
            contenido = `<p style="color:red">Error: ${err.message}</p>`;
        }
    }

    const medicos = await pool.query('SELECT matricula, apellido, nombre FROM medico ORDER BY apellido');
    const options = medicos.rows.map((m: any) =>
        `<option value="${m.matricula}" ${m.matricula == matricula ? 'selected':''}>${m.apellido}, ${m.nombre}</option>`
    ).join('');

    res.send(`
        <h1>Liquidación de Honorarios Médicos</h1>
        <form method="GET" action="/reportes/liquidacion" style="background:#f9f9f9; padding:15px;">
            <label>Médico:</label>
            <select name="matricula" required>
                <option value="">-- Seleccionar --</option>
                ${options}
            </select>
            
            <label>Mes:</label>
            <input type="number" name="mes" value="${mesActual}" min="1" max="12" style="width:50px;">
            
            <label>Año:</label>
            <input type="number" name="anio" value="${anioActual}" style="width:70px;">
            
            <button type="submit">Generar Reporte</button>
        </form>
        <br>
        ${contenido}
        <br><a href="/">Volver al Inicio</a>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
