# 🍽️ Pol-Kole RMS — Frontend Application

[![Angular](https://img.shields.io/badge/Angular-21.2-dd0031.svg?style=flat-square&logo=angular)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![PrimeNG](https://img.shields.io/badge/PrimeNG-21.1-red.svg?style=flat-square&logo=primeng)](https://primeng.org/)
[![Angular Material](https://img.shields.io/badge/Angular%20Material-21.2-indigo.svg?style=flat-square&logo=angular)](https://material.angular.io/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-yellow.svg?style=flat-square&logo=vitest)](https://vitest.dev/)

An enterprise-class Single Page Application (SPA) built with **Angular 21**, **PrimeNG**, and **TailwindCSS 4**. It provides a reactive, responsive, and role-based user interface for restaurant dining operations, hotel lodging management, real-time Kitchen Display Systems (KDS), waiter service dispatching, customer self-service tablets, TV screens, and executive AI business intelligence.

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technologies Used](#technologies-used)
- [Dependencies](#dependencies)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Running the Project](#running-the-project)
- [Role-Based Access & Routing](#role-based-access--routing)
- [Real-Time WebSocket Client](#real-time-websocket-client)
- [Thermal POS Receipt Printing Engine](#thermal-pos-receipt-printing-engine)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Features

### 1. Executive Dashboard
- **Real-Time KPIs**: Live counters for today's gross sales, active dine-in tables, occupied hotel rooms, pending kitchen tickets, and low-stock alerts.
- **Visual Analytics**: Interactive turnover and sales velocity charts powered by PrimeNG and RxJS data streams.

### 2. Live Public Displays & Digital Kiosks (No Login Required)
- **Takeaway TV Screen (`/display/takeaway`)**: Real-time order progress board for pickup counters showing *Preparing* and *Ready for Pickup* numbers.
- **Table Customer Tablets (`/display/table/:tableId`)**: Guest tablet interface allowing customers to view the visual menu, request water/cutlery, track order progress, and request the bill.
- **Hotel Room Tablets (`/display/room/:roomId`)**: In-room dining and guest assistance interface linked directly to the room's hotel folio.

### 3. High-Speed POS Order Builder & Orders Console
- **Quick Order Creation**: Fast-tap categorization, search, item modifier customization (spice level, special instructions), and dining channel selection (`DINE_IN`, `ROOM_SERVICE`, `TAKEAWAY`).
- **Active Orders Deck**: Live card view of all in-flight orders with stage progression, time elapsed, and instant bill generation.

### 4. Chef Kitchen Hub (Kitchen Display System - KDS)
- **Live Ticket Queue**: Color-coded cards indicating priority, cooking timer warnings, and item breakdown.
- **Interactive Ticket Progression**: Chefs tap to update cooking states (`RECEIVED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY`).
- **Served Ledger**: Historical audit trail of completed tickets.

### 5. Waiter Service Hub & Smart Dispatch
- **Ready-to-Serve Notifications**: Audio-visual chimes when the kitchen completes a dish for an assigned table.
- **Guest Call Dispatching**: Immediate alerts when guests tap "Call Waiter", "Cutlery", or "Bill" on table/room tablets.
- **Table Turnaround Tasks**: Alerts waiters when tables are vacated and need sanitization.

### 6. Dining Floor & Hotel Rooms Hub
- **Interactive Floor Grid**: Visual table layout segmented by zones (Main Hall, Garden, Rooftop Terrace) showing live vacancy/occupied/reserved states.
- **Rooms Directory**: Grid of hotel rooms displaying occupancy, housekeeping status, check-in dates, and active guest names.

### 7. Reservations & Front Desk Arrivals
- **Dining Table Bookings**: Schedule upcoming table bookings with party size, contact info, and special requests.
- **Hotel Lodging Desk**: Check-in arrivals, allocate room keys, manage guest folios, and perform expedited checkouts.

### 8. Menu Catalog & Dynamic Pricing
- **Item & Category Management**: Manage dishes, beverages, ingredients, and pricing.
- **Item Discounts & Promotions**: Schedule percentage discounts or fixed-amount price cuts with automatic expiration dates.

### 9. Point-of-Sale Billing & Voucher Engine
- **Multi-Tender Settlement**: Settle bills via `CASH`, `CARD`, or `LANKAQR` with cash change calculators.
- **Voucher Coupon Verification**: Apply promo codes and discount vouchers in real time.
- **Customer Loyalty Points**: Deduct customer points for bill discounts and accrue points for future visits.
- **Direct Thermal Receipt Printing**: Built-in 80mm/58mm thermal receipt rendering engine with printable logos, itemized tax summaries, and QR codes.

### 10. Human Resources & Shift Management
- **Daily Staff Attendance**: Quick clock-in/clock-out modal with timestamps and absence notes.
- **Staff Table Assignments**: Visual allocation tool to map waiters to specific dining zones and tables.

### 11. Reporting MIS & Autonomous AI Assistant
- **Comprehensive Reports**: Daily Flash, Menu Engineering, Hotel Yield & Occupancy, Kitchen Turnaround Times, Staff Sales Performance.
- **Interactive AI Chat Assistant**: Managers can ask natural-language business questions directly in the browser; the assistant calls backend tools and outputs executive charts and narrative insights.
- **PDF Report Download**: Stream and export compiled JasperReports PDFs directly to the client.

---

## System Architecture

The frontend is structured as a reactive, component-driven Angular application using modern standalone principles, RxJS reactive patterns, and strict TypeScript typings:

```
+-------------------------------------------------------------------------+
|                               UI LAYER                                  |
|  TailwindCSS 4  |  PrimeNG 21 Components  |  Angular Material Dialogs   |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                         MODULE VIEW COMPONENTS                          |
|  OrdersComponent | KitchenComponent | WaiterComponent | Billing...      |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                         REACTIVE SERVICE LAYER                          |
|    OrderService, TableService, BillingService, AiReportService...       |
|            State management via RxJS BehaviorSubjects & Signals         |
+------------------+-----------------------------------+------------------+
                   |                                   |
+------------------v---------------+   +---------------v------------------+
|      HTTP CLIENT SUBSYSTEM       |   |       WEBSOCKET SUBSYSTEM        |
|  AuthInterceptor (Bearer JWT)    |   |  WebSocketService (Native / WS)  |
|  REST Calls -> Backend /api/*    |   |  Subscribes to /topic/* topics   |
+------------------+---------------+   +---------------+------------------+
                   |                                   |
                   +-----------------+-----------------+
                                     |
                                     v
                       [Spring Boot Backend Engine]
```

### Key Architectural Highlights
- **Environment Auto-Sync**: Pre-build script (`scripts/set-env.js`) reads `.env` and generates environment configuration files for seamless zero-leak deployments.
- **Authentication Interceptor**: Injects `Authorization: Bearer <token>` on all outgoing HTTP requests and automatically catches `401 Unauthorized` responses to redirect to `/login`.
- **Reactive WebSocket Service**: Centralized WebSocket connection handling automatic reconnection, topic subscriptions, and typed observable broadcasting.

---

## Technologies Used

| Category | Technology / Tool | Version | Description |
| :--- | :--- | :--- | :--- |
| **Framework** | Angular | 21.2.0 | High-performance enterprise frontend web framework |
| **Language** | TypeScript | 5.9.2 | Type-safe superset of JavaScript |
| **Styling** | TailwindCSS | 4.1.13 | Utility-first CSS framework for modern, responsive UI design |
| **Theme Engine** | PrimeNG & PrimeUIX | 21.1.3 / 2.0.3 | Rich UI component suite (data tables, dropdowns, calendars) |
| **Icons** | PrimeIcons | 7.0.0 | High-quality icon set for navigation and status badges |
| **UI Components** | Angular Material & CDK | 21.2.2 | Material Design dialogs, overlays, and accessibility helpers |
| **Reactivity** | RxJS | 7.8.0 | Reactive programming library for event streams and async state |
| **CSS Pipeline** | PostCSS | 8.5.6 | Transforms CSS with TailwindCSS PostCSS plugins |
| **Test Runner** | Vitest & JSDOM | 4.0.8 / 28.0 | Next-generation fast unit testing framework |
| **Code Formatter** | Prettier | 3.8.1 | Opinionated code formatting across HTML, TS, and CSS |

---

## Dependencies

The following table summarizes the core dependencies in [`package.json`](package.json):

```json
{
  "dependencies": {
    "@angular/animations": "^21.2.2",
    "@angular/cdk": "^21.2.2",
    "@angular/common": "^21.2.0",
    "@angular/compiler": "^21.2.0",
    "@angular/core": "^21.2.0",
    "@angular/forms": "^21.2.0",
    "@angular/material": "^21.2.2",
    "@angular/platform-browser": "^21.2.0",
    "@angular/router": "^21.2.0",
    "@primeuix/themes": "^2.0.3",
    "primeicons": "^7.0.0",
    "primeng": "^21.1.3",
    "rxjs": "~7.8.0",
    "tailwindcss-primeui": "^0.6.1",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@angular/build": "^21.2.1",
    "@angular/cli": "^21.2.1",
    "@angular/compiler-cli": "^21.2.0",
    "@tailwindcss/postcss": "^4.1.13",
    "jsdom": "^28.0.0",
    "postcss": "^8.5.6",
    "prettier": "^3.8.1",
    "tailwindcss": "^4.1.13",
    "typescript": "~5.9.2",
    "vitest": "^4.0.8"
  }
}
```

---

## Prerequisites

Ensure you have the following installed on your workstation:
- **Node.js**: v20.x or v22.x LTS (Recommended)
- **npm**: v10.x or higher
- **Angular CLI**: v21.x (`npm install -g @angular/cli`)

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Nugi29/Pol-Kole-RMS.git
cd Pol-Kole-RMS/Pol-Kole-Frontend
```

### 2. Install NPM Packages
```bash
npm install
```

### 3. Verify and Configure Environment
Inspect `.env` in the `Pol-Kole-Frontend` directory:
```bash
# Verify contents
cat .env
```

Sync environment files:
```bash
npm run config
```
This triggers `node scripts/set-env.js` and outputs:
```
✔ Successfully synchronized environment files from .env / defaults.
```

---

## Configuration & Environment Variables

Frontend environment values are defined in `Pol-Kole-Frontend/.env` and automatically converted to TypeScript objects in `src/environments/environment.ts` prior to building.

### Environment Variable Reference

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `API_BASE_URL` | **Yes** | `http://localhost:8080/api` | REST API URL of the Spring Boot backend |
| `WS_BASE_URL` | **Yes** | `ws://localhost:8080/ws/orders` | Real-time WebSocket connection URL |

| `PRODUCTION` | No | `false` | Production optimization flag (`true` or `false`) |

---

## Running the Project

### Development Server
```bash
npm start
# or
ng serve
```
Navigate your browser to:
```
http://localhost:4200/
```
The application will automatically reload if you change any source files.

### Production Build
```bash
npm run build
```
Compiled production-ready bundles will be placed in the `dist/` directory, optimized with minification, tree-shaking, and asset hash stamping.

### Running Unit Tests
```bash
npm test
```
Executes test suites using the ultra-fast Vitest runner.

---

## Role-Based Access & Routing

Route protection is managed by `AuthGuard` and role metadata defined in `nav-menu.config.ts`:

| Route Path | View / Component | Allowed Roles / Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginComponent` | Public | Staff sign-in |
| `/display/takeaway` | `TakeawayDisplayComponent` | Public / Display | TV screen showing takeaway order states |
| `/display/table/:id`| `GuestDisplayComponent` | Public / Tablet | Guest self-ordering and service call |
| `/display/room/:id` | `GuestDisplayComponent` | Public / Tablet | In-room dining tablet |
| `/main/dashboard` | `HomeComponent` | `ADMIN`, `MANAGER`, `WAITER`, `CASHIER`, `CHEF` | Real-time operational dashboard |
| `/main/orders` | `OrdersComponent` | `ADMIN`, `MANAGER`, `WAITER`, `CASHIER` | POS order builder & order status |
| `/main/kitchen` | `KitchenComponent` | `ADMIN`, `MANAGER`, `CHEF` | Kitchen Display System queue |
| `/main/waiter` | `WaiterComponent` | `ADMIN`, `MANAGER`, `WAITER` | Ready dishes & guest call dispatcher |
| `/main/billing` | `BillingComponent` | `ADMIN`, `MANAGER`, `CASHIER` | Invoicing, payment, & receipts |
| `/main/tables` | `TablesComponent` | `ADMIN`, `MANAGER`, `WAITER` | Dining floor visual table manager |
| `/main/rooms` | `RoomComponent` | `ADMIN`, `MANAGER` | Hotel rooms & categories |
| `/main/reservations`| `ReservationComponent` | `ADMIN`, `MANAGER`, `WAITER` | Table & room bookings |
| `/main/check-in-out`| `CheckInOutComponent` | `ADMIN`, `MANAGER`, `WAITER` | Front desk guest arrivals & checkout |
| `/main/menu` | `MenuComponent` | `ADMIN`, `MANAGER`, `CHEF`, `WAITER` | Menu items & discount management |
| `/main/customers` | `CustomerComponent` | `ADMIN`, `MANAGER`, `CASHIER`, `WAITER` | Guest profiles & loyalty points |
| `/main/attendance` | `AttendanceComponent` | `ADMIN`, `MANAGER` | Staff clock-in ledger |
| `/main/staff-assignments` | `StaffAssignmentComponent` | `ADMIN`, `MANAGER` | Waiter-table allocation |
| `/main/reports` | `ReportsComponent` | `ADMIN`, `MANAGER`, `CASHIER` | MIS reporting & AI Assistant |
| `/main/audit-logs` | `AuditLogsComponent` | `ADMIN` | Security audit trail |
| `/main/settings` | `SettingsComponent` | `ADMIN` (Dev Key) | System & restaurant settings |

---

## Real-Time WebSocket Client

The application maintains a resilient WebSocket connection managed by `src/app/services/websocket.service.ts`:
- **Auto-Reconnect**: Detects network drops and attempts progressive reconnection.
- **Sound Alerts**: Plays distinct audio tones for kitchen order arrivals and guest service calls.
- **Targeted Notification Bell**: A top navbar badge alerting staff when new orders or service requests are logged.

```typescript
// Example: Subscribing to live orders in any component
this.websocketService.getOrderUpdates().subscribe(order => {
  this.handleIncomingOrder(order);
});
```

---

## Thermal POS Receipt Printing Engine

Located in `src/app/services/bill-print.service.ts`, this dedicated service formats and dispatches print jobs directly to POS thermal receipt printers (80mm and 58mm standard rolls):
- **Custom Header & Branding**: Restaurant logo, tax registration number, address, and cashier details.
- **Itemized Breakdown**: Quantity, name, unit price, discounts applied, and totals.
- **Tax Details**: Clear itemization of VAT and Service Charge percentages.
- **Dynamic QR Code**: Generates verification and payment QR codes on the physical slip.

---

## Project Structure

```
Pol-Kole-Frontend/
├── .env                              # Environment configuration
├── angular.json                      # Angular CLI project configuration
├── package.json                      # NPM dependencies and scripts
├── scripts/
│   └── set-env.js                    # Syncs .env to environment.ts files
└── src/
    ├── environments/                 # Auto-generated environment files
    │   ├── environment.ts            # Production configuration
    │   └── environment.development.ts# Local development configuration
    ├── styles.css                    # TailwindCSS & global styling
    └── app/
        ├── app-module.ts             # Main Angular module
        ├── app-routing-module.ts     # Client routing definitions
        ├── config/
        │   └── nav-menu.config.ts    # Role-based navigation structure
        ├── services/                 # 30+ Typed Angular business services
        │   ├── ai-report.service.ts
        │   ├── auth.service.ts / auth.guard.ts / auth.interceptor.ts
        │   ├── bill-print.service.ts # 50KB+ Thermal printer engine
        │   ├── billing.service.ts
        │   ├── order.service.ts
        │   └── websocket.service.ts
        ├── shared/                   # Reusable components & utilities
        │   ├── dialog/               # Confirmation & input dialogs
        │   ├── notification-bell/    # Navbar notification counter
        │   └── utils/
        └── views/                    # Application Views & Pages
            ├── home/                 # Main KPI dashboard
            ├── login/                # Staff authentication
            ├── mainwindow/           # Topbar & sidebar navigation shell
            └── modules/              # 17 Feature Submodules
                ├── attendance/
                ├── audit-logs/
                ├── billing/
                ├── check-in-out/
                ├── customer/
                ├── display/          # Public Takeaway & Tablet Kiosks
                ├── kitchen/          # Chef KDS Hub
                ├── menu/
                ├── orders/           # POS Order Builder
                ├── reports/          # MIS & AI Chatbot
                ├── reservation/
                ├── room/
                ├── settings/
                ├── staff-assignment/
                ├── tables/
                ├── user/
                └── waiter/           # Waiter Service Hub
```

---

## Future Improvements

- [ ] **Progressive Web App (PWA) Offline Mode**: Cache visual menus and allow local order queuing when internet connectivity drops.
- [ ] **Multi-Language Localization (i18n)**: Provide bilingual interfaces (English, Sinhala, Tamil) for customer tablets.
- [ ] **Table-Side Card NFC Reader**: Direct integration with WebUSB / WebBluetooth for mobile card swiping at the dining table.
- [ ] **Dark / Light Theme Toggle**: User-selectable themes with custom Tailwind color palettes.

---


