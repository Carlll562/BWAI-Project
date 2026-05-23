# System Handoff & Maintenance Guide (HANDOVER.md)

Welcome, future student maintainer! This document was crafted to make your transition into managing the **Campus Event Aggregator & Conflict-Prevention Engine** as smooth and confident as possible. 

This guide details the operational procedures, database maintenance, access management workflows, and quick recipes to diagnose and fix issues on staging or production servers.

---

## 🔑 Access Management: Managing User Roles & Privileges

The application uses **Role-Based Access Control (RBAC)** based on JWT user claims and verified against the MySQL `users` table.

```
  STUDENT (General)            ORGANIZER (Leaders)              ADMIN (Approvers)
   - Browse events feed         - Propose events                 - Access all proposals
   - RSVP & Get QR codes        - Check scheduling conflicts     - Approve events (starts sync)
                                - Scan entry codes at door       - Reject events (with reasons)
```

The user roles are represented by an `ENUM('STUDENT', 'ORGANIZER', 'ADMIN')` in the MySQL database structure.

### 1. Granting Administrator Privileges
To promote a user to an Administrator (e.g. appointing a new student advisor or faculty member), execute this SQL update query against your MySQL instance:

```sql
-- Promote user to ADMIN
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'new.admin@campus.edu';
```

### 2. Granting Organizer Privileges
To register a student club leader so they can submit proposals and scan tickets:

```sql
-- Promote user to ORGANIZER
UPDATE users 
SET role = 'ORGANIZER' 
WHERE email = 'club.leader@campus.edu';
```

### 3. Revoking Privileges (Demotion to General Student)
If an administrator or organizer graduates or leaves their post, demote them to a default student to remove write privileges:

```sql
-- Demote user back to STUDENT
UPDATE users 
SET role = 'STUDENT' 
WHERE role IN ('ADMIN', 'ORGANIZER')
  AND email = 'graduated.student@campus.edu';
```

### 4. Creating a New User Seed Script
If you need to seed a fresh database with temporary test accounts:
1. Log into your MySQL console.
2. Run this block to create one of each role for local manual testing:
```sql
USE campus_event_aggregator;

INSERT INTO users (email, password_hash, role) VALUES 
('admin.test@campus.edu', '$2b$10$hashedpasswordhere...', 'ADMIN'),
('org.test@campus.edu', '$2b$10$hashedpasswordhere...', 'ORGANIZER'),
('student.test@campus.edu', '$2b$10$hashedpasswordhere...', 'STUDENT');
```

---

## 🛢️ Schema Migrations & Alterations

### Modifying MySQL Tables
All relational DDL constraints reside in [schemas.sql](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/server/models/mysql/schemas.sql). If you need to add a column (e.g., adding `description` or `image` reference to venues):
1. **Never alter schemas directly on production without backing up first.** Run:
   ```bash
   mysqldump -u [user] -p campus_event_aggregator > backup.sql
   ```
2. Write a migration script or run the query via your CLI:
   ```sql
   ALTER TABLE venues ADD COLUMN description TEXT NULL;
   ```
3. Update [schemas.sql](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/server/models/mysql/schemas.sql) so that fresh database installations in the future will have your new fields.

### Modifying MongoDB Documents
MongoDB is flexible, but Mongoose schemas require corresponding model updates.
1. Open [EventDocument.js](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/server/models/mongo/EventDocument.js).
2. Add your field to the schema object (e.g., adding a `sub_category` string):
   ```javascript
   sub_category: {
     type: String,
     default: ''
   }
   ```

---

## 🛠️ Common Troubleshooting Scenarios

### Scenario A: MongoDB is Out of Sync with MySQL
**Symptom:** An event is approved in MySQL, but students do not see it on the frontend Discovery Feed.
**Underlying Cause:** The server restarted, had network hiccups, or encountered a mongoose connection timeout right when an Admin clicked "Approve". The relational update went through, but the MongoDB sync update was missed.

**The Fix:** Run a manual reconciliation script! Create a scratch script `server/scratch/reconcile.js` (or run this logic directly in a node repl) to sync all approved MySQL schedules back to MongoDB:

```javascript
// Quick Reconciliation Snippet
const { mysqlPool } = require('../config/db');
const EventDocument = require('../models/mongo/EventDocument');

const reconcile = async () => {
  console.log('🔄 Starting Database Sync Reconciliation...');
  
  // 1. Fetch all approved schedules in MySQL
  const [mysqlApproved] = await mysqlPool.query(
    "SELECT id, status FROM event_schedules WHERE status = 'APPROVED'"
  );
  
  // 2. Align MongoDB statuses
  for (const event of mysqlApproved) {
    await EventDocument.findOneAndUpdate(
      { mysql_event_id: event.id },
      { status: 'APPROVED' }
    );
  }
  
  console.log('✅ Reconciliation complete! Databases are perfectly aligned.');
  process.exit(0);
};
```

---

### Scenario B: "Venue Closed" Hard Conflicts When Dates Seem Valid
**Symptom:** Student org submits a proposal for `10:00 AM - 12:00 PM` on a regular day, but the API rejects it with a `409 Conflict: Venue Closed` error.
**Underlying Cause:** Timezones! JavaScript `new Date(string)` parses inputs as UTC, but local clients often send dates without offset markers, resulting in time shifts. Alternatively, the event spans two dates due to UTC shifting, violating the single-day operation limit.

**The Fix:**
1. Check that the frontend client sends ISO 8601 strings ending in `Z` (e.g. `2026-10-15T10:00:00Z`).
2. Log the output of the date parser in `server/services/conflictEngine.js`:
   ```javascript
   console.log('Proposed Start (UTC Time portion):', startTimePart); 
   console.log('Venue Start Limit:', operating_start);
   ```
3. Educate organizers to specify timezone indicators explicitly.

---

### Scenario C: Backend Fails to Start With `EADDRINUSE: address already in use :::5000`
**Symptom:** Starting the server results in a crash with the port already bound.
**Underlying Cause:** A dangling Node process is running in the background from a previous crash or a terminal that was closed improperly.

**The Fix (Windows Powershell):**
Find the process ID (PID) occupying port 5000 and terminate it:
```powershell
# 1. Find process occupying 5000
netstat -ano | findstr 5000

# 2. Look at the PID at the end of the line (e.g., 14824) and terminate it:
taskkill /F /PID 14824
```

---

### Scenario D: Jest Tests Timeout or Clash
**Symptom:** Running tests results in random database insertion failures or lock timeouts.
**Underlying Cause:** Multiple Jest workers running in parallel try to write to the same relational tables simultaneously.
**The Fix:** Ensure you are executing tests sequentially using the `--runInBand` flag, which is already configured in the npm test pipeline.
```bash
node node_modules/jest/bin/jest.js --runInBand --detectOpenHandles
```

---

## 📈 System Monitoring & Log Diagnostics

* **API Request Auditing:** All request boundaries are protected by Helmet security headers. Inspect your application logs or hook up a logger like `morgan` inside `server/app.js` to get a structured stream of incoming endpoints.
* **Audit Trails:** Faculty reviews are logged in the `approvals` database table, creating an immutable timeline of who approved or rejected a schedule, and why. If a student organization contests a rejection, query this table to check the record:
  ```sql
  SELECT * FROM approvals WHERE event_schedule_id = [Target_ID];
  ```

With these instructions, you are fully prepared to maintain, debug, and expand this platform. Good luck with your development cycles!

---
*Created by the Campus Event Aggregator Core Development Team.*
