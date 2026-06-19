/**
 * seed.js — Poblar la base de datos con datos de prueba y hashes reales.
 *
 * Ejecutar DESPUÉS de npm install y de haber corrido schema.sql (solo las tablas):
 *   node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./config/db');

async function seed() {
  console.log('🌱 Iniciando seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Limpiar datos previos (respeta el orden de FK) ─────
    await client.query('DELETE FROM reservas');
    await client.query('DELETE FROM paquetes_usuarios');
    await client.query('DELETE FROM clases');
    await client.query('DELETE FROM usuarios');
    await client.query('DELETE FROM instructores');
    await client.query('DELETE FROM paquetes');

    // Reiniciar secuencias
    for (const t of ['instructores','usuarios','paquetes','paquetes_usuarios','clases','reservas']) {
      await client.query(`ALTER SEQUENCE ${t}_id_seq RESTART WITH 1`);
    }

    // ── Instructores ───────────────────────────────────────
    await client.query(`
      INSERT INTO instructores (nombre, especialidad) VALUES
        ('Ana López',    'Vinyasa Flow'),
        ('David Moreno', 'Hatha Yoga'),
        ('Camila Torres','Yin Yoga'),
        ('Rodrigo Silva','Ashtanga')
    `);
    console.log('  ✅ Instructores insertados');

    // ── Paquetes ───────────────────────────────────────────
    await client.query(`
      INSERT INTO paquetes (nombre_plan, capacidad_clases, vigencia_dias, precio) VALUES
        ('10 clases', 10,   30, 35000),
        ('20 clases', 20,   60, 60000),
        ('ilimitado', NULL, 30, 90000)
    `);
    console.log('  ✅ Paquetes insertados');

    // ── Usuarios con hashes reales ─────────────────────────
    const adminHash   = await bcrypt.hash('admin1234',   10);
    const clienteHash = await bcrypt.hash('cliente123',  10);

    console.log('  🔐 Hashes generados correctamente');

    const { rows: users } = await client.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
        ('Valentina Reyes', 'admin@respira.com',  $1, 'admin'),
        ('Elena Castro',    'elena@mail.com',     $2, 'cliente'),
        ('Marco Díaz',      'marco@mail.com',     $2, 'cliente'),
        ('Sofía Ruiz',      'sofia@mail.com',     $2, 'cliente'),
        ('Pablo Vargas',    'pablo@mail.com',     $2, 'cliente'),
        ('Isabel Mora',     'isabel@mail.com',    $2, 'cliente')
      RETURNING id, email
    `, [adminHash, clienteHash]);

    console.log('  ✅ Usuarios insertados:');
    users.forEach(u => console.log(`     - ${u.email} (id=${u.id})`));

    // ── Paquetes asignados a clientes ─────────────────────
    const today = new Date();
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0]; };
    const fmt = (d) => d.toISOString().split('T')[0];

    await client.query(`
      INSERT INTO paquetes_usuarios
        (usuario_id, paquete_id, clases_disponibles, fecha_inicio, fecha_vencimiento, estado)
      VALUES
        (2, 1,  7,    $1, $2, 'activo'),
        (3, 2,  15,   $1, $3, 'activo'),
        (4, 3,  NULL, $1, $4, 'activo'),
        (5, 1,  1,    $5, $6, 'activo'),
        (6, 2,  0,    $7, $8, 'agotado')
    `, [
      fmt(today), addDays(today, 20),
      addDays(today, 55),
      addDays(today, 30),
      addDays(today, -25), addDays(today, 5),
      addDays(today, -65), addDays(today, -5),
    ]);
    console.log('  ✅ Paquetes de usuarios asignados');

    // ── Clases semanales ───────────────────────────────────
    await client.query(`
      INSERT INTO clases
        (nombre_clase, instructor_id, dia_semana, horario_inicio, horario_fin, cupos_totales, cupos_disponibles, tipo)
      VALUES
        ('Vinyasa Flow',       1, 0, '07:00', '08:15', 12, 9,  'Vinyasa'),
        ('Hatha Suave',        2, 0, '10:00', '11:00', 10, 7,  'Hatha'),
        ('Yin Profundo',       3, 0, '18:30', '19:45', 10, 3,  'Yin'),
        ('Ashtanga Series',    4, 1, '06:30', '07:45', 8,  5,  'Ashtanga'),
        ('Vinyasa Intermedio', 1, 1, '12:00', '13:00', 12, 10, 'Vinyasa'),
        ('Yin & Yang',         3, 1, '19:00', '20:15', 10, 6,  'Yin'),
        ('Hatha Matutino',     2, 2, '07:00', '08:00', 10, 8,  'Hatha'),
        ('Vinyasa Flow',       1, 2, '17:30', '18:45', 12, 4,  'Vinyasa'),
        ('Meditación & Yoga',  3, 2, '20:00', '21:00', 8,  7,  'Meditación'),
        ('Ashtanga Avanzado',  4, 3, '06:30', '08:00', 8,  2,  'Ashtanga'),
        ('Hatha Tardío',       2, 3, '19:00', '20:00', 10, 9,  'Hatha'),
        ('Yin Nocturno',       3, 3, '20:30', '21:45', 10, 6,  'Yin'),
        ('Vinyasa Power',      1, 4, '07:00', '08:15', 12, 5,  'Vinyasa'),
        ('Hatha Relajante',    2, 4, '10:00', '11:00', 10, 8,  'Hatha'),
        ('Yin Cierre',         3, 4, '18:00', '19:15', 10, 10, 'Yin'),
        ('Vinyasa Weekend',    1, 5, '09:00', '10:30', 15, 7,  'Vinyasa'),
        ('Ashtanga Morning',   4, 5, '11:00', '12:30', 10, 3,  'Ashtanga'),
        ('Yin Weekend',        3, 5, '16:00', '17:30', 10, 5,  'Yin'),
        ('Hatha Domingo',      2, 6, '10:00', '11:30', 12, 9,  'Hatha'),
        ('Yoga Restaurativo',  3, 6, '17:00', '18:30', 8,  8,  'Restaurativo')
    `);
    console.log('  ✅ 20 clases semanales insertadas');

    // ── Reservas de ejemplo ────────────────────────────────
    const hoy = fmt(today);
    const ayer = addDays(today, -1);
    await client.query(`
      INSERT INTO reservas (usuario_id, clase_id, fecha_reserva, estado_asistencia) VALUES
        (2, 8, $1, 'pendiente'),
        (3, 8, $1, 'pendiente'),
        (4, 8, $1, 'pendiente'),
        (5, 9, $1, 'pendiente'),
        (2, 3, $2, 'asistió'),
        (3, 3, $2, 'asistió'),
        (5, 13,$2, 'ausente')
    `, [hoy, ayer]);
    console.log('  ✅ Reservas de ejemplo insertadas');

    await client.query('COMMIT');

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   Admin  → admin@respira.com   / admin1234');
    console.log('   Alumno → elena@mail.com       / cliente123');
    console.log('   Alumno → marco@mail.com       / cliente123');
    console.log('   Alumno → sofia@mail.com       / cliente123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
