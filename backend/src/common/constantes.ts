// Archivo de constantes del dominio.
// Las listas se definen en un solo lugar para que los DTO, los servicios
// y la base de datos usen exactamente los mismos valores. Asi evitamos
// errores de escritura como "Pediatria" contra "Pediatría".

// Nombres de los roles del sistema. Se usan en los decoradores @Roles().
export const ROLES = {
  ADMINISTRADOR: 'administrador',
  COORDINADOR: 'coordinador',
  MEDICO_EBS: 'medico_ebs',
} as const;

export type NombreRol = (typeof ROLES)[keyof typeof ROLES];
export const LISTA_ROLES: string[] = Object.values(ROLES);

// Las nueve subregiones oficiales de Antioquia.
export const SUBREGIONES = [
  'Bajo Cauca',
  'Magdalena Medio',
  'Nordeste',
  'Norte',
  'Occidente',
  'Oriente',
  'Suroeste',
  'Urabá',
  'Valle de Aburrá',
];

// Especialidades que se atienden por teleconsulta en el programa.
export const ESPECIALIDADES = [
  'Medicina interna',
  'Pediatría',
  'Ginecología y obstetricia',
  'Psiquiatría',
  'Psicología',
  'Dermatología',
  'Cardiología',
  'Neurología',
  'Medicina familiar',
  'Nutrición y dietética',
];

// Estados posibles de un kit satelital.
export const ESTADOS_KIT = [
  'disponible',
  'asignado',
  'en_mantenimiento',
  'dado_de_baja',
] as const;
export type EstadoKit = (typeof ESTADOS_KIT)[number];

// Rectangulo aproximado que contiene al departamento de Antioquia.
// Sirve para rechazar coordenadas que claramente quedan por fuera,
// por ejemplo si Nominatim devuelve un municipio con el mismo nombre
// pero ubicado en otro departamento.
export const LIMITES_ANTIOQUIA = {
  latMin: 5.3,
  latMax: 9.0,
  lonMin: -77.3,
  lonMax: -73.8,
};

// Expresion regular para nombres de personas y lugares:
// letras (con tildes y enie), espacios, apostrofe, punto y guion.
export const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

// Reglas de la contrasena: minimo una minuscula, una mayuscula y un numero.
export const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

// Revisa si unas coordenadas caen dentro del rectangulo de Antioquia.
export function estaDentroDeAntioquia(lat: number, lon: number): boolean {
  return (
    lat >= LIMITES_ANTIOQUIA.latMin &&
    lat <= LIMITES_ANTIOQUIA.latMax &&
    lon >= LIMITES_ANTIOQUIA.lonMin &&
    lon <= LIMITES_ANTIOQUIA.lonMax
  );
}

// Inicio de sesion: tras este numero de intentos fallidos desde una misma IP,
// esa IP queda bloqueada los minutos indicados.
export const MAX_INTENTOS_LOGIN = 4;
export const MINUTOS_BLOQUEO_LOGIN = 20;
