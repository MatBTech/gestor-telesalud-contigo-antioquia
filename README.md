# Gestor de Telesalud Contigo Antioquia

Aplicativo web para el programa de telemedicina rural **Contigo Antioquia**: registro de teleconsultas,
inventario de kits satelitales, municipios geolocalizados con OpenStreetMap, soportes (actas y fotos) y
dashboard de estadisticas.

| Capa | Tecnologia |
|---|---|
| Backend | Node.js 22, NestJS 11, TypeORM, PostgreSQL |
| Frontend | Angular 20 (standalone), Angular Material 20, diseno responsive |
| Seguridad | JWT con roles `administrador`, `coordinador`, `medico_ebs` |
| API externa | OpenStreetMap Nominatim |
| Archivos | Carpeta local `backend/uploads` (PDF, JPG, PNG hasta 5 MB) |

Colores de la interfaz: verde institucional `#00843D` (principal), verde oscuro `#005C2A`
y amarillo `#FCC500` (acento), definidos en `frontend/src/styles.scss`.

---

## 1. Que debe instalar

| Programa | Version | Para que | Enlace |
|---|---|---|---|
| Node.js | 20.19+ o 22 LTS | Ejecutar backend y frontend | https://nodejs.org |
| PostgreSQL | 14 o superior | Base de datos | https://www.postgresql.org/download/windows/ |
| Angular CLI (opcional) | 20 | Comando `ng` global | `npm install -g @angular/cli` |
| NestJS CLI (opcional) | 11 | Comando `nest` global | `npm install -g @nestjs/cli` |
| Docker Desktop (alternativa) | — | Correr PostgreSQL sin instalarlo | https://www.docker.com/products/docker-desktop |

Los CLI globales son opcionales: el proyecto ya los trae como dependencias y se usan con `npm run ...` o `npx`.
Durante la instalacion de PostgreSQL anote la contrasena del usuario `postgres`.

## 2. Crear la base de datos

**Opcion A, PostgreSQL instalado:** abra *SQL Shell (psql)* o pgAdmin y ejecute:

```sql
CREATE DATABASE telesalud_antioquia;
```

**Opcion B, Docker:** desde la carpeta raiz del proyecto:

```bash
docker compose up -d
```

No hace falta crear tablas ni insertar roles: al arrancar, el backend crea las tablas
(`synchronize: true` en desarrollo) y el `SeedService` inserta los tres roles y el administrador inicial.
Si prefiere hacerlo a mano, use `backend/database/seed.sql` (tambien trae 5 municipios de ejemplo).

## 3. Ejecutar el backend

```bash
cd backend
copy .env.example .env      # en PowerShell: Copy-Item .env.example .env
# edite .env: DB_PASSWORD con su contrasena de postgres y un JWT_SECRET propio
npm install
npm run start:dev
```

La API queda en `http://localhost:3000/api`. En la consola debe ver
`Administrador inicial creado (admin@telesalud.local)`.

## 4. Ejecutar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Abra `http://localhost:4200` e ingrese con:
- Admin
- Correo: `admin@telesalud.local`
- Contrasena: `Medico12345` (cambiela en *Usuarios* despues del primer ingreso)

- Medico
- Correo: `medico@telesalud.local`
- Contrasena: `Admin12345`

- Coordinador
- Correo: `coordinadora@telesalud.local`
- Contrasena: `Cor12345`

## 5. Recorrido sugerido de prueba (Fase 9)

1. **Login y token:** ingrese como administrador. En las herramientas del navegador (F12 > Red), cualquier
   peticion a `/api` lleva la cabecera `Authorization: Bearer ...`.
2. **Usuarios:** cree un coordinador y un medico EBS.
3. **Municipios + Nominatim:** cree "Urrao" (Suroeste) sin coordenadas; al guardar aparece con origen
   *OpenStreetMap*. Pruebe un nombre inventado: el sistema pide coordenadas manuales.
4. **Kits:** cree `KIT-0001` asignado a Urrao y otro asignado a un municipio sin atenciones.
5. **Atenciones:** ingrese como medico, registre una atencion y adjunte un PDF o JPG. Descarguelo desde el listado.
6. **Dashboard:** como administrador o coordinador, revise totales, barras y la alerta de municipios con kit
   sin atenciones en 30 dias.

Esta verificacion ya se ejecuto de forma automatica contra la API real: 55 de 55 casos correctos
(login, roles, Nominatim, kits, atenciones, carga y descarga, dashboard y validaciones).

## 6. Permisos por rol

| Accion | Administrador | Coordinador | Medico EBS |
|---|:-:|:-:|:-:|
| Dashboard | Si | Si | No |
| Ver atenciones y municipios | Si | Si | Si |
| Registrar atenciones y subir soportes | Si | No | Si (solo las propias) |
| Crear y editar municipios, gestionar kits | Si | Si | No |
| Eliminar registros | Si | No | No |
| Gestionar usuarios | Si | No | No |
| Editar su propio nombre y contrasena (Mi perfil) | Si | Si | Si |

## 7. Endpoints principales

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/login` | Inicio de sesion (publico). 4 intentos fallidos desde una misma IP la bloquean 20 minutos (429) |
| POST | `/api/auth/register` | Registrar usuario (solo administrador) |
| GET/PATCH | `/api/auth/perfil` | Ver y editar el nombre propio (cualquier usuario) |
| PATCH | `/api/auth/cambiar-password` | Cambiar la contraseña propia (exige la actual) |
| GET/PATCH | `/api/usuarios`, `/api/usuarios/:id` | Gestion de usuarios |
| GET/POST/PATCH/DELETE | `/api/municipios` | CRUD; `GET /api/municipios/geocodificar?nombre=` consulta Nominatim |
| GET/POST/PATCH/DELETE | `/api/atenciones` | CRUD con filtros `municipioId`, `especialidad`, `resueltoEnTerritorio`, `pagina`, `limite` |
| GET/POST/DELETE | `/api/kits`; PATCH `/api/kits/:id` (código y descripción) y `/api/kits/:id/estado` | Inventario, edición y cambio de estado |
| POST | `/api/archivos/upload` | multipart: `archivo` + `atencionId` |
| GET | `/api/archivos/download/:id` | Descarga protegida con JWT (StreamableFile) |
| GET | `/api/dashboard` | Todas las estadisticas (tambien hay endpoints individuales) |

## 8. Archivos por fase

**Fase 1, configuracion del backend** (`backend/`)
- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.env.example`
- `src/main.ts`, `src/app.module.ts`
- `src/common/constantes.ts`, `src/common/transformadores.ts`
- `src/entidades/rol.entity.ts`, `usuario.entity.ts`, `municipio.entity.ts`, `atencion.entity.ts`, `kit.entity.ts`, `archivo.entity.ts`, `index.ts`
- `src/seed/seed.module.ts`, `src/seed/seed.service.ts`, `database/seed.sql`

**Fase 2, autenticacion** (`backend/src/auth/`)
- `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`
- `guards/jwt-auth.guard.ts`, `guards/roles.guard.ts`
- `decorators/roles.decorator.ts`, `decorators/usuario-actual.decorator.ts`
- `dto/login.dto.ts`, `dto/register.dto.ts`, `interfaces/usuario-token.interface.ts`

**Fase 3, CRUD** (`backend/src/`)
- `usuarios/`: `usuarios.module.ts`, `usuarios.service.ts`, `usuarios.controller.ts`, `dto/actualizar-usuario.dto.ts`
- `municipios/`: `municipios.module.ts`, `municipios.service.ts`, `municipios.controller.ts`, `nominatim.service.ts`, `dto/crear-municipio.dto.ts`, `dto/actualizar-municipio.dto.ts`
- `atenciones/`: `atenciones.module.ts`, `atenciones.service.ts`, `atenciones.controller.ts`, `dto/crear-atencion.dto.ts`, `dto/actualizar-atencion.dto.ts`, `dto/filtro-atenciones.dto.ts`
- `kits/`: `kits.module.ts`, `kits.service.ts`, `kits.controller.ts`, `dto/crear-kit.dto.ts`, `dto/cambiar-estado-kit.dto.ts`, `dto/filtro-kits.dto.ts`

**Fase 4, archivos** (`backend/src/archivos/`)
- `archivos.module.ts`, `archivos.service.ts`, `archivos.controller.ts`
- `config/multer.config.ts`, `filtros/subida-archivo.filter.ts`, `dto/subir-archivo.dto.ts`

**Fase 5, dashboard** (`backend/src/dashboard/`)
- `dashboard.module.ts`, `dashboard.service.ts`, `dashboard.controller.ts`

**Fase 6, configuracion del frontend** (`frontend/`)
- `package.json`, `angular.json`, `tsconfig.json`, `tsconfig.app.json`
- `src/index.html`, `src/main.ts`, `src/styles.scss`, `src/environments/environment.ts`, `environment.prod.ts`
- `src/app/app.component.ts`, `src/app/app.config.ts`, `src/app/core/paginador-espanol.ts`
- `src/app/core/constantes.ts`, `src/app/core/models/modelos.ts`

**Fase 7, autenticacion en el frontend** (`frontend/src/app/`)
- `core/services/auth.service.ts`, `core/services/notificacion.service.ts`, `core/services/api.services.ts`
- `core/interceptors/jwt.interceptor.ts`, `core/interceptors/error.interceptor.ts`
- `core/guards/auth.guard.ts`, `core/guards/role.guard.ts`, `core/guards/cambios-pendientes.guard.ts`
- `core/validadores.ts`, `shared/confirmar-dialogo.component.ts`
- `features/auth/login/login.component.ts|html|scss`, `app.routes.ts`

**Fase 8, componentes** (`frontend/src/app/`)
- `layout/layout.component.ts|html|scss` (mat-sidenav responsive)
- `features/dashboard/dashboard.component.ts|html|scss`
- `features/atenciones/lista-atenciones/lista-atenciones.component.ts|html`
- `features/atenciones/form-atencion/form-atencion.component.ts|html|scss`
- `features/kits/lista-kits/...`, `features/kits/dialogo-kit/...`
- `features/municipios/lista-municipios/...`, `features/municipios/dialogo-municipio/...`
- `features/usuarios/lista-usuarios/...`, `features/usuarios/dialogo-usuario/...`

## 9. Validaciones para evitar errores de usuario

- Selects y autocompletados en lugar de texto libre (especialidad, subregion, municipio, rol y estado del kit).
  El municipio debe elegirse de la lista.
- Mensajes en espanol debajo de cada campo, contadores de caracteres y campos obligatorios marcados.
- Fecha elegida en un calendario de solo lectura: no se aceptan fechas futuras ni con mas de un ano de antiguedad.
- "Resuelto en territorio" empieza sin respuesta, para obligar a una decision consciente.
- El archivo se valida en el navegador (tipo y tamano) y en el servidor (tipo, extension, tamano y firma real
  del contenido). Si falla una validacion, el archivo subido se borra del disco.
- Confirmacion antes de eliminar, cambiar el estado de un kit, desactivar usuarios o cerrar sesion.
- Aviso al salir de un formulario con cambios sin guardar.
- Los botones se bloquean mientras se guarda, para evitar registros duplicados.
- Aviso de Bloq Mayus en el login y boton para ver la contrasena.
- Bloqueo por 20 minutos de la IP que acumule 4 intentos de inicio de sesion fallidos.
- La sesion se cierra sola cuando el token vence o el usuario es desactivado.
- En el backend: `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`, normalizacion de espacios y
  mayusculas, reglas de negocio (kit dado de baja es estado final, no se borran municipios con historial, un
  medico solo edita lo suyo).

Nota sobre `@angular/flex-layout`: esta descontinuado y no es compatible con Angular 17+. El diseno responsive
se hizo con CSS Grid y Flexbox, y con `BreakpointObserver` de `@angular/cdk/layout` para el menu lateral.
