DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS cuentas;
DROP TABLE IF EXISTS usuarios;

-- Tabla de Usuarios
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL,
    jefe_id INTEGER,
    FOREIGN KEY(jefe_id) REFERENCES usuarios(id)
);

-- Tabla de Cuentas por Pagar
CREATE TABLE cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT NOT NULL,
    fecha_credito TEXT NOT NULL,
    fecha_limite TEXT,
    monto_total REAL NOT NULL,
    monto_abonado REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente'
);

-- Tabla de Movimientos (Ingresos y Egresos)
CREATE TABLE movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    concepto TEXT NOT NULL,
    tipo TEXT NOT NULL,
    monto REAL NOT NULL,
    metodo TEXT NOT NULL,
    clasificacion TEXT,
    sucursal TEXT,
    comentario TEXT,
    cuenta_id INTEGER,
    FOREIGN KEY(cuenta_id) REFERENCES cuentas(id)
);

-- Crear el usuario Administrador inicial (Contraseña temporal: admin123)
INSERT INTO usuarios (nombre, username, password, rol) 
VALUES ('Administrador Sistema', 'admin', 'admin123', 'admin');