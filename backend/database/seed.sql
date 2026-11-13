-- Script opcional de datos iniciales.
-- NOTA: no es obligatorio ejecutarlo. Al arrancar el backend, el SeedService
-- crea automaticamente los roles y el administrador. Este script sirve si se
-- quieren insertar los roles a mano o crear la base de datos desde psql.

-- 1. Crear la base de datos (ejecutar conectado a la base "postgres").
-- CREATE DATABASE telesalud_antioquia;

-- 2. Insertar los roles (ejecutar conectado a telesalud_antioquia, despues
--    de arrancar el backend al menos una vez para que existan las tablas).
INSERT INTO roles (nombre, descripcion) VALUES
  ('administrador', 'Gestiona usuarios y toda la informacion del sistema'),
  ('coordinador',   'Gestiona municipios, kits y consulta estadisticas'),
  ('medico_ebs',    'Medico del Equipo Basico de Salud, registra atenciones')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Municipios de ejemplo con coordenadas reales (opcional, para probar
--    el dashboard sin depender de Nominatim).
INSERT INTO municipios (nombre, subregion, latitud, longitud, "origenCoordenadas") VALUES
  ('Urrao',        'Suroeste',        6.317500, -76.134400, 'manual'),
  ('Turbo',        'Urabá',           8.093100, -76.728300, 'manual'),
  ('Caucasia',     'Bajo Cauca',      7.986600, -75.193300, 'manual'),
  ('Yarumal',      'Norte',           6.963300, -75.417500, 'manual'),
  ('Puerto Berrío','Magdalena Medio', 6.491800, -74.403300, 'manual')
ON CONFLICT (nombre) DO NOTHING;
