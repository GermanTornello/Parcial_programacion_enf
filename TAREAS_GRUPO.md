# TP Final Programación III – División de tareas

**Grupo:** Germán, Leo, Santiago, Pablo
**Entrega:** 03/11/2026
**Proyecto:** **Enfered** – marketplace de enfermería domiciliaria
**Repo:** https://github.com/GermanTornello/Parcial_programacion_enf

> 📖 **¿Primera vez? Leé antes [GUIA_ENFERED.md](GUIA_ENFERED.md)**: explica qué es Enfered y cómo funciona, con palabras simples.
>
> **Cómo usar este archivo con la IA:** copiá TODO este archivo y pegáselo a la IA, y agregá al final:
> *"Soy [tu nombre]. Ayudame a hacer MI parte respetando exactamente el contrato compartido (puertos, endpoints, modelos, roles y nombres de variables)."*
> El contrato (sección 2) es lo que permite que front y back trabajen en paralelo sin pisarse. **Si alguien necesita cambiarlo, lo avisa en el grupo antes.**

---

## 1. La problemática y la solución

**Problema:** conseguir un enfermero/a a domicilio hoy es informal: "boca a boca", grupos de WhatsApp o agencias. Hay demoras, no hay garantía de que el profesional esté matriculado y es difícil resolver necesidades puntuales (una inyección, una curación, un control de signos vitales).

**Solución – Enfered:** una plataforma que conecta pacientes con enfermeros/as independientes **verificados**:
- **Pacientes** buscan enfermeros cerca de su domicilio (por distancia, especialidad y servicio), les **solicitan un servicio** con fecha, hora y dirección, **chatean** con el enfermero cuando acepta y al final **lo califican**.
- **Enfermeros** se registran con su matrícula, cargan especialidades, servicios que ofrecen, zona y horarios, y gestionan las solicitudes que reciben (aceptar, rechazar, marcar realizada).
- **Admin** valida las matrículas (nadie aparece en las búsquedas sin estar aprobado), gestiona usuarios y el catálogo de servicios.

---

## 2. CONTRATO COMPARTIDO (lo tienen que respetar todos)

### 2.1 Stack
- **Backend:** **NestJS 12** (TypeScript) – crear cada servicio con `npx @nestjs/cli@12 new <nombre>`. Librerías: `@nestjs/mongoose`, `@nestjs/graphql` + `@nestjs/apollo` (code-first), `@nestjs/swagger`, `@nestjs/jwt` + `passport-jwt`, `@nestjs/config`, `class-validator`, `bcrypt`, **`helmet`** (en los 3 servicios) y **`@nestjs/throttler`** (límite de intentos en el login). Tests con **Vitest + Supertest** (vienen con Nest 12) y `mongodb-memory-server` para los e2e.
- **Base de datos:** MongoDB (un solo contenedor, **una base por microservicio**: `usuarios_db`, `solicitudes_db`, `resenas_db`).
- **Frontend:** React + Vite (JavaScript), React Router, Axios, **Leaflet + react-leaflet** (mapa con OpenStreetMap, gratis y sin API key), centrado por defecto en **Mendoza capital** (`-32.8895, -68.8458`). Diseño y textos según la **sección 2.11**. Tests con Vitest + React Testing Library.
- **Origen del frontend:** **no se hace de cero.** Partimos del front de **Enfered de Práctica Profesionalizante 3** (mismas tecnologías: React + Vite + axios + react-router + react-leaflet, ~50 componentes) y lo **adaptamos a este contrato**: se reescribe la capa de API para las 3 URLs, GraphQL y estas rutas. Lo que no tiene backend en el TP **se borra** (ver sección 3). El `README.md` tiene que **declarar** que el front parte del de Enfered (PP3). El backend sí se escribe de cero en NestJS: del código de PP3 solo se toman **las reglas**, no el código (era Flask).
- **Infra:** Docker + docker-compose.

### 2.2 Estructura del repo (monorepo)
```
/backend
   /usuarios-service     → NestJS, puerto 3001   (Santiago)
   /solicitudes-service  → NestJS, puerto 3002   (Germán)
   /resenas-service      → NestJS, puerto 3003   (Germán)
/frontend                → React + Vite, puerto 5173  (Pablo y Leo)
/docker/mongo-init       → scripts de inicialización de la base (Santiago)
docker-compose.yml       (Santiago) · cada uno hace el Dockerfile de lo suyo
README.md
docs/DOCUMENTO.md        → problemática + solución + arquitectura (Pablo)
```

### 2.3 Microservicios

| Servicio | Puerto | Base | Qué maneja | REST | GraphQL |
|---|---|---|---|---|---|
| usuarios-service | 3001 | usuarios_db | Registro/login, perfiles (Paciente, Enfermero, Admin), búsqueda geolocalizada, validación de matrículas | Sí | No |
| solicitudes-service | 3002 | solicitudes_db | Catálogo de servicios, solicitudes de servicio y sus estados, chat | Solicitudes y mensajes | **CRUD Servicios** |
| resenas-service | 3003 | resenas_db | Reseñas/calificaciones y reputación de cada enfermero | Solo `GET /` (estado) | **CRUD Reseñas** |

- Cada servicio: Swagger en **`/docs`**, GraphQL (si tiene) en **`/graphql`**, **CORS habilitado**, `ValidationPipe` global (`whitelist: true, transform: true`), `GET /` devuelve `{ servicio: '<nombre>', estado: 'ok' }`.
- **Autenticación:** el JWT lo emite `usuarios-service`. Los otros dos lo validan con el **mismo `JWT_SECRET`**. Cada servicio tiene su `JwtAuthGuard`, `RolesGuard` y decorador `@Roles(...)` (Santiago los arma y se los pasa a Germán). Para GraphQL, el guard toma el request con `GqlExecutionContext`.
- **Payload del JWT:** `{ sub: <userId>, email, rol, nombre }` (nombre = "Nombre Apellido") · expira en 1 día. **Header:** `Authorization: Bearer <token>`.
- **Comunicación entre servicios (HTTP con `@nestjs/axios` o `fetch`):**
  - `solicitudes-service` → `usuarios-service` `GET /enfermeros/:id`: al crear una solicitud verifica que el enfermero exista, esté **verificado**, **disponible** y **ofrezca ese servicio**.
  - `resenas-service` → `solicitudes-service` `GET /solicitudes/:id` (reenviando el token del paciente): al crear una reseña verifica que la solicitud sea del paciente y esté **REALIZADA**.
- **IDs:** todas las respuestas devuelven `id` (string), **no `_id`**. Usar en cada schema `toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { delete ret._id; } }` (y borrar `password` en usuarios).

### 2.4 Roles
`PACIENTE` · `ENFERMERO` · `ADMIN` (string exacto, en mayúsculas).

### 2.5 Variables de entorno
```
# Todos los servicios
MONGO_URI=mongodb://mongo:27017/<nombre_db>
JWT_SECRET=supersecreto_tp_prog3
PORT=3001 | 3002 | 3003

# usuarios-service (crea el admin y usuarios de prueba al arrancar si no existen)
ADMIN_EMAIL=admin@enfered.com
ADMIN_PASSWORD=Admin123!

# solicitudes-service
USUARIOS_URL=http://usuarios-service:3001

# resenas-service
SOLICITUDES_URL=http://solicitudes-service:3002

# Frontend
VITE_USUARIOS_URL=http://localhost:3001
VITE_SOLICITUDES_URL=http://localhost:3002
VITE_RESENAS_URL=http://localhost:3003
```

### 2.6 Modelos (MongoDB)

**Usuario** (usuarios_db) – una sola colección `usuarios` con **herencia usando discriminators de Mongoose** (`rol` es la clave): `Usuario → Paciente`, `Usuario → Enfermero`, `Usuario → Admin`.

Campos comunes (Usuario):
| campo | tipo | reglas |
|---|---|---|
| nombre, apellido | string | requeridos |
| email | string | requerido, **único** |
| password | string | bcrypt, **nunca se devuelve** |
| telefono | string | requerido |
| direccion | string | requerido |
| rol | enum | `PACIENTE` · `ENFERMERO` · `ADMIN` |

Solo **Paciente**:
| campo | tipo | reglas |
|---|---|---|
| dni | string | requerido, **único** |
| fechaNacimiento | Date | opcional |
| obraSocial | string | opcional |
| datosMedicos | string | opcional (alergias, medicación, etc.) |

Solo **Enfermero**:
| campo | tipo | reglas |
|---|---|---|
| matricula | string | requerida, **única** |
| especialidades | string[] | ej: `["Geriatría", "Pediatría", "Heridas"]` |
| departamento | enum | requerido · departamento de **Mendoza**: `Capital`, `Godoy Cruz`, `Guaymallén`, `Las Heras`, `Luján de Cuyo`, `Maipú`, `Lavalle`, `San Martín`, `Rivadavia`, `Junín`, `Santa Rosa`, `La Paz`, `Tupungato`, `Tunuyán`, `San Carlos`, `San Rafael`, `General Alvear`, `Malargüe` |
| aniosExperiencia | int | ≥ 0, default 0 |
| tarifaHora | number | opcional, ≥ 0 · tarifa propia por hora (es distinta del precio de referencia de cada servicio) |
| serviciosOfrecidos | string[] | ids de **Servicio** (sección 2.8) → **relación muchos-a-muchos** Enfermero ↔ Servicio |
| ubicacion | GeoJSON Point | `{ type: 'Point', coordinates: [lng, lat] }` · **índice `2dsphere`** |
| radioCoberturaKm | number | default 10 |
| disponible | boolean | default true |
| disponibilidad | `{ dia: 0-6, desde: 'HH:mm', hasta: 'HH:mm' }[]` | 0 = domingo |
| descripcion | string | opcional |
| estadoVerificacion | enum | `PENDIENTE` (default) · `APROBADO` · `RECHAZADO` |
| motivoRechazo | string | si fue rechazado |

**Servicio** (solicitudes_db) – catálogo
| campo | tipo | reglas |
|---|---|---|
| nombre | string | requerido, **único** |
| descripcion | string | opcional |
| duracionEstimadaMin | number | ≥ 5 · **default 60** |
| precioReferencia | number | ≥ 0 (solo informativo, no hay pagos) |
| activo | boolean | default true |

**SolicitudServicio** (solicitudes_db)
| campo | tipo | reglas |
|---|---|---|
| pacienteId, pacienteNombre | string | se toman del token |
| enfermeroId | string | requerido |
| enfermeroNombre | string | se toma de la respuesta de usuarios-service |
| servicio | ObjectId ref Servicio | requerido, activo |
| fecha | Date | requerida, no puede ser pasada |
| hora | string | `HH:mm` |
| direccionAtencion | string | requerida |
| notas | string | opcional |
| estado | enum | `PENDIENTE` (default) · `ACEPTADA` · `RECHAZADA` · `CANCELADA` · `REALIZADA` |
| motivoRechazo | string | opcional |
| canceladaPor | enum | `PACIENTE` · `ENFERMERO` (si se canceló) |
| motivoCancelacion | string | **obligatorio si cancela el enfermero**, opcional si cancela el paciente |

Reglas:
- Un enfermero no puede tener dos solicitudes `PENDIENTE`/`ACEPTADA` en la misma `fecha` + `hora` → **409**.
- La `fecha` no puede ser pasada ni estar a **más de 6 meses** → **400**.
- Un paciente puede tener como máximo **5 solicitudes `PENDIENTE`** a la vez → **409** ("Ya tenés 5 solicitudes pendientes").
- Si cancela el **enfermero**, el `motivo` es obligatorio → **400** si falta.
- Transiciones válidas (cualquier otra → **400**):
  - `PENDIENTE → ACEPTADA` o `RECHAZADA` (solo el enfermero de la solicitud)
  - `PENDIENTE` o `ACEPTADA → CANCELADA` (el paciente o el enfermero de la solicitud)
  - `ACEPTADA → REALIZADA` (solo el enfermero de la solicitud)

**Mensaje** (solicitudes_db) – chat de una solicitud (relación 1 a muchos)
| campo | tipo | reglas |
|---|---|---|
| solicitud | ObjectId ref SolicitudServicio | requerido |
| autorId, autorNombre | string | se toman del token |
| texto | string | 1 a 1000 caracteres |
| createdAt | Date | automático (`timestamps: true`) |

Regla: solo leen/escriben el paciente y el enfermero de la solicitud. Solo se puede **enviar** si la solicitud está `PENDIENTE` o `ACEPTADA` (si no → 400); leer, siempre.

**Reseña** (resenas_db)
| campo | tipo | reglas |
|---|---|---|
| solicitudId | string | requerido, **único** (máximo una reseña por solicitud) |
| pacienteId, pacienteNombre | string | se toman del token |
| enfermeroId | string | se toma de la solicitud |
| puntuacion | int | 1 a 5 |
| comentario | string | opcional, máx 500 |
| createdAt | Date | automático |

### 2.7 Endpoints

**usuarios-service (REST, :3001)**
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register/paciente` | público | Datos comunes + campos de Paciente. 409 si email o dni existen |
| POST | `/auth/register/enfermero` | público | Datos comunes + matricula, especialidades, departamento, aniosExperiencia, tarifaHora?, serviciosOfrecidos, ubicacion `{lat, lng}`. Queda `PENDIENTE`. 409 si email o matrícula existen |
| POST | `/auth/login` | público | `{ email, password }` → `{ access_token, user: { id, nombre, apellido, email, rol } }` · 401 si falla |
| GET | `/auth/me` | logueado | Usuario completo del token (sin password) |
| PATCH | `/perfil` | logueado | Edita su perfil (campos según su rol; no puede cambiar rol, email ni estadoVerificacion). Enfermero manda ubicación como `{ lat, lng }` |
| GET | `/enfermeros/buscar?lat=&lng=&radioKm=10&especialidad=&servicioId=&departamento=&disponible=` | público | Solo `APROBADO`. Usa `$geoNear`, ordenado por distancia. Cada resultado trae `distanciaKm` (1 decimal) |
| GET | `/enfermeros/:id` | público | Perfil público del enfermero (sin password ni email). 404 si no existe |
| GET | `/admin/enfermeros?estado=PENDIENTE` | ADMIN | Enfermeros por estado de verificación |
| PATCH | `/admin/enfermeros/:id/verificacion` | ADMIN | `{ estado: 'APROBADO' \| 'RECHAZADO', motivo? }` |
| GET | `/admin/usuarios?rol=&search=` | ADMIN | Lista/busca usuarios (nombre, apellido, email) |
| DELETE | `/admin/usuarios/:id` | ADMIN | Borra un usuario |

**solicitudes-service – GraphQL Servicios (:3002/graphql)**
```graphql
type Servicio { id: ID!, nombre: String!, descripcion: String, duracionEstimadaMin: Int!, precioReferencia: Float!, activo: Boolean! }

query    servicios(search: String, activo: Boolean): [Servicio!]!        # público
query    servicio(id: ID!): Servicio                                     # público
mutation createServicio(input: CreateServicioInput!): Servicio!          # ADMIN (409 si el nombre existe)
mutation updateServicio(id: ID!, input: UpdateServicioInput!): Servicio! # ADMIN
mutation removeServicio(id: ID!): Boolean!                               # ADMIN
```

**solicitudes-service – REST Solicitudes y Mensajes (:3002)**
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/solicitudes` | PACIENTE | `{ enfermeroId, servicioId, fecha: 'YYYY-MM-DD', hora: 'HH:mm', direccionAtencion, notas? }` |
| GET | `/solicitudes?estado=&desde=&hasta=` | logueado | PACIENTE: las suyas · ENFERMERO: las que recibió · ADMIN: todas. Con `servicio` populado, más nuevas primero |
| GET | `/solicitudes/:id` | participante o ADMIN | 403 si no participa · 404 si no existe |
| PATCH | `/solicitudes/:id/aceptar` | ENFERMERO (el de la solicitud) | |
| PATCH | `/solicitudes/:id/rechazar` | ENFERMERO (el de la solicitud) | `{ motivo? }` |
| PATCH | `/solicitudes/:id/cancelar` | participante | `{ motivo? }` · **obligatorio si cancela el enfermero** |
| PATCH | `/solicitudes/:id/realizar` | ENFERMERO (el de la solicitud) | |
| GET | `/solicitudes/:id/mensajes` | participante | Mensajes en orden cronológico |
| POST | `/solicitudes/:id/mensajes` | participante | `{ texto }` · solo si está `PENDIENTE` o `ACEPTADA` |

**resenas-service – GraphQL Reseñas (:3003/graphql)**
```graphql
type Resena { id: ID!, solicitudId: String!, pacienteId: String!, pacienteNombre: String!, enfermeroId: String!, puntuacion: Int!, comentario: String, createdAt: DateTime! }
type Reputacion { enfermeroId: String!, promedio: Float!, cantidad: Int! }

query    resenas(enfermeroId: String!): [Resena!]!                    # público, más nuevas primero
query    resena(id: ID!): Resena                                      # público
query    misResenas: [Resena!]!                                       # PACIENTE
query    reputacion(enfermeroId: String!): Reputacion!                # público (promedio 0 y cantidad 0 si no tiene)
query    reputaciones(enfermeroIds: [String!]!): [Reputacion!]!       # público (para la lista de búsqueda)
mutation createResena(input: CreateResenaInput!): Resena!             # PACIENTE · input: solicitudId, puntuacion, comentario?
mutation updateResena(id: ID!, input: UpdateResenaInput!): Resena!    # el autor
mutation removeResena(id: ID!): Boolean!                              # el autor o ADMIN
```
`createResena`: 400 si la solicitud no está REALIZADA · 403 si no es del paciente · 409 si ya tiene reseña.

### 2.8 Datos iniciales (los usan todos)

**Catálogo de servicios** (lo carga Santiago en `/docker/mongo-init`, **con estos `_id` fijos** para que los enfermeros de prueba puedan referenciarlos):
| _id | nombre | duración (min) | precio ref. |
|---|---|---|---|
| `650000000000000000000001` | Curaciones | 60 | 9000 |
| `650000000000000000000002` | Inyecciones | 60 | 5000 |
| `650000000000000000000003` | Control de signos vitales | 60 | 6000 |
| `650000000000000000000004` | Higiene y confort | 60 | 12000 |
| `650000000000000000000005` | Acompañamiento de adultos mayores | 120 | 20000 |
| `650000000000000000000006` | Cuidados Intensivos | 120 | 30000 |

**Usuarios de prueba** (los crea `usuarios-service` al arrancar si no existen – Santiago):
| email | contraseña | rol |
|---|---|---|
| admin@enfered.com | Admin123! | ADMIN |
| paciente@enfered.com | Paciente123! | PACIENTE |
| enfermera@enfered.com | Enfermera123! | ENFERMERO (APROBADO) |
| enfermero1@enfered.com … enfermero4@enfered.com | Enfermero123! | ENFERMERO (APROBADO) |

Ubicación de los enfermeros de prueba (todos **APROBADOS**, con distintos servicios y especialidades, para que la búsqueda y el mapa muestren resultados):
| email | departamento | lat, lng (aprox.) |
|---|---|---|
| enfermera@enfered.com | Capital | -32.8895, -68.8458 |
| enfermero1@enfered.com | Godoy Cruz | -32.9270, -68.8440 |
| enfermero2@enfered.com | Guaymallén | -32.9050, -68.7880 |
| enfermero3@enfered.com | Las Heras | -32.8500, -68.8280 |
| enfermero4@enfered.com | Luján de Cuyo | -33.0360, -68.8790 |

### 2.9 Errores (formato estándar de Nest)
`{ "statusCode": 409, "message": "El email ya está registrado", "error": "Conflict" }`
400 validación/transición inválida · 401 sin token o login inválido · 403 rol o dueño incorrecto · 404 no existe · 409 duplicado. En GraphQL el error viaja en `errors[0].message`. El front siempre muestra `message`.

### 2.10 Forma de trabajo con Git
- Cada uno trabaja en **su rama**: `german`, `santi`, `pablo`, `leo`. Al terminar algo que funciona, abre un **Pull Request a `main`**; otro del grupo le da un vistazo antes de mergear.
- Para traer lo nuevo de `main` a tu rama: `git checkout <tu-rama>` → `git pull origin main`.
- Commits chicos y descriptivos, en español. Cada uno toca **solo su carpeta** (salvo que se avise).
- **No subir** `node_modules`, `dist` ni `.env` (sí `.env.example`).

### 2.11 Identidad visual y textos (frontend)
**Estilo:** cálido, claro, de "cuidado cercano". Fondos claros, tarjetas simples con bordes finos y sombras suaves.

| Uso | Color |
|---|---|
| Texto | `#193b4d` |
| Texto secundario | `#607583` |
| Azul principal (botones y acciones) | `#167bb5` · oscuro `#11658f` · suave `#edf6fc` |
| Verde de acompañamiento | `#137e75` · suave `#e9f6f1` |
| Bordes | `#dfe8ec` |
| Fondo | `#f7f9fb` |
| Error | `#a52e3b` sobre `#fff2f3` |
| Éxito | `#176a50` sobre `#eef9f3` |
| Estrellas | dorado `#9a6800` |

- **Tipografía:** Segoe UI o la del sistema. Títulos de ~34 px, texto de 14 px, etiquetas de sección chicas en mayúsculas y en verde.
- **Marca:** "Enfered." con una cruz azul y el punto final verde.
- **Componentes:** botón primario azul y secundario blanco con borde, **mínimo 44 px de alto**; campos siempre con su etiqueta visible; avisos de error, éxito e información; tarjetas con radio de 14 a 16 px.
- **Colores por estado de la solicitud:** `PENDIENTE` amarillo suave, `ACEPTADA` azul, `REALIZADA` verde, `RECHAZADA`/`CANCELADA` tonos discretos. **Siempre con el texto del estado**, no solo el color.
- **Responsive:** en escritorio, navegación arriba; en celular (menos de 800 px), barra fija abajo. Probar en 320–390 px, 540 px, 800 px y escritorio.
- **Accesibilidad:** foco visible, todo operable con teclado, modales que se cierran con Escape, avisos con `aria-live` y cuatro estados en cada pantalla: **carga, vacío, error con "Reintentar" y éxito**.
- **Textos en voseo**, cálidos y claros: "Buscá", "Iniciá sesión", "Tenés 3 solicitudes". También en los mensajes de error del backend.

---

## 3. DIVISIÓN DE TAREAS

### 🔧 BACKEND

#### Santiago – usuarios-service + docker-compose + base de datos
1. **usuarios-service** (lo primero, porque todos dependen de esto):
   - `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, decorador `@Roles()` y decorador `@UsuarioActual()`. **Subirlos el jueves 30/10** y avisar en el grupo: Germán los usa en sus dos servicios.
   - Schema `Usuario` con discriminators `Paciente`, `Enfermero`, `Admin` (esto muestra la **herencia** del diagrama de clases).
   - Registro de paciente y de enfermero, login con bcrypt + JWT, `/auth/me`, `PATCH /perfil`.
   - Búsqueda geolocalizada con `$geoNear` + filtros, perfil público del enfermero.
   - Admin: validar/rechazar matrículas, listar y borrar usuarios.
   - Seed al arrancar: admin, paciente y enfermeros de prueba (sección 2.8).
   - Las reglas se pueden tomar de `usuario_routes.py`, `admin_routes.py` y `mapa_routes.py` de Enfered (PP3), reescritas en NestJS.
2. **Logging:** interceptor que loguee método, ruta, status y tiempo de cada request (con el `Logger` de Nest). Pasárselo a Germán.
3. **Seguridad (extras):** `helmet` en usuarios-service y **`@nestjs/throttler`** en el login.
4. **Docker:** el `Dockerfile` de usuarios-service + el **`docker-compose.yml`** que levante `mongo`, los 3 servicios y el front con las variables de la sección 2.5. Un solo `docker compose up --build`. **Probarlo el 31/10.**
5. **Scripts de inicialización** en `/docker/mongo-init/`: catálogo de servicios con los `_id` fijos (sección 2.8).
6. **Tests:**
   - Unit: **validación al crear** (registrar con datos inválidos, por ejemplo un enfermero sin matrícula → error de validación).
   - Unit: registrar con email ya existente → `ConflictException` (mockeando el modelo).
   - Unit: al editar el perfil, `serviciosOfrecidos` no guarda ids repetidos (relación muchos-a-muchos).
   - E2E: flujo **registro → login → crear un recurso con el token**, y que un PACIENTE reciba 403 en `/admin/...`.

#### Germán – solicitudes-service + resenas-service
1. **solicitudes-service**:
   - GraphQL CRUD de **Servicios** (catálogo). ✅ **Hecho, con tests.**
   - REST de **Solicitudes**: crear (validando contra usuarios-service), listar según rol, detalle, y las transiciones de estado con sus reglas.
   - REST de **Mensajes** (chat de la solicitud).
2. **resenas-service**: GraphQL CRUD de reseñas + `reputacion`/`reputaciones` (con `aggregate`), validando contra solicitudes-service que la solicitud esté REALIZADA.
3. Usar los guards/roles/logging que pasa Santiago. Si el jueves 30/10 no están, armarlos en sus servicios siguiendo el contrato (sección 2.3) para no frenarse.
4. **Seguridad (extras):** `helmet` en sus dos servicios.
5. **Docker:** el `Dockerfile` de solicitudes-service y el de resenas-service.
6. **Tests:**
   - Unit: crear un servicio con nombre repetido → `ConflictException`. ✅
   - Unit: transición inválida (ej. `PENDIENTE → REALIZADA`) → `BadRequestException`.
   - Unit (reseñas): `createResena` con solicitud no REALIZADA → `BadRequestException` (mockeando la llamada HTTP).
   - E2E: CRUD GraphQL de servicios ✅; paciente crea solicitud → enfermero la acepta → envían mensajes (mockeando usuarios-service); y otro paciente recibe 403 al querer verla.
7. Revisar que los 3 servicios tengan Swagger en `/docs` bien documentado.

### 🎨 FRONTEND (partimos del front de Enfered de PP3)

**Qué se borra del front de PP3** porque no tiene backend en el TP: búsqueda con IA (`BusquedaAsistida`), notificaciones (`Notificaciones`), auditoría (`AdminAuditoria`), recuperar contraseña (`RecuperarPassword`), aviso de cookies (`AvisoCookies`), **pagos** ("Ya pagué" / "Me llegó el pago"), **reprogramar** (`ReprogramarSolicitud`), **franjas horarias con estado** (`GestionHorarios`), compartir la ubicación del paciente (`LugarAtencionPaciente`, `UbicacionAtencion`), "Mi cuenta" (exportar o borrar la cuenta), denuncias de reseñas y que el enfermero califique al paciente. **Se borra, no se esconde**: así no queda código muerto.

#### Pablo – base del front, API, autenticación, perfiles, admin y tests
1. **Copiar el front de Enfered (PP3)** a `/frontend` y borrar lo de la lista de arriba. **Es lo primero: Leo depende de esto.**
2. **Capa de API** (`src/api.js` y `src/services/`): reescribirla para el contrato. Una instancia de Axios por servicio (con las `VITE_*`), interceptor que agrega el token y que desloguea ante un 401, helper `graphqlRequest(url, query, variables)` para servicios y reseñas, rutas y métodos de la sección 2.7 (por ejemplo, `PATCH /solicitudes/:id/realizar` en vez de `PUT .../finalizar`) y `id` en vez de los ids de SQL.
3. **Autenticación:** Login y Registro (paciente / enfermero) adaptados al contrato; `ProtectedRoute` con roles.
4. **Layout y componentes reutilizables:** los de PP3, revisados con la identidad visual de la **sección 2.11**.
5. **Mi perfil:** ver/editar. Para enfermero: especialidades, servicios ofrecidos (catálogo GraphQL), departamento, años de experiencia, tarifa por hora, ubicación, radio, disponible, horarios, estado de verificación.
6. **Panel Admin:** validar/rechazar matrículas, usuarios (listar, buscar, borrar), ABM del catálogo de servicios (GraphQL).
7. **Docker:** el `Dockerfile` del frontend.
8. **Tests de todo el front** (Vitest + React Testing Library; el front de PP3 no trae tests de componentes):
   - Login muestra error ante 401; `ProtectedRoute` redirige a /login sin token; el selector de estrellas permite elegir puntuación.
   - El formulario de solicitud valida campos obligatorios; la lista de búsqueda muestra tarjetas con distancia a partir de datos de prueba; el chat deshabilita el envío si la solicitud no está `PENDIENTE` ni `ACEPTADA`.

#### Leo – búsqueda, solicitudes, chat, reseñas y documentación
1. **Adaptar a la API nueva** las pantallas de PP3 (con datos de prueba mientras el back no esté):
   - **Buscar enfermeros** (`ListaEnfermeros`, `MapaEnfermeros`, `DirectoryFilters`): filtros (servicio, especialidad, departamento, radio, solo disponibles), mapa centrado en Mendoza, distancia y estrellas (`reputaciones`).
   - **Perfil público del enfermero** (`PerfilEnfermero`, `ResenasProfesional`): datos, servicios, horarios, reputación y reseñas, botón "Solicitar servicio".
   - **Solicitar servicio** (`SolicitarServicio`, `ConfirmacionSolicitud`): servicio, fecha, hora, dirección, notas y comprobante.
   - **Mis solicitudes** (paciente): filtros por estado/fecha, cancelar, abrir chat, **calificar** si está REALIZADA y no tiene reseña.
   - **Bandeja del enfermero** (`SolicitudesEnfermero`): aceptar / rechazar (con motivo) / marcar realizada / cancelar (con motivo obligatorio).
   - **Chat** (`ChatServicio`): polling cada 3 s, solo lectura si no está `PENDIENTE` ni `ACEPTADA`.
2. En esas pantallas, **borrar** lo de pagos, reprogramar y ubicación compartida.
3. **Documentación:** `README.md` (integrantes, problemática, cómo levantar con y sin Docker, usuarios de prueba, decisiones de diseño y **la aclaración de que el front parte del de Enfered (PP3)**) y `docs/DOCUMENTO.md` (problemática, solución y cómo están organizados los microservicios). Juntar lo que pasen los demás.

---

## 4. Cronograma (actualizado el 30/10, entregamos el 03/11)

| Fecha | Objetivo |
|---|---|
| **30/10** | **Santiago sube login, roles y guards.** Pablo copia el front de PP3, borra lo que no va y adapta la capa de API. Germán: solicitudes y chat. Leo: adapta búsqueda, solicitudes y chat a la API nueva. |
| **31/10** | **Integración**: el front consume el back real. Cada uno sube el Dockerfile de lo suyo y Santiago **prueba `docker compose up --build`**. Germán: reseñas. |
| **01/11** | Tests (Pablo: todos los del front) + logging + `helmet` y límite de intentos + arreglos. |
| **02/11** | Leo: README y documento. Prueba completa desde cero con `docker compose up --build` en la compu de alguien que no lo haya hecho. |
| **03/11** | Entrega. |
