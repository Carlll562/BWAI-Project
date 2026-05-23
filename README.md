# Campus Event Aggregator & Conflict-Prevention Engine

Welcome to the **Campus Event Aggregator & Conflict-Prevention Engine**! This repository houses a centralized event discovery and reservation system designed specifically for campus environments. It balances rigid, transactional scheduling controls with high-performance content discovery.

This system is built to serve three core student and university staff personas:
1. **General Students (Discoverers):** Access a fast, responsive feed to browse events by interest tags, RSVP, and get check-in QR codes.
2. **Student Organization Leaders (Organizers):** Run live conflict checks, submit proposal drafts, track guest lists, and scan entry codes.
3. **Faculty & Campus Administrators (Approvers):** Review pending proposals, view automatic warnings, and approve or reject entries.

---

## 🏛️ System Architecture

The project employs a **Hybrid Data Architecture** to combine the benefits of relational (structured, transactional) and non-relational (unstructured, high-read) databases:

```
                  +----------------------------------------------+
                  |              EXPRESS BACKEND                 |
                  |           Zero-Trust API Gateway             |
                  +--------------+----------------+--------------+
                                 |                |
             +-------------------+                +-------------------+
             | (ACID Transactions)                | (High-Speed Read)
             v                                    v
     +---------------+                    +---------------+
     |     MySQL     |                    |    MongoDB    |
     +---------------+                    +---------------+
     | - Users & RBAC|                    | - Event Docs  |
     | - Schedules   |                    | - Dynamic Tags|
     | - Venues      |                    | - Audit Logs  |
     | - RSVPs       |                    +---------------+
     +---------------+                            ^
             |                                    |
             +-----------(Sync Status)------------+
```

* **MySQL (Relational / Transactional):** Holds users, RBAC roles (`STUDENT`, `ORGANIZER`, `ADMIN`), physical venue capacities, event dates, RSVPs, and check-in statuses. All conflict resolution math and state transactions execute on MySQL to enforce relational integrity.
* **MongoDB (Document / Read-Optimized):** Stores rich event detail metadata, dynamic interests tags, poster images, and audit details. The student discovery feed reads *exclusively* from MongoDB to maximize performance. Approved schedule transitions in MySQL are propagated to MongoDB via synchronized atomic updates.

---

## ⚡ Key Features

* **Two-Stage Conflict Engine:**
  * **Stage 1 (Hard Conflicts):** Instantly rejects overlaps at the same venue or events scheduled outside the venue's operating hours.
  * **Stage 2 (Soft Conflicts):** Auto-flags warnings (e.g. less than a 15-minute logistical buffer, student organizers double-booked in multiple places, or competing events sharing the same category tags at the same time) and routes proposals to a manual administrator review queue.
* **Zero-Trust Security Boundary:** Every request payload is strictly validated using `Zod` schemas before processing. SQL operations use parameterized queries to eliminate SQL injection.
* **Secure RSVP QR Check-in:** Prevents double RSVPs, generates cryptographically signed check-in signatures, and blocks ticket duplication or reuse at the door.

---

## 📂 Repository Structure

The repository is structured logically as a monorepo splits:

```
├── .agents/                    # Specialized AI developer pipelines & workflows
├── client/                     # React + Vite + Tailwind CSS Frontend SPA
│   ├── src/                    # UI Components and views
│   └── tailwind.config.js      # Styling framework definitions
├── docs/                       # Architectural design documents, specs & PRD
│   ├── openapi.yaml            # Complete OpenAPI 3.0 API Specification
│   ├── prd.md                  # Product Requirements Document
│   └── sdd.md                  # System Design Document
├── server/                     # Express + Node.js Backend Server
│   ├── config/                 # Database connection pools (MySQL & MongoDB)
│   ├── controllers/            # API endpoints logic & database operations
│   ├── middlewares/            # Zod validation & RBAC security controllers
│   ├── models/                 # Database schemas (MySQL schemas DDL + Mongoose models)
│   ├── routes/                 # Express endpoint endpoints routing
│   ├── scripts/                # Database initialization and verification scripts
│   ├── services/               # Conflict-prevention logic engine
│   └── tests/                  # Integration tests (Jest & Supertest)
├── README.md                   # This project guide
└── HANDOVER.md                 # System maintenance & troubleshooting manual
```

---

## 🚀 Quickstart Setup Guide

Follow these steps to run the application locally on your machine.

### 📋 Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **MySQL Server** (v8.0 or higher)
* **MongoDB Community Server** (v6.0 or higher)

---

### 🔧 1. Configure the Backend

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   Copy the template `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
4. Open the `.env` file and configure it with your database credentials:
   ```env
   PORT=5000
   NODE_ENV=development

   # MySQL Settings
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=campus_event_aggregator

   # MongoDB Settings
   MONGO_URI=mongodb://127.0.0.1:27017/campus_events
   ```

---

### 🛢️ 2. Initialize the Databases

Make sure your MySQL and MongoDB servers are running locally. Then execute the database setup command:

```bash
# This creates the database and executes server/models/mysql/schemas.sql
npm run db:test:init
```

To quickly verify that the backend can talk to both MySQL and MongoDB successfully, run the connectivity diagnostic tool:
```bash
node scripts/dbTest.js
```
*Expected output:* `🎉 [PASS] All database connections are fully active and verified!`

---

### 🧪 3. Running local Integration Tests

The test suite runs integration scenarios for the Two-Stage Conflict-Detection Engine (Perfect Adjacency, Venue Closed, Same Venue Back-to-Back, Tag Audience Overlaps, Zod validations, etc.).

To execute the tests, run:
```bash
# Direct command (bypasses Windows script restrictions if PowerShell blocks npm)
node node_modules/jest/bin/jest.js --runInBand --detectOpenHandles
```
*Tip:* The `--runInBand` flag forces Jest to run tests sequentially, ensuring database setup state transitions don't clash during tests.

---

### 💻 4. Spin Up the App

#### Start the Backend:
Inside `server/`:
```bash
node index.js
```
The server will boot on `http://localhost:5000` with the healthcheck endpoint active at `/health`.

#### Start the Frontend:
1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173` (or the port specified by Vite).

---

## 🛡️ Role-Based Access (RBAC) Quick Overview

When developing endpoints or making frontend API calls, verify that you are sending the correct headers matching your target access credentials.

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/events` | `GET` | **Public / STUDENT** | Retrieves approved discovery feed. |
| `/api/events` | `POST` | **ORGANIZER** / **ADMIN** | Submits a proposal. Zod checks schema. |
| `/api/events/venues` | `GET` | **Public** | Queries operating times and spaces. |
| `/api/events/check-conflicts` | `POST` | **ORGANIZER** / **ADMIN** | Dynamic dry-run for conflict checkers. |
| `/api/events/proposals` | `GET` | **ORGANIZER** (own) / **ADMIN** | Fetches administrative proposal review queue. |
| `/api/events/:id/approve` | `POST` | **ADMIN** | Approves schedule, initiates MongoDB sync. |
| `/api/events/:id/reject` | `POST` | **ADMIN** | Rejects proposal with mandatory reason. |
| `/api/events/:id/rsvp` | `POST` | **STUDENT** | RSVPs to event, returns check-in signature. |
| `/api/events/rsvp/scan` | `POST` | **ORGANIZER** (at door) | Validates QR code, marks checked_in = true. |

For detailed models, schemas, and error shapes, consult the [OpenAPI specification file](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/docs/openapi.yaml).

---
*Maintained by the Student Dev Committee. For any queries, open an Issue or pull request.*
