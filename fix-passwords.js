/**
 * fix-passwords.js
 * ─────────────────────────────────────────────────────────────────
 * Repara las contraseñas de los usuarios demo en la BD.
 * Ejecutar desde la carpeta backend/:
 *
 *   node fix-passwords.js
 *
 * NO borra datos. Solo actualiza password_hash de los usuarios demo.
 * ─────────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./config/db');

const USUARIOS_DEMO = [
  { email: 'admin@respira.com', password: 'admin1234',  rol: 'admin'   },
  { email: 'elena@mail.com',    password: 'cliente123', rol: 'cliente' },
  { email: 'marco@mail.com',    password: 'cliente123', rol: 'cliente' },
  { email: 'sofia@mail.com',    password: 'cliente123', rol: 'cliente' },
  { email: 'pablo@mail.com',    password: 'cliente123', rol: 'cliente' },
  { email: 'isabel@mail.com',   password: 'cliente123', rol: 'cliente' },
];

async function fixPasswords() {
  console.log('🔧 Reparando contraseñas de usuarios demo...\n');

  try {
    // Verificar conexión
    await pool.query('SELECT 1');
    console.log('  ✅ Conexión a PostgreSQL exitosa\n');
  } catch (err) {
    console.error('  ❌ No se pudo conectar a la BD:', err.message);
    console.error('     Revisa tu archivo .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
    process.exit(1);
  }

  let updated = 0;
  let created = 0;

  for (const u of USUARIOS_DEMO) {
    const hash = await bcrypt.hash(u.password, 10);

    // Verificar si existe
    const { rows } = await pool.query(
      'SELECT id, email FROM usuarios WHERE email = $1',
      [u.email]
    );

    if (rows.length > 0) {
      // Actualizar hash
      await pool.query(
        'UPDATE usuarios SET password_hash = $1 WHERE email = $2',
        [hash, u.email]
      );
      console.log(`  🔑  [ACTUALIZADO] ${u.email}  →  password: ${u.password}`);
      updated++;
    } else {
      // Crear usuario si no existe
      await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, $4)`,
        [u.email.split('@')[0], u.email, hash, u.rol]
      );
      console.log(`  ➕  [CREADO]      ${u.email}  →  password: ${u.password}`);
      created++;
    }
  }

  console.log(`\n🎉 Listo! ${updated} actualizados, ${created} creados.\n`);
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│  Credenciales de acceso                             │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│  ADMIN   admin@respira.com    /  admin1234          │');
  console.log('│  ALUMNO  elena@mail.com       /  cliente123         │');
  console.log('│  ALUMNO  marco@mail.com       /  cliente123         │');
  console.log('└─────────────────────────────────────────────────────┘\n');

  await pool.end();
}

fixPasswords().catch((err) => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
