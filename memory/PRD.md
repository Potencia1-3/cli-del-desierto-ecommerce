# Pump Fit CRM - Product Requirements Document

## Original Problem Statement
"Quiero un app como CRM para mi negocio donde la gente pueda agendar la sección y también llevar un control de ventas y de base de datos de mis clientes" (I want a CRM-like app for my business where people can book sessions and I can also keep track of sales and my client database).

## Core Requirements
- **Packages & Pricing:** Three packages (8, 24, 50 sessions) with rescheduling limits, regular/promotional prices
- **Booking Rules:** Sessions 18 min, booked in 30-min intervals 9AM-7PM, 2 EMS suits max
- **Client Onboarding:** Register + $599 inscription fee. Optional $500 nutrition plan. Admin activates profile after payment
- **Referral System:** Clients refer 3+ contacts for future benefits
- **Role-Based Access (RBAC):**
  - Super Admin: Full control, user management
  - Admin: Manage clients/sales/calendar (no user management)
  - Reception (Mostrador): Daily sales, client check-in, shift management (corte de turno)
- **Client Portal:** Register, login, view progress, manage packages, book sessions, submit referrals
- **Notifications:** WhatsApp session reminders (via ElevenLabs + WhatsApp)

## Tech Stack
- Backend: FastAPI + MongoDB (motor)
- Frontend: React + Tailwind CSS + Shadcn/UI
- Auth: JWT with role-based tokens

## What's Implemented (Completed)
- [x] CRM MVP: Backend models, APIs for clients, sales, scheduling
- [x] Admin Dashboard: Stats, today schedule, calendar view
- [x] Client CRUD: Create, search, view, edit clients
- [x] Client Portal: Registration, login, booking, progress tracking, referrals
- [x] Package System: 4 package types with promo/normal pricing
- [x] Session Booking: 30-min slots, 2 suits, weekly limit (2/week)
- [x] Inscription Fee + Nutrition Plan + Profile Activation flow
- [x] Sales tracking with payment method (cash/card/transfer)
- [x] Referral system (add, view, update status)
- [x] **RBAC System (Completed Mar 5, 2026):**
  - Super Admin, Admin, Reception roles fully implemented
  - Role-based route protection (frontend)
  - Conditional sidebar navigation per role
  - Backend endpoint protection with decorators
  - User Management page (CRUD for superadmin)
  - Reception page with shift management (corte de caja)
  - Auto-redirect: reception -> /reception, client -> /portal

## Credentials
- Super Admin: super@pumpfit.com / super123
- Admin: admin@pumpfit.com / admin123
- Reception: mostrador@pumpfit.com / mostrador123
- Client (example): maria.garcia@test.com / test123

## Upcoming Tasks (P1)
- [ ] WhatsApp + ElevenLabs integration for session reminders

## Future Tasks (P2)
- [ ] Referral benefits system (rewards for 3+ referrals)
- [ ] Refactor ClientProfile.js (1200+ lines -> sub-components)
- [ ] DialogDescription accessibility fix in all dialogs

## Architecture
```
/app/
├── backend/
│   ├── server.py (all backend logic, ~1400 lines)
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js (routes with role-based protection)
│       ├── components/Layout.js (conditional nav by role)
│       ├── context/AuthContext.js
│       ├── lib/api.js (all API functions)
│       └── pages/
│           ├── Dashboard.js, Clients.js, ClientProfile.js
│           ├── Calendar.js, Sales.js
│           ├── Reception.js (shift mgmt, daily sales, client check-in)
│           ├── UserManagement.js (CRUD users, shift history)
│           ├── ClientPortal.js, ClientLogin.js, Login.js
└── memory/PRD.md
```
