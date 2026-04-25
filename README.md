# Credovation — Employee Management System

A full-stack, production-ready workforce management platform built with **React 18**, **TypeScript**, **Node.js/Express**, and **Prisma ORM** on **Neon PostgreSQL**.

![License](https://img.shields.io/badge/license-MIT-0d9488)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Node](https://img.shields.io/badge/Node.js-20+-339933)

---

## ✨ Features

### 🏠 Role-Based Dashboards
- **Employee** — Personal check-in, daily tasks, leave requests, self-rating
- **Manager** — Team overview, task assignment, leave approvals, performance reviews
- **HR Admin / Super Admin** — Organization-wide analytics, employee management, system settings

### ⏰ Attendance Tracking
- One-click check-in/check-out with automatic late detection
- Status tracking: Present, WFH, On-Site Client
- Minimum 4-hour enforcement before checkout
- Self-rating (1–5 stars) with manager feedback loop

### ✅ Task Management
- Full Kanban board with 4 status columns
- Task broadcast to multiple employees
- Priority levels (High / Medium / Low) with due dates
- Real-time status updates and completion notes

### 🏖️ Leave Management
- Leave request workflow with multi-level approvals
- 5 leave types: Casual, Sick, Earned, Maternity, Paternity
- Automatic balance tracking per year
- Team leave calendar for managers

### 📊 Reports & Exports
- 5 report types: Attendance, Tasks, Performance, Leave, Late Arrivals
- **Export as CSV, Excel (.xlsx), or PDF** with branded headers
- Date range filtering with visual preview

### 🔔 Real-Time Notifications
- In-app notification centre with unread badges
- Automated notifications for leave status, task assignments, manager feedback

### 📢 Announcements & Holidays
- Company-wide announcement system with priority levels
- Holiday calendar with bulk import support

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Zustand, Recharts, Fluent UI Icons |
| **Styling** | Vanilla CSS with design tokens, glassmorphism, responsive grid |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (Neon) via Prisma ORM |
| **Auth** | JWT with bcrypt password hashing |
| **Exports** | ExcelJS (.xlsx), PDFKit (.pdf), CSV |

---

## 📂 Project Structure

```
credovation-employee-management/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── layout/        # AppLayout, Sidebar, Topbar
│   │   ├── pages/             # 16 page components
│   │   ├── services/          # API service layer (Axios)
│   │   ├── stores/            # Zustand state management
│   │   ├── types/             # TypeScript interfaces
│   │   ├── index.css          # Design system & all styles
│   │   ├── App.tsx            # Router configuration
│   │   └── main.tsx           # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── middleware/        # Auth middleware (JWT)
│   │   ├── prisma/            # Prisma schema & migrations
│   │   ├── routes/            # REST API routes
│   │   │   ├── auth.ts        # Login / Register / Me
│   │   │   ├── attendance.ts  # Check-in / Check-out
│   │   │   ├── tasks.ts       # CRUD + broadcast
│   │   │   ├── leave.ts       # Requests + approvals
│   │   │   ├── exports.ts     # Excel & PDF generation
│   │   │   ├── employees.ts   # HR employee management
│   │   │   ├── dashboard.ts   # Role-based dashboards
│   │   │   ├── holidays.ts    # Holiday calendar
│   │   │   ├── announcements.ts
│   │   │   ├── notifications.ts
│   │   │   ├── reports.ts     # Data aggregation
│   │   │   ├── settings.ts
│   │   │   └── users.ts       # Profile management
│   │   ├── utils/             # Prisma client, helpers
│   │   ├── server.ts          # Express app entry
│   │   └── seed.ts            # Database seeder
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 20
- **npm** ≥ 9
- **PostgreSQL** database (recommended: [Neon](https://neon.tech))

### 1. Clone the repository
```bash
git clone https://github.com/your-org/credovation-employee-management.git
cd credovation-employee-management
```

### 2. Setup the backend
```bash
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Generate Prisma client & push schema
npm run db:generate
npm run db:push

# (Optional) Seed demo data
npm run db:seed
```

### 3. Setup the frontend
```bash
cd ../client
npm install
```

### 4. Run in development
```bash
# Terminal 1 — Backend (port 5000)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Default Login Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@credovation.com | password123 |
| HR Admin | hr@credovation.com | password123 |
| Manager | manager@credovation.com | password123 |
| Employee | employee@credovation.com | password123 |

---

## 📦 Building for Production

### Frontend
```bash
cd client
npm run build
# Output: client/dist/
```

### Backend
```bash
cd server
npm run build
# Output: server/dist/

# Start production server
NODE_ENV=production npm start
```

---

## 🌐 Deployment

### Recommended Stack
- **Frontend**: Vercel, Netlify, or Azure Static Web Apps
- **Backend**: Railway, Render, Azure App Service, or AWS ECS
- **Database**: Neon PostgreSQL (serverless)

### Environment Variables (Production)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=8h
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

---

## 🎨 Design System

The UI uses a centralized CSS design system in `client/src/index.css`:

- **Brand**: Teal/Emerald palette (`#0d9488`)
- **Typography**: Inter (Google Fonts)
- **Components**: Glassmorphism cards, gradient buttons, animated KPI cards
- **Responsive**: Full mobile/tablet/desktop support (4 breakpoints)
- **Animations**: Fade-in, slide-up, shimmer loading, hover transforms

---

## 📄 API Reference

All endpoints are prefixed with `/api`. Authentication via `Authorization: Bearer <token>` header.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register user | — |
| POST | `/auth/login` | Login | — |
| GET | `/auth/me` | Current user | ✓ |
| POST | `/attendance/checkin` | Check in | ✓ |
| PUT | `/attendance/checkout/:id` | Check out | ✓ |
| GET | `/attendance` | Query logs | ✓ |
| GET/POST | `/tasks` | List / Create tasks | ✓ |
| PUT | `/tasks/:id` | Update task | ✓ |
| POST | `/tasks/broadcast` | Broadcast task | Manager+ |
| GET/POST | `/leave` | List / Create leave | ✓ |
| PUT | `/leave/:id/approve` | Approve/Reject | Manager+ |
| GET | `/dashboard/hr` | HR dashboard data | HR+ |
| GET | `/dashboard/manager` | Manager dashboard | Manager+ |
| GET | `/dashboard/employee` | Employee dashboard | ✓ |
| POST | `/exports/:type` | Export Excel | Manager+ |
| POST | `/exports/:type/pdf` | Export PDF | Manager+ |
| GET/POST | `/employees` | Employee CRUD | HR+ |
| GET/POST | `/holidays` | Holiday management | ✓ / HR+ |
| GET/POST | `/announcements` | Announcements | ✓ / HR+ |

---

## 📝 License

MIT © 2026 Credovation Technologies

---

<p align="center">
  Built with ❤️ by <strong>Credovation</strong>
</p>
