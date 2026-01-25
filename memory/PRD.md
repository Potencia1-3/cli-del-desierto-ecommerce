# Pump Fit CRM - Product Requirements Document

## Project Overview
**Name:** Pump Fit CRM - Sistema de Gestión para Electroestimulación
**Date:** January 25, 2026
**Status:** MVP Complete

## Original Problem Statement
CRM para Pump Fit Electro Stimulation Club donde los clientes puedan agendar sesiones y llevar control de ventas y base de datos de clientes.

## User Personas

### 1. Administrador/Staff
- Gestiona clientes, paquetes y sesiones
- Registra ventas y visualiza reportes
- Accede al dashboard con métricas del negocio

### 2. Cliente
- Agenda sus propias sesiones desde el portal
- Visualiza su información y paquetes activos
- Ve su historial de sesiones

## Core Requirements (Implemented)

### Business Rules
- Sesiones de 18 minutos de duración
- Horario: 9:00 AM - 7:00 PM
- 6 trajes EMS disponibles
- Máximo 2 sesiones por semana por cliente

### Paquetes
| Paquete | Sesiones | Reagendamientos |
|---------|----------|-----------------|
| Básico | 8 | 2 |
| Estándar | 24 | 6 |
| Premium | 50 | 12 |

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] Autenticación JWT (admin, staff, client)
- [x] CRUD de clientes con búsqueda
- [x] Historial médico de clientes
- [x] Registro de medidas corporales
- [x] Sistema de paquetes con control de sesiones
- [x] Agendamiento de sesiones con validación
- [x] Control de reagendamientos por paquete
- [x] Registro de ventas
- [x] Dashboard con estadísticas
- [x] Portal de cliente

### Frontend (React + Tailwind + Shadcn)
- [x] Página de Login con branding Pump Fit
- [x] Dashboard con métricas en tiempo real
- [x] Gestión de clientes (lista, perfil, búsqueda)
- [x] Perfil de cliente con tabs (info, paquetes, sesiones, historial médico, medidas)
- [x] Calendario semanal con slots de 18 min
- [x] Página de ventas con resumen y historial
- [x] Portal de cliente para auto-agendamiento
- [x] Diseño dark mode con colores corporativos (Magenta #E600FF, Cyan #00E5FF)

## Prioritized Backlog

### P0 (Critical) - Done ✅
- Login/Auth
- Dashboard
- Clientes CRUD
- Paquetes
- Sesiones/Calendario
- Ventas

### P1 (Important) - Future
- [ ] Notificaciones por email/SMS para recordatorios de sesión
- [ ] Exportación de reportes a Excel/PDF
- [ ] Gráficas de progreso de clientes
- [ ] Integración con WhatsApp Business

### P2 (Nice to have) - Future
- [ ] App móvil nativa
- [ ] Modo offline
- [ ] Integración con pasarelas de pago
- [ ] Sistema de recompensas/puntos
- [ ] Encuestas de satisfacción

## Technical Architecture

### Stack
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend:** FastAPI, Motor (async MongoDB), PyJWT
- **Database:** MongoDB
- **Auth:** JWT tokens

### API Endpoints
- `/api/auth/*` - Autenticación
- `/api/clients/*` - Gestión de clientes
- `/api/packages/*` - Paquetes de sesiones
- `/api/sessions/*` - Agendamiento
- `/api/sales/*` - Ventas
- `/api/dashboard/*` - Estadísticas
- `/api/portal/*` - Portal de cliente

## Credentials
- Admin: admin@pumpfit.com / admin123
