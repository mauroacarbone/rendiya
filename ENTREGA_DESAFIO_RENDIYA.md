# Entrega del Desafío Profesional - RendiYa

**Alumno:** Mauro Antonio Carbone  
**Curso:** Digital House — Desarrollo Full Stack (DPFS)  
**Repositorio GitHub:** [https://github.com/mauroacarbone/rendiya](https://github.com/mauroacarbone/rendiya)  
**Tablero Kanban:** [https://github.com/users/mauroacarbone/projects/1/views/1](https://github.com/users/mauroacarbone/projects/1/views/1)

---

## Resumen Técnico del Proyecto

RendiYa es un e-commerce de alquiler de vehículos por turno para el examen práctico de conducir (CABA y GBA). El trabajo práctico cierra en **8 sprints**, con sitio público en Express/EJS y un dashboard de métricas en React.

### Arquitectura

- **Patrón MVC** sobre **Node.js** y **Express 5**.
- Rutas, controladores y vistas en `src/`.
- Estáticos en `public/` (CSS, JS de validación, imágenes).

### Base de datos y ORM

- Persistencia **relacional** administrada con **Sequelize** (modelos, asociaciones y seed de datos).
- Esquema y carga inicial documentados en `src/database/structure.sql` y `src/database/data.sql`.
- **Desarrollo:** SQLite (`src/database/rendiya.sqlite`), para levantar el proyecto sin instalar MySQL.
- **Producción:** dialecto **MySQL**, base `rendiya`.

### Frontend web

- Vistas dinámicas con motor de plantillas **EJS** y CSS propio.
- Catálogo, detalle, carrito, login, registro, perfil y **simulación de pago** (`GET /products/checkout`).

### Autenticación y seguridad

- Login y registro completos.
- Hash de contraseñas con **bcryptjs**.
- **Cookies** (`rememberEmail`) y **sesiones** (`express-session`).
- Middlewares de acceso: visitante (`guestMiddleware`) y usuario logueado (`authMiddleware`).
- Categorías de usuario **Administrador / Cliente** (`user_categories`); el administrador puede gestionar categoría en la edición de usuarios.

### Validaciones

- **Backend:** **express-validator** en registro, login y alta/edición de vehículos.
- **Frontend:** JavaScript propio en `public/js/` (el visitante puede desactivar JS; el servidor sigue validando).

### API REST (JSON)

CORS habilitado para el dashboard. Los listados incluyen `count` y paginado (`next` / `previous`, 10 ítems).

| Endpoint | Respuesta |
|---|---|
| `GET /api/users` | `count`, `users` (`id`, `name`, `email`, `detail`) y paginado |
| `GET /api/users/:id` | Detalle de usuario **sin** `password` ni categoría |
| `GET /api/products` | `count`, `countByCategory`, `products` (`id`, `name`, `description`, `categories`, `detail`) y paginado |
| `GET /api/products/:id` | Detalle extendido con relaciones (`categories`, `colors`, `brands`, `zones`) y URL de imagen |

Controladores en `src/controllers/api/`.

### Dashboard en React

- SPA con **Vite + React**, carpeta `dashboard/`.
- Se sirve en el mismo puerto del sitio: **http://localhost:3000/central**
- Consume la API REST (métricas, último vehículo, desglose por categoría, listados).
- Simulación de checkout/pago con **SweetAlert2**.
- El cliente también simula el pago desde el sitio EJS: **http://localhost:3000/products/checkout**

### Gestión del proyecto

- Tablero Kanban con historias de usuario (**Issues #39 a #45** en Sprint 8).
- Documentación técnica: `README.md`
- Retrospectiva (estrella de mar): `retro.md`
- Copia local del tablero: `tablero.html`

---

## Cómo ejecutar (evaluadores)

```bash
npm install
npm start
```

Abrir **http://localhost:3000**

Cuenta de prueba (administrador): `mauro@rendiya.ar` / `rendiya2026`

Rebuild del dashboard (solo si se modifica React):

```bash
npm run central
```

---

*Archivo generado para acreditación formal del trabajo práctico.*
