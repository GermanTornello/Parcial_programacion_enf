# frontend

React + Vite. Puerto 5173.

**Responsable:** Pablo y Leo · Ver contrato en [TAREAS_GRUPO.md](../TAREAS_GRUPO.md).

## Cómo correrlo
```bash
npm install
cp .env.example .env
npm run dev
```
Con `VITE_USE_MOCK=true` usa datos de prueba; con `false`, el backend real.

## Estructura
- `src/datos/` acceso a datos: `mock.js` (datos de prueba), `real.js` (backend real), `index.js` (elige uno).
- `src/pantallas/` Buscar, Perfil, Solicitar, MisSolicitudes, Bandeja, Chat (y un Login provisorio).
- `src/componentes/ui.jsx` estados de pantalla, estrellas, badges y modales.
- `src/main.jsx`, `App.jsx`, `auth.jsx`, `pantallas/Login.jsx`: **provisorios**, los reemplaza la base de Pablo.
