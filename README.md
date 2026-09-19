# RendiYa

**Book a licensed vehicle for your driving test — by time slot, not by the day.**

RendiYa is a full-stack booking platform for people taking the practical driving exam in Buenos Aires (CABA and GBA). Traditional rentals are priced per day and are not coordinated with test centers. This product sells a **short slot with a suitable car or motorcycle**, close to the licensing office, with inspection (VTV) and exam insurance included.

| Storefront | Reservations API | Operations dashboard |
| --- | --- | --- |
| [mauroacarbone/rendiya](https://github.com/mauroacarbone/rendiya) | [mauroacarbone/rendiya-api](https://github.com/mauroacarbone/rendiya-api) | [mauroacarbone/rendiya-dashboard](https://github.com/mauroacarbone/rendiya-dashboard) |

This repository is the **customer-facing storefront**: catalog, checkout, accounts, and self-service bookings.

---

## Problem and approach

Candidates often pass the theory exam but do not have a vehicle that meets test-center rules. RendiYa treats each listing as a **bookable slot** (vehicle + zone + time window), with an optional instructor add-on.

Customers complete the flow on the website. Admins manage the fleet. An operations dashboard is available for staff; it is not required to confirm a booking.

---

## Features

- Filterable catalog (car / motorcycle, CABA / GBA, search)
- Single-slot cart with optional instructor
- Checkout with date and time window; the booking is **confirmed** on submit
- **My reservations**: list, confirm pending slots, and cancel — on the storefront
- Role-based access: fleet CRUD and user directory for **admins only**
- Session auth (bcrypt, remember-me cookie) with server- and client-side validation
- JSON APIs for users and products (`/api/users`, `/api/products`)
- Syncs the logged-in user with **rendiya-api** (JWT) so reservations persist in the booking service

---

## Architecture

```text
Browser  →  Express + EJS storefront (:3000)
                 │
                 ├─ SQLite / MySQL (catalog, users, session)
                 │
                 └─ rendiya-api (:3001)  JWT REST  →  reservations
                              ▲
                              │
                    rendiya-dashboard (:5173)
                    staff console (React + Vite)
```

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20+, Express 5 |
| Views | EJS, custom CSS (Poppins / Inter) |
| Storefront data | Sequelize; SQLite in development, MySQL when `DB_HOST` is set |
| Auth | express-session, cookies, bcryptjs |
| Bookings | JWT REST — [rendiya-api](https://github.com/mauroacarbone/rendiya-api) |
| Ops UI | [rendiya-dashboard](https://github.com/mauroacarbone/rendiya-dashboard) |

---

## Local setup

**Prerequisite:** Node.js 20+.

The storefront uses SQLite locally; MySQL is not required.

### 1. Storefront — port 3000

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Reservations API — port 3001

Clone [rendiya-api](https://github.com/mauroacarbone/rendiya-api), copy `.env.example`, then:

```bash
npm install
npm run swagger
npm run dev
```

The catalog works without the API. Confirming a booking requires it.

### 3. Dashboard — port 5173 (optional)

Clone [rendiya-dashboard](https://github.com/mauroacarbone/rendiya-dashboard):

```bash
cp .env.example .env.local
npm install
npm run dev
```

Storefront environment (`.env`):

```env
RENDIYA_API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:5173
SESSION_SECRET=replace-with-a-long-random-string
NODE_ENV=development
```

### Demo account

| Role | Email | Password |
| --- | --- | --- |
| Admin | `mauro@rendiya.ar` | `rendiya2026` |

Sign-in and registration sync the user to the reservations API.

---

## Main routes

| Path | Access |
| --- | --- |
| `/`, `/products`, `/products/:id` | Public catalog |
| `/products/cart`, `/products/checkout` | Booking |
| `/users/register`, `/users/login`, `/users/profile` | Account |
| `/users/reservations` | Authenticated bookings |
| `/products/create`, `/products/baja` | Admin fleet |
| `/users` | Admin user list |
| `GET /api/users`, `GET /api/products` | JSON |

---

## Deployment

Free [Render](https://render.com) Hobby workspace (no card required for static + free web). Order: **API → storefront → dashboard**.

1. Connect GitHub and create a **Web Service** from `mauroacarbone/rendiya-api` (Free instance). Wait until `https://rendiya-api.onrender.com` answers.
2. Create a **Web Service** from `mauroacarbone/rendiya`. Set `RENDIYA_API_URL` to that API origin (no trailing slash) and `DASHBOARD_URL` after step 3 (you can redeploy).
3. Create a **Static Site** from `mauroacarbone/rendiya-dashboard`. Build-time env: `VITE_API_URL=https://rendiya-api.onrender.com/api` and `VITE_SITE_URL` = the storefront URL. Redeploy the storefront with `DASHBOARD_URL`.

`STOREFRONT_SECRET` must match on API and storefront (`rendiya-storefront-live` in each `render.yaml`).

Free web services sleep after ~15 minutes idle; the first hit can take about a minute. SQLite on Render is ephemeral (data resets if the instance is recreated).

---

## Repository layout

```text
src/
  app.js
  controllers/          # pages and /api JSON
  routes/
  views/                # EJS templates
  database/             # Sequelize models and seed
  middlewares/
  services/rendiyaApi.js
public/                 # CSS, client JS, images
```

On boot the app runs `sequelize.sync` and seeds an empty database.

Wireframes and early brand work live in [`wireframes/`](wireframes/) and [`design/`](design/).

---

## Author

**Mauro Carbone** — Full Stack developer.

RendiYa started as a Digital House capstone and is maintained as a three-service product (storefront, API, operations dashboard).
