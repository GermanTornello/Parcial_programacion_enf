# Enfered: documento de la entrega

## 1. La problemática
Conseguir un enfermero/a a domicilio hoy es informal: se recurre al "boca a boca", a grupos de WhatsApp o a agencias. Eso trae tres problemas:
- **Demoras:** no hay forma rápida de saber quién está disponible y cerca.
- **Falta de garantías:** no hay un lugar donde comprobar que el profesional esté matriculado.
- **Necesidades puntuales sin respuesta:** una inyección, una curación o un control de signos vitales son difíciles de resolver sin contratar un servicio completo.

## 2. La solución: Enfered
Una plataforma que conecta pacientes con enfermeros/as independientes **verificados**.

**Pacientes**
- Buscan enfermeros cerca de su domicilio, por distancia, especialidad, servicio y departamento, en lista o en mapa.
- Ven el perfil con servicios, horarios, reputación y reseñas.
- Solicitan un servicio con fecha, hora y dirección, y siguen el estado en *Mis solicitudes*.
- Chatean con el enfermero mientras la solicitud está pendiente o aceptada.
- Califican el servicio cuando está realizado.

**Enfermeros**
- Se registran con su matrícula y cargan especialidades, servicios que ofrecen, zona y horarios.
- Gestionan las solicitudes en su bandeja: aceptar, rechazar, marcar como realizada o cancelar (con motivo obligatorio).

**Admin**
- Valida las matrículas (nadie aparece en las búsquedas sin estar aprobado), gestiona usuarios y administra el catálogo de servicios.

**Reglas principales**
- Un enfermero no puede tener dos solicitudes pendientes o aceptadas en el mismo día y hora.
- La fecha no puede ser pasada ni estar a más de 6 meses.
- Un paciente puede tener como máximo 5 solicitudes pendientes.
- Solo se puede reseñar una solicitud realizada, y una sola vez.

**Fuera de alcance:** pagos (los precios son solo de referencia), reprogramación de visitas y ubicación compartida.

## 3. Cómo están organizados los microservicios
Tres servicios NestJS independientes, cada uno con su propia base MongoDB, más un frontend React.

| Servicio | Puerto | Base | Qué maneja | API |
|---|---|---|---|---|
| `usuarios-service` | 3001 | `usuarios_db` | Registro y login, perfiles de Paciente, Enfermero y Admin, búsqueda geolocalizada, validación de matrículas | REST |
| `solicitudes-service` | 3002 | `solicitudes_db` | Catálogo de servicios, solicitudes y sus estados, chat | REST (solicitudes y mensajes) y GraphQL (servicios) |
| `resenas-service` | 3003 | `resenas_db` | Reseñas y reputación de cada enfermero | GraphQL |

```
                 ┌──────────────────────┐
                 │  Frontend (React)    │
                 └─────┬──────┬──────┬──┘
                       │      │      │
        ┌──────────────▼┐  ┌──▼──────────┐  ┌▼──────────────┐
        │ usuarios      │◄─│ solicitudes │◄─│ reseñas       │
        │ :3001         │  │ :3002       │  │ :3003         │
        └──────┬────────┘  └──────┬──────┘  └──────┬────────┘
           usuarios_db      solicitudes_db     resenas_db      (un MongoDB, tres bases)
```

**Comunicación entre servicios (HTTP)**
- `solicitudes-service` consulta `GET /enfermeros/:id` a `usuarios-service` al crear una solicitud, para comprobar que el enfermero exista, esté verificado, disponible y ofrezca ese servicio.
- `resenas-service` consulta `GET /solicitudes/:id` a `solicitudes-service`, reenviando el token del paciente, para comprobar que la solicitud sea suya y esté realizada.

**Autenticación:** el JWT lo emite `usuarios-service` (payload `sub`, `email`, `rol`, `nombre`; vence en 1 día). Los otros dos servicios lo validan con el mismo `JWT_SECRET`. Roles: `PACIENTE`, `ENFERMERO` y `ADMIN`.

**Datos:** todas las respuestas devuelven `id` (string) en lugar de `_id`. El catálogo de servicios se carga al iniciar con ids fijos desde `docker/mongo-init/`.

**Documentación de las APIs:** cada servicio expone Swagger en `/docs`; los que tienen GraphQL, el playground en `/graphql`.

## 4. El frontend
React + Vite, **partiendo del frontend de Enfered de PP3** y adaptado al contrato de este TP. Las pantallas de PP3 se conservan; lo que cambió es cómo obtienen los datos:
- `frontend/src/api/`: clientes HTTP (axios) para los tres servicios, con el token en cada pedido, y el helper `graphqlRequest` para servicios y reseñas.
- `frontend/src/api/cartilla.js` y `frontend/src/services/solicitudes.js`: traducen las respuestas del contrato a los datos que usan las pantallas de PP3.

Pantallas: inicio, login, registro de paciente y enfermero, búsqueda de enfermeros (lista y mapa, por cercanía, servicio, especialidad, departamento, precio y horario), perfil del enfermero con reseñas, solicitar servicio, mis solicitudes, bandeja del enfermero, chat, calificación, mi perfil y panel de administración.
La sección protegida exige iniciar sesión y cada ruta controla el rol. Hay componentes reutilizables (`DataTable`, `FormField`, `Modal`, `Badge`, `Alert`, `StarRating`, etc.) y diseño responsivo con navegación inferior en celular.

## 5. Calidad: pruebas, logging y seguridad
- **Pruebas:** cada servicio tiene unitarios y end-to-end (Vitest + Supertest con MongoDB en memoria); el frontend, pruebas de componentes con React Testing Library. Cubren validaciones, datos únicos duplicados, la relación muchos-a-muchos Enfermero ↔ Servicio, permisos por rol y los flujos completos.
- **Logging:** cada request queda registrada con método, ruta, status y tiempo.
- **Seguridad:** contraseñas con bcrypt, JWT con vencimiento, guards por rol, `helmet`, límite de intentos de login y registro, validación de entrada en todos los endpoints y datos privados (contraseña, email, domicilio) fuera de las respuestas públicas.
