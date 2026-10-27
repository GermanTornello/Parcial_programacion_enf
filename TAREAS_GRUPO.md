# TP Final Programación III – División de tareas

**Grupo:** Germán, Leo, Santiago, Pablo
**Entrega:** 03/11/2026
**Proyecto:** "SaludTurnos" – sistema de turnos y vacunación para centros de salud de la región

> **Cómo usar este mensaje con la IA:** copiá TODO este mensaje y pegáselo a la IA, y agregá al final:
> *"Soy [tu nombre]. Ayudame a hacer MI parte respetando exactamente el contrato compartido (puertos, endpoints, modelos, roles y nombres de variables)."*
> El contrato (sección 2) es lo que permite que front y back trabajen en paralelo sin pisarse. **Si alguien necesita cambiarlo, lo avisa en el grupo antes.**

---

## 1. La problemática y la solución

**Problema:** en los centros de salud de la región los turnos se piden en persona o por teléfono, hay filas, turnos que se pierden, y el registro de vacunas de cada paciente está en papel (carnet que se pierde, enfermería no sabe qué dosis le faltan).

**Solución:** una app web donde:
- **Pacientes** se registran, buscan centros de salud, sacan/cancelan turnos y ven su **carnet de vacunación digital**.
- **Enfermería** ve la agenda de turnos del centro, cambia el estado de los turnos (confirmado/atendido) y **registra las vacunas aplicadas**.
- **Admin** gestiona centros de salud, catálogo de vacunas y usuarios (da de alta enfermeros/as y los asigna a centros).

---

## 2. CONTRATO COMPARTIDO (lo tienen que respetar todos)

### 2.1 Stack
- **Backend:** NestJS (TypeScript), `@nestjs/mongoose`, `@nestjs/graphql` + `@nestjs/apollo` (code-first), `@nestjs/swagger`, `@nestjs/jwt` + `passport-jwt`, `class-validator`, `bcrypt`. Tests con Jest + Supertest (vienen con Nest).
- **Base de datos:** MongoDB (un solo contenedor, **una base por microservicio**: `auth_db`, `turnos_db`, `vacunas_db`).
- **Frontend:** React + Vite (JavaScript), React Router, Axios. Tests con Vitest + React Testing Library.
- **Infra:** Docker + docker-compose.

### 2.2 Estructura del repo (monorepo en GitHub)
```
/backend
   /auth-service     → NestJS, puerto 3001
   /turnos-service   → NestJS, puerto 3002
   /vacunas-service  → NestJS, puerto 3003
/frontend            → React + Vite, puerto 5173
/docker/mongo-init   → scripts de inicialización de la base (seed)
docker-compose.yml
README.md
docs/DOCUMENTO.md    → documento de problemática + solución + arquitectura
```

### 2.3 Microservicios

| Servicio | Puerto | Base | Qué maneja | REST | GraphQL |
|---|---|---|---|---|---|
| auth-service | 3001 | auth_db | Usuarios, login, roles, JWT | Sí | No |
| turnos-service | 3002 | turnos_db | Centros de salud, Turnos | Turnos | **CRUD Centros** |
| vacunas-service | 3003 | vacunas_db | Catálogo de vacunas, Aplicaciones | Aplicaciones | **CRUD Vacunas** |

- Cada servicio: Swagger en **`/docs`**, GraphQL (si tiene) en **`/graphql`**, **CORS habilitado**, `ValidationPipe` global (`whitelist: true`).
- **Autenticación entre servicios:** el JWT lo emite `auth-service`. `turnos-service` y `vacunas-service` lo validan con el **mismo `JWT_SECRET`** (no hace falta llamar a auth-service). Cada servicio tiene su propio `JwtAuthGuard` y `RolesGuard` + decorador `@Roles(...)`.
- **Payload del JWT:** `{ sub: <userId>, email, rol, nombre }` · expira en 1 día.
- **Header:** `Authorization: Bearer <token>`.

### 2.4 Roles
`PACIENTE` · `ENFERMERO` · `ADMIN` (string exacto, en mayúsculas).

### 2.5 Variables de entorno
```
# Todos los servicios
MONGO_URI=mongodb://mongo:27017/<nombre_db>
JWT_SECRET=supersecreto_tp_prog3
PORT=3001 | 3002 | 3003

# Solo auth-service (crea el admin al arrancar si no existe)
ADMIN_EMAIL=admin@salud.com
ADMIN_PASSWORD=Admin123!

# Frontend
VITE_AUTH_URL=http://localhost:3001
VITE_TURNOS_URL=http://localhost:3002
VITE_VACUNAS_URL=http://localhost:3003
```

### 2.6 Modelos (MongoDB)

**Usuario** (auth_db)
| campo | tipo | reglas |
|---|---|---|
| nombre, apellido | string | requeridos |
| email | string | requerido, **único** |
| dni | string | requerido, **único** |
| password | string | bcrypt, **nunca se devuelve** en las respuestas |
| rol | enum | `PACIENTE` por defecto |
| fechaNacimiento | Date | opcional |

**Centro** (turnos_db)
| campo | tipo | reglas |
|---|---|---|
| nombre | string | requerido |
| direccion, localidad, telefono | string | requeridos (telefono opcional) |
| especialidades | string[] | ej: `["Clínica", "Pediatría", "Vacunatorio"]` |
| enfermeros | string[] | ids de usuarios con rol ENFERMERO → **relación muchos-a-muchos** (un enfermero puede trabajar en varios centros) |

**Turno** (turnos_db)
| campo | tipo | reglas |
|---|---|---|
| pacienteId | string | lo toma del token |
| pacienteNombre | string | lo toma del token (para mostrar sin consultar otro servicio) |
| centro | ObjectId ref Centro | requerido, debe existir |
| fecha | Date | requerida, futura |
| especialidad | string | debe estar en las especialidades del centro |
| motivo | string | opcional |
| estado | enum | `PENDIENTE` (default) · `CONFIRMADO` · `ATENDIDO` · `CANCELADO` |

Regla: un centro no puede tener dos turnos no cancelados en la misma `fecha` + `especialidad` → error **409**.

**Vacuna** (vacunas_db)
| campo | tipo | reglas |
|---|---|---|
| nombre | string | requerido, **único** |
| descripcion | string | opcional |
| dosisRequeridas | number | ≥ 1 |
| intervaloDias | number | días entre dosis, ≥ 0 |
| obligatoria | boolean | calendario nacional sí/no |

**Aplicacion** (vacunas_db) = vacuna aplicada a un paciente
| campo | tipo | reglas |
|---|---|---|
| pacienteId | string | requerido |
| pacienteNombre | string | requerido |
| vacuna | ObjectId ref Vacuna | requerido, debe existir |
| numeroDosis | number | 1..dosisRequeridas |
| centroId | string | requerido |
| enfermeroId | string | lo toma del token |
| fecha | Date | default hoy |
| lote | string | requerido |

Regla: no se puede repetir `pacienteId + vacuna + numeroDosis` → error **409**.

### 2.7 Endpoints

**auth-service (REST, :3001)**
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register` | público | Crea un PACIENTE. Body: nombre, apellido, email, dni, password (mín 6), fechaNacimiento? → 409 si email o dni ya existen |
| POST | `/auth/login` | público | Body: email, password → `{ access_token, user: { id, nombre, apellido, email, rol } }` · 401 si falla |
| GET | `/auth/me` | logueado | Datos del usuario del token |
| GET | `/usuarios?rol=&search=` | ENFERMERO, ADMIN | Lista/busca usuarios (search busca en nombre, apellido, dni, email) |
| GET | `/usuarios/:id` | ENFERMERO, ADMIN | Un usuario |
| POST | `/usuarios` | ADMIN | Crea usuario con cualquier rol (para dar de alta enfermeros) |
| PATCH | `/usuarios/:id` | ADMIN | Edita |
| DELETE | `/usuarios/:id` | ADMIN | Borra |

**turnos-service – GraphQL Centros (:3002/graphql)**
```graphql
type Centro { id: ID!, nombre: String!, direccion: String!, localidad: String!, telefono: String, especialidades: [String!]!, enfermeros: [String!]! }

query    centros(search: String, localidad: String): [Centro!]!   # público
query    centro(id: ID!): Centro                                  # público
mutation createCentro(input: CreateCentroInput!): Centro!         # ADMIN
mutation updateCentro(id: ID!, input: UpdateCentroInput!): Centro!# ADMIN
mutation removeCentro(id: ID!): Boolean!                          # ADMIN
mutation asignarEnfermero(centroId: ID!, enfermeroId: String!): Centro!  # ADMIN (no duplica)
mutation quitarEnfermero(centroId: ID!, enfermeroId: String!): Centro!   # ADMIN
```

**turnos-service – REST Turnos (:3002)**
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/turnos` | PACIENTE | Body: centroId, fecha, especialidad, motivo? |
| GET | `/turnos?centroId=&estado=&desde=&hasta=` | logueado | PACIENTE ve solo los suyos; ENFERMERO/ADMIN ven todos. Devuelve el centro populado |
| GET | `/turnos/:id` | logueado | PACIENTE solo si es suyo (si no, 403) |
| PATCH | `/turnos/:id/estado` | ENFERMERO, ADMIN | Body: `{ estado }` |
| PATCH | `/turnos/:id/cancelar` | PACIENTE (el suyo), ADMIN | Pasa a CANCELADO |
| DELETE | `/turnos/:id` | ADMIN | Borra |

**vacunas-service – GraphQL Vacunas (:3003/graphql)**
```graphql
type Vacuna { id: ID!, nombre: String!, descripcion: String, dosisRequeridas: Int!, intervaloDias: Int!, obligatoria: Boolean! }

query    vacunas(search: String, obligatoria: Boolean): [Vacuna!]!  # público
query    vacuna(id: ID!): Vacuna                                    # público
mutation createVacuna(input: CreateVacunaInput!): Vacuna!           # ADMIN (409 si nombre repetido)
mutation updateVacuna(id: ID!, input: UpdateVacunaInput!): Vacuna!  # ADMIN
mutation removeVacuna(id: ID!): Boolean!                            # ADMIN
```

**vacunas-service – REST Aplicaciones (:3003)**
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/aplicaciones` | ENFERMERO | Body: pacienteId, pacienteNombre, vacunaId, numeroDosis, centroId, lote, fecha? |
| GET | `/aplicaciones?pacienteId=&vacunaId=` | ENFERMERO, ADMIN | Lista con filtros, vacuna populada |
| GET | `/aplicaciones/mias` | PACIENTE | Su carnet de vacunación |
| GET | `/aplicaciones/carnet/:pacienteId` | ENFERMERO, ADMIN | Carnet de un paciente: por cada vacuna obligatoria → dosis aplicadas / requeridas y si está completa |
| DELETE | `/aplicaciones/:id` | ADMIN | Borra (corrección de error de carga) |

### 2.8 Errores (formato estándar de Nest)
`{ "statusCode": 409, "message": "El email ya está registrado", "error": "Conflict" }`
Usar: 400 validación · 401 sin token / login inválido · 403 rol no permitido · 404 no existe · 409 duplicado. El front muestra `message`.

### 2.9 Forma de trabajo
- Rama `main` protegida. Cada uno trabaja en su rama (`feat/auth`, `feat/front-turnos`, etc.) y sube por **Pull Request**; otro del grupo le da un vistazo antes de mergear.
- Commits chicos y descriptivos, en español.
- **No subir** `node_modules` ni `.env` (sí un `.env.example`).

---

## 3. DIVISIÓN DE TAREAS

### 🔧 BACKEND

#### Santiago – auth-service + turnos-service
1. **auth-service** completo: módulo usuarios + módulo auth, registro/login con bcrypt y JWT, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, decorador `@Roles()`, creación al arrancar (si no existen) del admin y de los usuarios de prueba de enfermería y paciente (ver final), Swagger con `@ApiBearerAuth`.
2. Pasar a Germán (copiar) los archivos de guard/strategy/decorador de roles para que use los mismos en vacunas-service.
3. **turnos-service**: GraphQL CRUD de Centros (incluye `asignarEnfermero`/`quitarEnfermero` = relación muchos-a-muchos) + REST de Turnos con sus reglas (409 por turno duplicado, paciente solo ve lo suyo).
4. **Tests:**
   - Unit: registrar un usuario con email ya existente → lanza `ConflictException` (mockeando el modelo de Mongoose).
   - Unit: `asignarEnfermero` agrega el id y no lo duplica si ya estaba (relación muchos-a-muchos).
   - E2E (Supertest): flujo completo **registro → login → crear turno** con el token.
5. Logging: un interceptor que loguee método, ruta, status y tiempo de cada request (usar el `Logger` de Nest). Pasárselo a Germán.

#### Germán – repo + vacunas-service + Docker + base de datos
0. Crear el repo en GitHub con la estructura de la sección 2.2, subir este archivo como `TAREAS_GRUPO.md` e invitar a todos (**primer día**).
1. **vacunas-service**: GraphQL CRUD de Vacunas + REST de Aplicaciones con sus reglas (409 por dosis repetida, numeroDosis no mayor a dosisRequeridas, endpoint de carnet). Usar los guards/roles que pasa Santiago.
2. **Docker:** `Dockerfile` para cada servicio y para el frontend + `docker-compose.yml` que levante `mongo`, los 3 servicios y el frontend, con las variables de la sección 2.5. Tiene que andar con un solo `docker compose up --build`.
3. **Scripts de inicialización** en `/docker/mongo-init/` (se montan en el contenedor de mongo): cargar 3-4 centros de salud de ejemplo en `turnos_db` y el catálogo de vacunas del calendario nacional (BCG, Hepatitis B, Pentavalente, Triple viral, Antigripal, COVID-19, etc.) en `vacunas_db`.
4. **Tests:**
   - Unit: crear una vacuna valida los datos y crear una con nombre repetido lanza `ConflictException`.
   - Unit: registrar una aplicación con `numeroDosis` mayor a `dosisRequeridas` → `BadRequestException`.
   - E2E: login con token de ENFERMERO → POST `/aplicaciones` → GET `/aplicaciones/carnet/:pacienteId` refleja la dosis. Y un caso de 403 si lo intenta un PACIENTE.
5. Revisar que los 3 servicios tengan Swagger en `/docs` bien documentado (DTOs con `@ApiProperty`).

### 🎨 FRONTEND

#### Pablo – base del front, autenticación y componentes reutilizables
1. Crear el proyecto `/frontend` con Vite + React, React Router, Axios.
2. **Capa de API** (`src/api/`): una instancia de Axios por servicio (usando las `VITE_*`), interceptor que agrega el `Authorization: Bearer` y que si recibe 401 desloguea. Helper `graphqlRequest(url, query, variables)` para las queries de GraphQL.
3. **Autenticación:** `AuthContext` (token + usuario en `localStorage`), páginas **Login** y **Registro** con validación y mensajes de error del back, `ProtectedRoute` que exige estar logueado y opcionalmente un rol (`<ProtectedRoute roles={['ADMIN']}>`).
4. **Layout:** navbar con menú según el rol, responsive (mobile first), página de inicio pública.
5. **Componentes reutilizables** (`src/components/`) que va a usar Leo: `DataTable` (columnas + filas + acciones), `FormField` (input + label + error), `Modal`, `SearchBar`, `ConfirmDialog`, `Badge` (para estados), `Spinner`, `Alert`. **Tenerlos listos lo antes posible** para que Leo no se trabe.
6. **Panel Admin:** gestión de usuarios (listar/buscar, crear enfermero, editar, borrar).
7. **Tests (Vitest + RTL):** Login muestra error si el back responde 401; `ProtectedRoute` redirige a /login si no hay token; `DataTable` renderiza filas.
8. **Documentación:** `README.md` (integrantes, problemática, cómo levantar con Docker y sin Docker, usuarios de prueba, decisiones de diseño) y `docs/DOCUMENTO.md` (problemática, solución, diagrama de microservicios). Juntar lo que le pasen los demás.

#### Leo – pantallas de turnos, centros y vacunas
1. **Centros** (GraphQL): listado público con buscador y filtro por localidad; ABM para ADMIN (crear/editar/borrar) y asignar/quitar enfermeros (buscando usuarios con rol ENFERMERO).
2. **Turnos:**
   - PACIENTE: "Sacar turno" (elegir centro → especialidad → fecha/hora) y "Mis turnos" con opción de cancelar.
   - ENFERMERO/ADMIN: agenda con filtros (centro, estado, fechas) y botones para cambiar estado.
3. **Vacunas:**
   - Catálogo (GraphQL) con buscador; ABM para ADMIN.
   - ENFERMERO: "Registrar vacuna" (buscar paciente por DNI con `/usuarios?search=` → elegir vacuna y dosis → lote).
   - PACIENTE: "Mi carnet de vacunación" (`/aplicaciones/mias`), mostrando qué vacunas obligatorias le faltan.
4. Usar **siempre** los componentes de Pablo (si falta uno, se lo pide o lo agrega en `src/components/` avisando).
5. Mientras el back no esté listo, trabajar con datos mock que respeten exactamente los modelos de la sección 2.6.
6. **Tests (Vitest + RTL):** el formulario de sacar turno valida campos obligatorios; el carnet muestra las vacunas a partir de datos mockeados.

---

## 4. Cronograma (hoy es 26/10, entregamos 03/11)

| Fecha | Objetivo |
|---|---|
| **27/10** | Repo creado (Germán). Esqueletos de los 3 servicios y del front. Pablo sube los componentes base. |
| **28–30/10** | Backend: endpoints funcionando y probados en Swagger. Frontend: auth + pantallas con mocks. |
| **31/10** | **Integración**: el front consume el back real. docker-compose funcionando. |
| **01/11** | Tests (back y front) + logging + arreglos. |
| **02/11** | README, documento, prueba completa desde cero con `docker compose up --build` en la compu de alguien que no lo haya hecho. |
| **03/11** | Entrega. |

**Usuarios de prueba (los crea auth-service al arrancar):** admin@salud.com / Admin123! · enfermera@salud.com / Enfermera123! · paciente@salud.com / Paciente123!
