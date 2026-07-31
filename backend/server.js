const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'todo_user',
  password: process.env.DB_PASSWORD || 'todo_pass',
  database: process.env.DB_NAME || 'todo_db',
});

// Crea la tabla si no existe (auto-provisioning al iniciar)
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tareas (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      completada BOOLEAN DEFAULT FALSE,
      creada_en TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Tabla "tareas" verificada/creada.');
}

// --- CRUD ---

// Listar (con filtro opcional ?q=texto)
app.get('/api/tareas', async (req, res) => {
  try {
    const { q } = req.query;
    let result;
    if (q) {
      result = await pool.query(
        'SELECT * FROM tareas WHERE titulo ILIKE $1 ORDER BY id DESC',
        [`%${q}%`]
      );
    } else {
      result = await pool.query('SELECT * FROM tareas ORDER BY id DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar tareas' });
  }
});

// Insertar
app.post('/api/tareas', async (req, res) => {
  try {
    const { titulo } = req.body;
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    const result = await pool.query(
      'INSERT INTO tareas (titulo) VALUES ($1) RETURNING *',
      [titulo.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al insertar tarea' });
  }
});

// Actualizar (título y/o estado completada)
app.put('/api/tareas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, completada } = req.body;
    const result = await pool.query(
      `UPDATE tareas SET
        titulo = COALESCE($1, titulo),
        completada = COALESCE($2, completada)
       WHERE id = $3 RETURNING *`,
      [titulo, completada, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// Eliminar
app.delete('/api/tareas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tareas WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json({ mensaje: 'Tarea eliminada', tarea: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

// Health check (útil para CI/CD y monitoreo)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
}).catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
