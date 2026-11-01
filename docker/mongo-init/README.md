# docker/mongo-init

Scripts de inicialización de MongoDB. **Responsable:** Santiago · Ver contrato en [TAREAS_GRUPO.md](../../TAREAS_GRUPO.md).

- `01-catalogo-servicios.js`: carga en `solicitudes_db.servicios` los 6 servicios del catálogo con los `_id` fijos de la sección 2.8 (los enfermeros de prueba los referencian).

La imagen oficial de MongoDB ejecuta estos scripts **solo la primera vez que se crea el volumen**. Si se cambian, hay que borrar el volumen y volver a levantar:

```bash
docker compose down -v
docker compose up --build
```

Los usuarios de prueba no se cargan acá: los crea `usuarios-service` al arrancar (necesitan la contraseña hasheada con bcrypt).
