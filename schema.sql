-- ============================================================
-- RespiraApp — Schema PostgreSQL
-- Estudio de Yoga "Respira Profundo"
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLAS
-- ============================================================

-- Instructores
CREATE TABLE instructores (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  especialidad   VARCHAR(100) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios
CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  rol            VARCHAR(10) NOT NULL DEFAULT 'cliente'
                 CHECK (rol IN ('admin', 'cliente')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Paquetes de clases disponibles
CREATE TABLE paquetes (
  id              SERIAL PRIMARY KEY,
  nombre_plan     VARCHAR(50) NOT NULL
                  CHECK (nombre_plan IN ('10 clases', '20 clases', 'ilimitado')),
  capacidad_clases INTEGER,          -- NULL = ilimitado
  vigencia_dias   INTEGER NOT NULL,
  precio          NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Paquetes asignados a usuarios
CREATE TABLE paquetes_usuarios (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  paquete_id          INTEGER NOT NULL REFERENCES paquetes(id),
  clases_disponibles  INTEGER,        -- NULL = ilimitado
  fecha_inicio        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE NOT NULL,
  estado              VARCHAR(10) NOT NULL DEFAULT 'activo'
                      CHECK (estado IN ('activo', 'vencido', 'agotado')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Clases semanales
CREATE TABLE clases (
  id                  SERIAL PRIMARY KEY,
  nombre_clase        VARCHAR(100) NOT NULL,
  instructor_id       INTEGER NOT NULL REFERENCES instructores(id),
  dia_semana          SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Lunes
  horario_inicio      TIME NOT NULL,
  horario_fin         TIME NOT NULL,
  cupos_totales       INTEGER NOT NULL DEFAULT 12,
  cupos_disponibles   INTEGER NOT NULL DEFAULT 12,
  tipo                VARCHAR(50) DEFAULT 'General',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cupos_validos CHECK (cupos_disponibles >= 0 AND cupos_disponibles <= cupos_totales)
);

-- Reservas de alumnos
CREATE TABLE reservas (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clase_id            INTEGER NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  fecha_reserva       DATE NOT NULL DEFAULT CURRENT_DATE,
  estado_asistencia   VARCHAR(10) NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_asistencia IN ('pendiente', 'asistió', 'ausente')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, clase_id, fecha_reserva)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_paquetes_usuarios_usuario ON paquetes_usuarios(usuario_id);
CREATE INDEX idx_reservas_usuario           ON reservas(usuario_id);
CREATE INDEX idx_reservas_clase             ON reservas(clase_id);
CREATE INDEX idx_clases_dia                 ON clases(dia_semana);
CREATE INDEX idx_clases_instructor          ON clases(instructor_id);

-- ============================================================
-- FUNCIÓN: Descuento transaccional de clases
-- Se llama al confirmar asistencia de un alumno
-- ============================================================
CREATE OR REPLACE FUNCTION descontar_clase(p_usuario_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_pu paquetes_usuarios%ROWTYPE;
  v_ilimitado BOOLEAN;
BEGIN
  SELECT pu.* INTO v_pu
  FROM paquetes_usuarios pu
  JOIN paquetes p ON p.id = pu.paquete_id
  WHERE pu.usuario_id = p_usuario_id
    AND pu.estado = 'activo'
  ORDER BY pu.fecha_inicio DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró paquete activo para el usuario %', p_usuario_id;
  END IF;

  SELECT (capacidad_clases IS NULL) INTO v_ilimitado
  FROM paquetes WHERE id = v_pu.paquete_id;

  IF NOT v_ilimitado THEN
    IF v_pu.clases_disponibles <= 0 THEN
      RAISE EXCEPTION 'El usuario % no tiene clases disponibles', p_usuario_id;
    END IF;

    UPDATE paquetes_usuarios
    SET clases_disponibles = clases_disponibles - 1,
        estado = CASE WHEN clases_disponibles - 1 <= 0 THEN 'agotado' ELSE estado END
    WHERE id = v_pu.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCIÓN: Actualizar estado de paquetes vencidos (cron/trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_paquetes_vencidos()
RETURNS INTEGER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE paquetes_usuarios
  SET estado = 'vencido'
  WHERE estado = 'activo'
    AND fecha_vencimiento < CURRENT_DATE;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ============================================================
-- SEED DATA
-- ⚠️  Los datos de usuarios (con hashes bcrypt reales) se
--     insertan desde el script: backend/seed.js
--     Ejecutar: cd backend && node seed.js
-- ============================================================

-- Datos estáticos que no requieren bcrypt:

-- Instructores
INSERT INTO instructores (nombre, especialidad) VALUES
  ('Ana López',    'Vinyasa Flow'),
  ('David Moreno', 'Hatha Yoga'),
  ('Camila Torres','Yin Yoga'),
  ('Rodrigo Silva','Ashtanga');

-- Paquetes
INSERT INTO paquetes (nombre_plan, capacidad_clases, vigencia_dias, precio) VALUES
  ('10 clases', 10,   30, 35000),
  ('20 clases', 20,   60, 60000),
  ('ilimitado', NULL, 30, 90000);
