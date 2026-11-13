// Script de datos de demostracion.
// Carga usuarios, municipios, kits, atenciones y soportes usando la API
// (no SQL directo), asi los datos pasan por las mismas validaciones que en
// el uso real y los municipios se geolocalizan con Nominatim.
//
// Requisitos: backend corriendo en http://localhost:3000 y conexion a internet.
// Uso (desde la carpeta backend):  node database/datos-demo.mjs
// Se puede ejecutar varias veces: lo que ya existe se omite (respuesta 409).

const API = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN = { correo: 'admin@telesalud.local', password: process.env.ADMIN_PASSWORD || 'Admin12345' };

// ---------- Utilidades ----------

async function api(metodo, ruta, token, body, form) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + ruta, { method: metodo, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const datos = await r.json().catch(() => ({}));
  return { status: r.status, datos };
}

const mensaje = (d) => (Array.isArray(d?.message) ? d.message.join(' | ') : d?.message);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Fecha de hace N dias a una hora de consulta (8:00 a 16:00).
function haceDias(dias, hora) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, (dias * 7) % 60, 0, 0);
  return d.toISOString();
}

async function login(correo, password) {
  const r = await api('POST', '/auth/login', null, { correo, password });
  if (r.status !== 200) throw new Error(`No se pudo iniciar sesion como ${correo}: ${mensaje(r.datos)}`);
  return r.datos.accessToken;
}

// PDF valido de una pagina con el texto del acta. Se calculan los offsets
// de la tabla xref para que cualquier lector de PDF lo abra sin quejarse.
function crearPdf(lineas) {
  const texto = lineas
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 60 ${760 - i * 22} Td (${l.replace(/[()\\]/g, '')}) Tj ET`)
    .join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(texto, 'latin1')} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// Imagen PNG pequena (verde institucional) como "evidencia fotografica".
const PNG_EVIDENCIA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHUlEQVR4nGNgYGj4TyRiGFU6qnRU6ajSUaWDSykAX+v/AdCtK8kAAAAASUVORK5CYII=',
  'base64',
);

// ---------- Datos ----------

const USUARIOS = [
  { nombreCompleto: 'Carolina Restrepo Vélez', correo: 'coordinadora@telesalud.local', password: 'Coord12345', rol: 'coordinador' },
  { nombreCompleto: 'Andrés Felipe Gómez', correo: 'medico@telesalud.local', password: 'Medico12345', rol: 'medico_ebs' },
  { nombreCompleto: 'Luisa Fernanda Ríos', correo: 'medica2@telesalud.local', password: 'Medico12345', rol: 'medico_ebs' },
];

// Los municipios sin coordenadas se geolocalizan con Nominatim. Las
// coordenadas de "respaldo" solo se usan si la API externa no responde.
// Vigia del Fuerte se carga a proposito con coordenadas manuales para que
// la demo muestre los dos origenes.
const MUNICIPIOS = [
  { nombre: 'Urrao', subregion: 'Suroeste', respaldo: [6.3168, -76.1345] },
  { nombre: 'Jardín', subregion: 'Suroeste', respaldo: [5.599, -75.8192] },
  { nombre: 'Turbo', subregion: 'Urabá', respaldo: [8.0931, -76.7283] },
  { nombre: 'Caucasia', subregion: 'Bajo Cauca', respaldo: [7.9866, -75.1933] },
  { nombre: 'Yarumal', subregion: 'Norte', respaldo: [6.9633, -75.4175] },
  { nombre: 'Puerto Berrío', subregion: 'Magdalena Medio', respaldo: [6.4918, -74.4033] },
  { nombre: 'Santa Fe de Antioquia', subregion: 'Occidente', respaldo: [6.5567, -75.8278] },
  { nombre: 'Rionegro', subregion: 'Oriente', respaldo: [6.1551, -75.3737] },
  { nombre: 'Segovia', subregion: 'Nordeste', respaldo: [7.0799, -74.7012] },
  { nombre: 'Vigía del Fuerte', subregion: 'Urabá', manual: [6.5856, -76.8956] },
];

// Kits: [codigo, descripcion, municipio asignado o null, estado final].
// Segovia y Vigia del Fuerte tienen kit pero no tendran atenciones, y
// Puerto Berrio solo tendra atenciones antiguas: los tres aparecen en la
// alerta del dashboard (kit sin atenciones en los ultimos 30 dias).
const KITS = [
  ['KIT-0001', 'Antena satelital + router + tensiómetro digital', 'Urrao', 'asignado'],
  ['KIT-0002', 'Antena satelital + router + pulsioxímetro', 'Turbo', 'asignado'],
  ['KIT-0003', 'Antena satelital + router + electrocardiógrafo portátil', 'Caucasia', 'asignado'],
  ['KIT-0004', 'Antena satelital + router + glucómetro', 'Yarumal', 'asignado'],
  ['KIT-0005', 'Antena satelital + router + otoscopio digital', 'Jardín', 'asignado'],
  ['KIT-0006', 'Antena satelital + router + tensiómetro digital', 'Puerto Berrío', 'asignado'],
  ['KIT-0007', 'Antena satelital + router + pulsioxímetro', 'Segovia', 'asignado'],
  ['KIT-0008', 'Antena satelital + router', 'Vigía del Fuerte', 'asignado'],
  ['KIT-0009', 'Antena satelital + router + dermatoscopio', null, 'en_mantenimiento'],
  ['KIT-0010', 'Antena satelital + router', null, 'disponible'],
  ['KIT-0011', 'Antena satelital (modelo anterior)', null, 'dado_de_baja'],
];

// Atenciones: [paciente, especialidad, municipio, motivo, resuelto, hace N dias, medico (0 o 1)].
const ATENCIONES = [
  ['María Elena Cardona', 'Medicina interna', 'Urrao', 'Control de hipertensión arterial con cifras elevadas en la última semana', true, 2, 0],
  ['José Antonio Pérez', 'Pediatría', 'Urrao', 'Fiebre persistente de tres días en menor de cuatro años', true, 4, 0],
  ['Ana Lucía Zapata', 'Ginecología y obstetricia', 'Urrao', 'Control prenatal de segundo trimestre, embarazo de bajo riesgo', true, 9, 0],
  ['Luis Carlos Montoya', 'Cardiología', 'Urrao', 'Dolor torácico atípico con antecedente de infarto, requiere valoración presencial', false, 15, 0],
  ['Sandra Milena Úsuga', 'Psicología', 'Urrao', 'Seguimiento de episodio de ansiedad posterior a desplazamiento', true, 22, 0],
  ['Yorladis Palacios', 'Pediatría', 'Turbo', 'Enfermedad diarreica aguda con deshidratación leve', true, 1, 1],
  ['Wilmar Mosquera', 'Dermatología', 'Turbo', 'Lesiones cutáneas pruriginosas en antebrazos de dos semanas de evolución', true, 5, 1],
  ['Rosa Elvira Cuesta', 'Medicina interna', 'Turbo', 'Control de diabetes tipo 2 con glucometrías altas', true, 11, 1],
  ['Deiner Asprilla', 'Neurología', 'Turbo', 'Cefalea intensa con pérdida de fuerza en brazo derecho, se remite a urgencias', false, 18, 1],
  ['Kelly Johana Rentería', 'Ginecología y obstetricia', 'Turbo', 'Sangrado vaginal en primer trimestre, se remite para ecografía', false, 27, 1],
  ['Hernán Darío Ospina', 'Medicina interna', 'Caucasia', 'Tos crónica y pérdida de peso, se solicita estudio de tuberculosis', false, 3, 0],
  ['Claudia Patricia Berrío', 'Nutrición y dietética', 'Caucasia', 'Desnutrición moderada en adulto mayor, plan alimentario', true, 8, 0],
  ['Juan David Arrieta', 'Pediatría', 'Caucasia', 'Infección respiratoria aguda en lactante de ocho meses', true, 13, 0],
  ['Marta Cecilia Ruiz', 'Psiquiatría', 'Caucasia', 'Ajuste de tratamiento para depresión moderada', true, 25, 0],
  ['Fabio Nelson Echeverri', 'Cardiología', 'Yarumal', 'Palpitaciones y fatiga, electrocardiograma con arritmia leve', true, 6, 1],
  ['Gloria Amparo Henao', 'Medicina familiar', 'Yarumal', 'Valoración integral de adulto mayor con varias enfermedades crónicas', true, 12, 1],
  ['Esteban Correa', 'Dermatología', 'Yarumal', 'Quemadura de segundo grado en mano, curación y seguimiento', true, 20, 1],
  ['Paula Andrea Giraldo', 'Psicología', 'Jardín', 'Primera consulta por síntomas de estrés laboral y alteraciones del sueño', true, 3, 0],
  ['Ramiro Alzate', 'Medicina interna', 'Jardín', 'Control de enfermedad pulmonar obstructiva crónica', true, 16, 0],
  ['Valentina Mejía', 'Pediatría', 'Santa Fe de Antioquia', 'Control de crecimiento y desarrollo, esquema de vacunación incompleto', true, 7, 1],
  ['Orlando Tobón', 'Neurología', 'Rionegro', 'Seguimiento de epilepsia controlada, renovación de fórmula', true, 10, 1],
  ['Beatriz Elena Arango', 'Nutrición y dietética', 'Rionegro', 'Obesidad grado uno, plan nutricional y actividad física', true, 19, 1],
  // Atenciones antiguas (mas de 30 dias): Puerto Berrio queda en la alerta del dashboard.
  ['Nelson Enrique Durango', 'Medicina interna', 'Puerto Berrío', 'Control de hipertensión, ajuste de dosis de losartán', true, 45, 0],
  ['Lina Marcela Quiroz', 'Ginecología y obstetricia', 'Puerto Berrío', 'Control posparto con anemia leve', true, 60, 0],
  ['Camilo Andrés Vélez', 'Psiquiatría', 'Urrao', 'Valoración inicial por consumo problemático de alcohol', false, 75, 0],
];

// ---------- Ejecucion ----------

async function main() {
  console.log('Datos de demostracion para el Gestor de Telesalud\n');
  const tAdmin = await login(ADMIN.correo, ADMIN.password);

  console.log('[1/5] Usuarios');
  for (const u of USUARIOS) {
    const r = await api('POST', '/auth/register', tAdmin, u);
    console.log(`  ${r.status === 201 ? 'creado ' : r.status === 409 ? 'ya existe' : 'ERROR ' + mensaje(r.datos)}  ${u.correo} (${u.rol})`);
  }
  const tCoord = await login(USUARIOS[0].correo, USUARIOS[0].password);
  const tMedicos = [await login(USUARIOS[1].correo, USUARIOS[1].password), await login(USUARIOS[2].correo, USUARIOS[2].password)];

  console.log('\n[2/5] Municipios (geolocalizados con OpenStreetMap Nominatim)');
  for (const m of MUNICIPIOS) {
    const body = { nombre: m.nombre, subregion: m.subregion };
    if (m.manual) Object.assign(body, { latitud: m.manual[0], longitud: m.manual[1] });
    let r = await api('POST', '/municipios', tCoord, body);
    // Si Nominatim no responde se usan las coordenadas de respaldo.
    if (r.status === 422 && m.respaldo) {
      r = await api('POST', '/municipios', tCoord, { ...body, latitud: m.respaldo[0], longitud: m.respaldo[1] });
    }
    if (r.status === 201) {
      console.log(`  creado    ${m.nombre.padEnd(22)} ${r.datos.latitud}, ${r.datos.longitud}  origen: ${r.datos.origenCoordenadas}`);
    } else {
      console.log(`  ${r.status === 409 ? 'ya existe' : 'ERROR ' + mensaje(r.datos)}  ${m.nombre}`);
    }
    // La politica de uso de Nominatim pide maximo una peticion por segundo.
    if (!m.manual) await esperar(1100);
  }
  const municipios = (await api('GET', '/municipios', tCoord)).datos;
  const idMunicipio = (nombre) => municipios.find((x) => x.nombre === nombre)?.id;

  console.log('\n[3/5] Kits satelitales');
  for (const [codigo, descripcion, municipio, estadoFinal] of KITS) {
    const r = await api('POST', '/kits', tCoord, { codigo, descripcion, municipioId: municipio ? idMunicipio(municipio) : undefined });
    if (r.status === 201 && estadoFinal !== r.datos.estado) {
      await api('PATCH', `/kits/${r.datos.id}/estado`, tCoord, { estado: estadoFinal });
    }
    console.log(`  ${r.status === 201 ? 'creado ' : r.status === 409 ? 'ya existe' : 'ERROR ' + mensaje(r.datos)}  ${codigo} -> ${municipio ?? estadoFinal}`);
  }

  console.log('\n[4/5] Atenciones y [5/5] soportes');
  const existentes = (await api('GET', '/atenciones?limite=100', tAdmin)).datos.datos ?? [];
  let n = 0;
  for (const [paciente, especialidad, municipio, motivo, resuelto, dias, medico] of ATENCIONES) {
    if (existentes.some((a) => a.nombrePaciente === paciente)) {
      console.log(`  ya existe  ${paciente}`);
      continue;
    }
    const token = tMedicos[medico];
    const r = await api('POST', '/atenciones', token, {
      nombrePaciente: paciente,
      especialidad,
      municipioId: idMunicipio(municipio),
      motivoConsulta: motivo,
      resueltoEnTerritorio: resuelto,
      fechaAtencion: haceDias(dias, 8 + (n % 8)),
    });
    if (r.status !== 201) {
      console.log(`  ERROR ${paciente}: ${mensaje(r.datos)}`);
      continue;
    }
    // Dos de cada tres atenciones llevan acta en PDF; algunas tambien foto.
    let soportes = '';
    if (n % 3 !== 2) {
      const pdf = crearPdf([
        'Acta de teleconsulta - Contigo Antioquia',
        `Paciente: ${paciente}`,
        `Municipio: ${municipio}`,
        `Especialidad: ${especialidad}`,
        `Resuelto en territorio: ${resuelto ? 'Si' : 'No, remitido'}`,
        'Documento de demostracion generado automaticamente.',
      ]);
      const f = new FormData();
      f.append('archivo', new Blob([pdf], { type: 'application/pdf' }), `Acta_${paciente.split(' ')[0]}_${municipio.replace(/\s/g, '')}.pdf`);
      f.append('atencionId', String(r.datos.id));
      const s = await api('POST', '/archivos/upload', token, null, f);
      soportes += s.status === 201 ? ' +acta PDF' : ` (error acta: ${mensaje(s.datos)})`;
    }
    if (n % 4 === 0) {
      const f = new FormData();
      f.append('archivo', new Blob([PNG_EVIDENCIA], { type: 'image/png' }), `Evidencia_${municipio.replace(/\s/g, '')}.png`);
      f.append('atencionId', String(r.datos.id));
      const s = await api('POST', '/archivos/upload', token, null, f);
      soportes += s.status === 201 ? ' +foto PNG' : ` (error foto: ${mensaje(s.datos)})`;
    }
    console.log(`  creada  ${paciente.padEnd(26)} ${municipio.padEnd(22)} hace ${String(dias).padStart(2)} dias${soportes}`);
    n++;
  }

  const d = (await api('GET', '/dashboard', tAdmin)).datos;
  console.log('\nResumen del dashboard');
  console.log(`  Atenciones: ${d.resumen.totalAtenciones}  |  resueltas en territorio: ${d.resumen.porcentajeResolucion}%`);
  console.log(`  Municipios: ${d.resumen.totalMunicipios}  |  kits asignados: ${d.resumen.kitsAsignados} de ${d.resumen.totalKits}`);
  console.log(`  Alerta (kit sin atenciones en 30 dias): ${d.municipiosSinAtencion.map((m) => m.nombre).join(', ') || 'ninguno'}`);
  console.log('\nUsuarios para la demo:');
  console.log(`  administrador  ${ADMIN.correo} / ${ADMIN.password}`);
  for (const u of USUARIOS) console.log(`  ${u.rol.padEnd(13)}  ${u.correo} / ${u.password}`);
}

main().catch((e) => {
  console.error('\nNo se pudieron cargar los datos:', e.message);
  console.error('Verifique que el backend este corriendo (npm run start:dev) y que haya internet.');
  process.exit(1);
});
