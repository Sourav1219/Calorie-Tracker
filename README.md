# 🥗 PureIntake — Calorie Tracker

A full-stack calorie tracking web application inspired by HealthifyMe.  
Track meals, water intake, macros, and daily progress with a beautiful mobile-first UI.

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React (Vite), Tailwind CSS, React Router, Recharts |
| Backend    | Node.js, Express.js, Mongoose                     |
| Database   | MongoDB (local)                                   |
| Auth       | JWT (jsonwebtoken) + bcryptjs                     |
| Icons      | Lucide React                                      |

## Project Structure

```
PureIntake/
├── client/          ← React Vite frontend (port 5173)
├── server/          ← Express.js backend  (port 5001)
└── README.md
```

## Quick Start

### 1. Backend

```bash
cd server
npm install
npm run migrate:pg-to-mongo   # optional: copies existing PostgreSQL data into MongoDB
# OR if starting fresh (no PostgreSQL data to migrate):
# npm run seed
npm run dev
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

### 3. Verify

- Frontend: http://localhost:5173
- Backend:  http://localhost:5001
- Test API: http://localhost:5001/api/food/test

## Environment Variables

Configure `server/.env`:

```env
MONGODB_URI="mongodb://127.0.0.1:27017/pureintake"
POSTGRES_URL="postgresql://postgres:password@localhost:5432/pureintake" # optional, only for one-time migration
JWT_SECRET="your_secret_key"
PORT=5001
NODE_ENV="development"
ADMIN_EMAILS="*" # comma-separated admin emails; use * for local development
```

## Admin Bulk Upload

- UI: `/admin/bulk-upload` (after login)
- API: `POST /api/food/bulk`
- Input: JSON array or CSV parsed by the admin panel

## Quality & Safety Tooling

### Type safety (TypeScript checks on JS)

```bash
cd client && npm run typecheck
cd server && npm run typecheck
```

### Unit tests

```bash
cd client && npm run test:unit
cd server && npm run test:unit
```

### E2E tests

```bash
cd client
npx playwright install chromium   # first time only
npm run test:e2e
```

### Runtime hardening

- Request logging + process-level error monitoring (server)
- API rate limiting (`/api` global + stricter auth limiter)
- Response caching for public food catalog endpoints:
  - `GET /api/food/search`
  - `GET /api/food/categories`
- Frontend global error capture + improved ErrorBoundary fallback
- Vite bundle optimization with manual chunk splitting

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and get JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PATCH | `/api/auth/me` | Yes | Update current user profile |
| PUT | `/api/auth/profile` | Yes | Update current user profile |

### Food

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/food/search?q=&category=` | No | Search food catalog |
| GET | `/api/food/categories` | No | List normalized food categories |
| GET | `/api/food/:id` | No | Get food details |
| POST | `/api/food` | Yes | Create custom food item |
| POST | `/api/food/bulk/analyze` | Admin | Validate bulk payload |
| POST | `/api/food/bulk` | Admin | Bulk upload food items |
| GET | `/api/food/bulk/history` | Admin | Bulk upload history |

### Meals

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/meals/today?date=YYYY-MM-DD` | Yes | Get today's meals |
| POST | `/api/meals` | Yes | Add meal entry |
| DELETE | `/api/meals/:id` | Yes | Delete meal entry |

### Water

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/water/today?date=YYYY-MM-DD` | Yes | Get today's water entries |
| POST | `/api/water` | Yes | Add water entry |
| DELETE | `/api/water/:id` | Yes | Delete water entry |

### Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/logs/today?date=YYYY-MM-DD` | Yes | Get daily log summary |
| DELETE | `/api/logs/today?date=YYYY-MM-DD` | Yes | Reset daily log |
| GET | `/api/logs/month?month=&year=` | Yes | Get monthly logs |
| GET | `/api/logs/:date` | Yes | Get log by date |

### Meal Sections

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/meal-sections` | Yes | List user meal sections |
| POST | `/api/meal-sections` | Yes | Create meal section |
| PATCH | `/api/meal-sections/reorder` | Yes | Reorder meal sections |
| PATCH | `/api/meal-sections/:id` | Yes | Update meal section |
| DELETE | `/api/meal-sections/:id` | Yes | Delete meal section |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications/smart` | Yes | Get smart notifications |
| POST | `/api/notifications/update-activity` | Yes | Update activity status |
| POST | `/api/notifications/mark-shown` | Yes | Mark notification as shown |

## Features (Planned)

- 📊 Dashboard with calorie ring & macro breakdown
- 🍽️ Meal logging (Breakfast / Lunch / Snacks / Dinner)
- 💧 Water intake tracker
- 🔍 Food database with 150+ Indian foods
- 📅 Calendar progress view
- 👤 User profile & goal setting
- 🔐 JWT authentication

## License

MIT
