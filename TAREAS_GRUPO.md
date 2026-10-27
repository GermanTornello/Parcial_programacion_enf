# TP Final Programación III – División de tareas

**Grupo:** Germán, Leo, Santiago, Pablo
**Entrega:** 03/11/2026
**Proyecto:** **Enfe-Red** – marketplace de enfermería domiciliaria
**Repo:** https://github.com/GermanTornello/Parcial_programacion_enf

> **Cómo usar este archivo con la IA:** copiá TODO este archivo y pegáselo a la IA, y agregá al final:
> *"Soy [tu nombre]. Ayudame a hacer MI parte respetando exactamente el contrato compartido (puertos, endpoints, modelos, roles y nombres de variables)."*
> El contrato (sección 2) es lo que permite que front y back trabajen en paralelo sin pisarse. **Si alguien necesita cambiarlo, lo avisa en el grupo antes.**

---

## 1. La problemática y la solución

**Problema:** conseguir un enfermero/a a domicilio hoy es informal: "boca a boca", grupos de WhatsApp o agencias. Hay demoras, no hay garantía de que el profesional esté matriculado y es difícil resolver necesidades puntuales (una inyección, una curación, un control de signos vitales).

**Solución – Enfe-Red:** una plataforma que conecta pacientes con enfermeros/as independientes **verificados**:
- **Pacientes** buscan enfermeros cerca de su domicilio (por distancia, especialidad y servicio), les **solicitan un servicio** con fecha, hora y dirección, **chatean** con el enfermero cuando acepta y al final **lo califican**.
- **Enfermeros** se registran con su matrícula, cargan especialidades, servicios que ofrecen, zona y horarios, y gestionan las solicitudes que reciben (aceptar, rechazar, marcar realizada).
- **Admin** valida las matrículas (nadie aparece en las búsquedas sin estar aprobado), gestiona usuarios y el catálogo de servicios.

---

## 2. CONTRATO COMPARTIDO (lo tienen que respetar todos)

### 2.1 Stack
- **Backend:** **NestJS 12** (TypeScript) – crear cada servicio con `npx @nestjs/cli@12 new <nombre>`. Librerías: `@nestjs/mongoose`, `@nestjs/graphql` + `@nestjs/apollo` (code-first), `@nestjs/swagger`, `@nestjs/jwt` + `passport-jwt`, `@nestjs/config`, `class-validator`, `bcrypt`. Tests con **Vitest + Supertest** (vienen con Nest 12) y `mongodb-memory-server` para los e2e.
- **Base de datos:** MongoDB (un solo contenedor, **una base por microservicio**: `usuarios_db`, `solicitudes_db`, `resenas_db`).
- **Frontend:** React + Vite (JavaScript), React Router, Axios, **Leaflet + react-leaflet** (mapa con OpenStreetMap, gratis y sin API key). Tests con Vitest + React Testing Library.
- **Infra:** Docker + docker-compose.

### 2.2 Estructura del repo (monorepo)
```
/backend
   /usuarios-service     → NestJS, puerto 3001   (Santiago)
   /solicitudes-service  → NestJS, puerto 3002   (Germán)
   /resenas-service      → NestJS, puerto 3003   (Santiago)
/frontend                → React + Vite, puerto 5173  (Pablo y Leo)
/docker/mongo-init       → scripts de inicialización de la base (Germán)
docker-compose.yml       (Germán)
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
| duracionEstimadaMin | number | ≥ 5 |
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

Reglas:
- Un enfermero no puede tener dos solicitudes `PENDIENTE`/`ACEPTADA` en la misma `fecha` + `hora` → **409**.
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

Regla: solo leen/escriben el paciente y el enfermero de la solicitud. Solo se puede **enviar** si la solicitud está `ACEPTADA` (si no → 400); leer, siempre.

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
| POST | `/auth/register/enfermero` | público | Datos comunes + matricula, especialidades, serviciosOfrecidos, ubicacion `{lat, lng}`. Queda `PENDIENTE`. 409 si email o matrícula existen |
| POST | `/auth/login` | público | `{ email, password }` → `{ access_token, user: { id, nombre, apellido, email, rol } }` · 401 si falla |
| GET | `/auth/me` | logueado | Usuario completo del token (sin password) |
| PATCH | `/perfil` | logueado | Edita su perfil (campos según su rol; no puede cambiar rol, email ni estadoVerificacion). Enfermero manda ubicación como `{ lat, lng }` |
| GET | `/enfermeros/buscar?lat=&lng=&radioKm=10&especialidad=&servicioId=&disponible=` | público | Solo `APROBADO`. Usa `$geoNear`, ordenado por distancia. Cada resultado trae `distanciaKm` (1 decimal) |
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
| PATCH | `/solicitudes/:id/cancelar` | participante | |
| PATCH | `/solicitudes/:id/realizar` | ENFERMERO (el de la solicitud) | |
| GET | `/solicitudes/:id/mensajes` | participante | Mensajes en orden cronológico |
| POST | `/solicitudes/:id/mensajes` | participante | `{ texto }` · solo si está `ACEPTADA` |

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

**Catálogo de servicios** (lo carga Germán en `/docker/mongo-init`, **con estos `_id` fijos** para que los enfermeros de prueba puedan referenciarlos):
| _id | nombre | duración (min) | precio ref. |
|---|---|---|---|
| `650000000000000000000001` | Aplicación de inyectable | 15 | 5000 |
| `650000000000000000000002` | Curación de heridas | 30 | 9000 |
| `650000000000000000000003` | Control de signos vitales | 20 | 6000 |
| `650000000000000000000004` | Control de glucemia | 15 | 5000 |
| `650000000000000000000005` | Cuidados post-operatorios | 60 | 15000 |
| `650000000000000000000006` | Acompañamiento de adulto mayor | 120 | 20000 |

**Usuarios de prueba** (los crea `usuarios-service` al arrancar si no existen – Santiago):
| email | contraseña | rol |
|---|---|---|
| admin@enfered.com | Admin123! | ADMIN |
| paciente@enfered.com | Paciente123! | PACIENTE |
| enfermera@enfered.com | Enfermera123! | ENFERMERO (APROBADO) |
| + 3 o 4 enfermeros más APROBADOS, con ubicaciones distintas en nuestra ciudad y distintos servicios/especialidades, para que la búsqueda y el mapa muestren resultados | | |

### 2.9 Errores (formato estándar de Nest)
`{ "statusCode": 409, "message": "El email ya está registrado", "error": "Conflict" }`
400 validación/transición inválida · 401 sin token o login inválido · 403 rol o dueño incorrecto · 404 no existe · 409 duplicado. En GraphQL el error viaja en `errors[0].message`. El front siempre muestra `message`.

### 2.10 Forma de trabajo con Git
- Cada uno trabaja en **su rama**: `german`, `santi`, `pablo`, `leo`. Al terminar algo que funciona, abre un **Pull Request a `main`**; otro del grupo le da un vistazo antes de mergear.
- Para traer lo nuevo de `main` a tu rama: `git checkout <tu-rama>` → `git pull origin main`.
- Commits chicos y descriptivos, en español. Cada uno toca **solo su carpeta** (salvo que se avise).
- **No subir** `node_modules`, `dist` ni `.env` (sí `.env.example`).

---

## 3. DIVISIÓN DE TAREAS

### 🔧 BACKEND

#### Santiago – usuarios-service + resenas-service
1. **usuarios-service**:
   - Schema `Usuario` con discriminators `Paciente`, `Enfermero`, `Admin` (esto muestra la **herencia** del diagrama de clases).
   - Registro de paciente y de enfermero, login con bcrypt + JWT, `/auth/me`, `PATCH /perfil`.
   - `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, decorador `@Roles()` y decorador `@UsuarioActual()`. **Pasárselos a Germán apenas estén** (los necesita para solicitudes-service).
   - Búsqueda geolocalizada con `$geoNear` + filtros, perfil público del enfermero.
   - Admin: validar/rechazar matrículas, listar y borrar usuarios.
   - Seed al arrancar: admin, paciente y enfermeros de prueba (sección 2.8).
2. **resenas-service**: GraphQL CRUD de reseñas + `reputacion`/`reputaciones` (con `aggregate`), validando contra solicitudes-service que la solicitud esté REALIZADA.
3. **Logging:** interceptor que loguee método, ruta, status y tiempo de cada request (con el `Logger` de Nest). Pasárselo a Germán.
4. **Tests:**
   - Unit: registrar con email ya existente → `ConflictException` (mockeando el modelo).
   - Unit: al editar el perfil, `serviciosOfrecidos` no guarda ids repetidos (relación muchos-a-muchos).
   - Unit (reseñas): `createResena` con solicitud no REALIZADA → `BadRequestException` (mockeando la llamada HTTP).
   - E2E: flujo **registro de enfermero → login → editar perfil**, y que un PACIENTE reciba 403 en `/admin/...`.

#### Germán – solicitudes-service + Docker + base de datos
1. **solicitudes-service**:
   - GraphQL CRUD de **Servicios** (catálogo).
   - REST de **Solicitudes**: crear (validando contra usuarios-service), listar según rol, detalle, y las transiciones de estado con sus reglas.
   - REST de **Mensajes** (chat de la solicitud).
   - Usar los guards/roles/logging que pasa Santiago.
2. **Docker:** `Dockerfile` para cada servicio y el frontend + `docker-compose.yml` que levante `mongo`, los 3 servicios y el front con las variables de la sección 2.5. Un solo `docker compose up --build`.
3. **Scripts de inicialización** en `/docker/mongo-init/`: catálogo de servicios con los `_id` fijos (sección 2.8).
4. **Tests:**
   - Unit: crear un servicio con nombre repetido → `ConflictException`.
   - Unit: transición inválida (ej. `PENDIENTE → REALIZADA`) → `BadRequestException`.
   - E2E: paciente crea solicitud → enfermero la acepta → envían mensajes (mockeando usuarios-service); y otro paciente recibe 403 al querer verla.
5. Revisar que los 3 servicios tengan Swagger en `/docs` bien documentado.

### 🎨 FRONTEND

#### Pablo – base del front, autenticación, perfiles y admin
1. Proyecto `/frontend` con Vite + React, React Router, Axios.
2. **Capa de API** (`src/api/`): una instancia de Axios por servicio (con las `VITE_*`), interceptor que agrega el token y que desloguea ante un 401. Helper `graphqlRequest(url, query, variables)`.
3. **Autenticación:** `AuthContext` (token + usuario en `localStorage`), Login, Registro con **dos formularios** (paciente / enfermero; el de enfermero avisa que queda pendiente de validación), `ProtectedRoute` con roles opcionales.
4. **Layout:** navbar con menú según rol, responsive (mobile first), página de inicio pública que explique Enfe-Red.
5. **Componentes reutilizables** (`src/components/`) para Leo: `DataTable`, `FormField`, `Modal`, `SearchBar`, `ConfirmDialog`, `Badge` (estados), `Spinner`, `Alert`, `StarRating` (mostrar y elegir 1-5). **Tenerlos listos lo antes posible.**
6. **Mi perfil:** ver/editar. Para enfermero: especialidades, servicios ofrecidos (checkboxes del catálogo GraphQL), ubicación (botón "usar mi ubicación" con `navigator.geolocation`), radio, disponible, horarios, estado de verificación.
7. **Panel Admin:** validar/rechazar matrículas, usuarios (listar, buscar, borrar), ABM del catálogo de servicios (GraphQL).
8. **Tests:** Login muestra error ante 401; `ProtectedRoute` redirige a /login sin token; `StarRating` permite elegir puntuación.
9. **Documentación:** `README.md` (integrantes, problemática, cómo levantar con y sin Docker, usuarios de prueba, decisiones de diseño) y `docs/DOCUMENTO.md` (problemática, solución, diagrama de microservicios). Juntar lo que pasen los demás.

#### Leo – búsqueda, solicitudes, chat y reseñas
1. **Buscar enfermeros:** filtros (servicio, especialidad, radio, solo disponibles), ubicación del paciente (geolocalización del navegador o la dirección), **lista de tarjetas + mapa (react-leaflet)** sincronizados, con distancia y estrellas (`reputaciones`).
2. **Perfil público del enfermero:** datos, servicios, horarios, reputación y reseñas, botón "Solicitar servicio".
3. **Solicitar servicio:** formulario (servicio de los que ofrece, fecha, hora, dirección, notas) y comprobante.
4. **Mis solicitudes (paciente):** lista con filtros por estado/fecha, cancelar, abrir chat, **calificar** si está REALIZADA y no tiene reseña.
5. **Bandeja del enfermero:** solicitudes recibidas con aceptar / rechazar (con motivo) / marcar realizada / cancelar.
6. **Chat** de la solicitud: polling cada 3 s, mensajes propios a la derecha, solo lectura si no está ACEPTADA.
7. Usar **siempre** los componentes de Pablo (si falta uno, pedirlo o agregarlo en `src/components/` avisando). Mientras el back no esté, usar datos mock con la forma exacta de la sección 2.6.
8. **Tests:** el formulario de solicitud valida campos obligatorios; la lista de búsqueda renderiza tarjetas con distancia a partir de datos mock; el chat deshabilita el envío si la solicitud no está ACEPTADA.

---

## 4. Cronograma (hoy es 27/10, entregamos 03/11)

| Fecha | Objetivo |
|---|---|
| **27/10** | Contrato acordado. Esqueletos de los 3 servicios y del front. Santiago pasa guards/roles. Pablo sube los componentes base. |
| **28–30/10** | Backend: endpoints funcionando y probados en Swagger / GraphQL. Frontend: auth + pantallas con mocks. |
| **31/10** | **Integración**: el front consume el back real. docker-compose funcionando. |
| **01/11** | Tests (back y front) + logging + arreglos. |
| **02/11** | README, documento, prueba completa desde cero con `docker compose up --build` en la compu de alguien que no lo haya hecho. |
| **03/11** | Entrega. |
