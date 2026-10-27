# SaludTurnos – TP Final Programación III

Sistema de turnos y vacunación para centros de salud de la región (NestJS + React + MongoDB + Docker).

## Integrantes
- Germán Tornello
- Leo
- Santiago
- Pablo

## Estructura
| Carpeta | Descripción |
|---|---|
| `backend/auth-service/` | Microservicio de usuarios, login y roles (puerto 3001) |
| `backend/turnos-service/` | Microservicio de centros de salud y turnos (puerto 3002) |
| `backend/vacunas-service/` | Microservicio de vacunas y aplicaciones (puerto 3003) |
| `frontend/` | Aplicación React (puerto 5173) |
| `docker/mongo-init/` | Scripts de inicialización de la base de datos |
| `docs/` | Documento de problemática, solución y arquitectura |

La división de tareas y el contrato entre servicios están en [TAREAS_GRUPO.md](TAREAS_GRUPO.md).

> README en construcción: las instrucciones para levantar el proyecto se completan antes de la entrega.
