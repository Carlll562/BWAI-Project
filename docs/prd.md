# Product Requirements Document (PRD)

## 1. Document Overview & Context
This Product Requirements Document (PRD) establishes the functional and non-functional requirements for the **Campus Event Aggregator & Conflict-Prevention Engine**. The engine acts as a unified hub for students, student organizations, and administrators to discover events, prevent scheduling conflicts, and streamline approval workflows.

This document is cross-referenced with the [System Design Document (SDD)](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/docs/sdd.md) and the [UI/UX Design Document](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/docs/design.md).

---

## 2. Core Problem Statement & Objectives

### Problem Statement
Campus life is saturated with events organized by dozens of student groups. Currently, scheduling is fragmented, leading to two primary issues:
1. **Logistical Overlaps (Hard Conflicts):** Multiple organizations attempt to book the same physical space at the same time, leading to last-minute cancellations or administrative chaos.
2. **Engagement Overlaps (Soft Conflicts):** Events targeting identical student audiences (e.g., two major computer science events or two cultural festivals) are scheduled simultaneously, cannibalizing attendance and splitting student engagement.
3. **Disorganized Discovery:** Students lack a single, personalized source to find events based on dynamic interests, while organizers lack an efficient way to verify RSVPs and track attendance.

### Objectives
* **Zero Double-Bookings:** Eliminate physical venue booking conflicts using a real-time transactional conflict-prevention engine.
* **Intelligent Engagement Warnings:** Notify organizers during the draft phase if another event with highly overlapping student interest tags is scheduled at the same time.
* **Unified Event Discovery:** Provide students with a mobile-first, high-performance, tag-filtered feed of approved events.
* **Audit-Ready Workflows:** Create a digital trail of event proposals, security checks, and administrative sign-offs.

---

## 3. User Personas

We target three primary user personas, each with distinct needs, pain points, and product touchpoints:

### Persona 1: General Student (Discoverer)
* **Name:** Leo Chen
* **Role:** Junior, Computer Science & Graphic Design enthusiast.
* **Need:** Needs a quick, visual, mobile-first feed to find relevant weekend events, RSVP instantly, and check in without printing tickets.
* **Pain Point:** Finds out about events too late through scattered social media posts or spam emails.
* **System Interface:** Mobile-First Student Discovery Portal.

### Persona 2: Student Organization Leader (Organizer)
* **Name:** Sarah Jenkins
* **Role:** President of the Developer Student Club (DSC).
* **Need:** Needs to draft event proposals, check venue availability instantly, prevent conflicts with other tech clubs, and manage the attendee list on-site.
* **Pain Point:** Books a room, coordinates speakers, and then gets notified by administration days later that the room was already taken.
* **System Interface:** Desktop Organizer Management Dashboard.

### Persona 3: Administrator / Faculty Adviser (Approver)
* **Name:** Dr. Evelyn Marcus
* **Role:** Director of Student Activities.
* **Need:** Needs an aggregated queue of pending proposals, clear automated indicators of scheduling or safety issues, and a one-click digital approval/rejection tool.
* **Pain Point:** Bombarded by paper forms and emails; manually cross-referencing multiple calendar sheets to check for venue conflicts.
* **System Interface:** High-Privilege Administration Dashboard.

---

## 4. Prioritized Feature List

We categorize features using the MoSCoW method:

### Must Have (P0)
* **Real-time Conflict Checking:** Relational scheduling checks in MySQL (preventing overlapping times at the same venue).
* **Role-Based Access Control (RBAC):** Strict JWT-based verification for Student, Organizer, and Admin routes.
* **Proposal Submission Queue:** Organizer interface to submit draft proposals and Admin interface to approve/reject them.
* **Mobile-First Student Feed:** Read-optimized discovery feed sourced exclusively from MongoDB, filterable by tags.
* **RSVP & Entry QR Generation:** Students can RSVP, and organizers can scan a generated secure QR code to record attendance.

### Should Have (P1)
* **Audience Conflict Warning (Soft Conflict):** Proactive warnings during drafting if events with overlapping tags run concurrently.
* **Immutable Audit Trail:** Audit logs stored in MongoDB tracking every proposal creation, approval, and rejection action.
* **Setup/Cleanup Buffers:** Automatic enforcement of 15-minute buffers between physical events in the same venue.

### Could Have (P2)
* **Automated Venue Hours Check:** Rejection of event requests scheduled outside of physical venue operating hours.
* **Interactive RSVP Analytics:** Simple chart dashboards showing RSVP growth rate and attendance rates for organizers.

### Won't Have (P3 - Future Phase)
* **Payment Gateway Integration:** Ticket sales or transactional fees.
* **External Calendar Sync:** Direct integration with Google Calendar/Outlook APIs (postponed for Phase 2).

---

## 5. Core User Stories

### Story 1: Proposing an Event (Sarah, Organizer)
> **As** a Student Organization Leader,  
> **I want to** draft and submit an event proposal with a designated venue, time, and content tags,  
> **So that** I can secure the booking and send it to the administration queue for approval.
* **Acceptance Criteria:**
  1. The form requires title, description, start/end time, venue, and at least one interest tag.
  2. Submitting triggers an immediate hard-conflict check in MySQL.
  3. If a hard conflict exists, the system blocks the submission and displays the conflicting event details.
  4. If only soft conflicts exist, the proposal is saved in `PENDING` status, flagged with warnings, and added to the admin queue.

### Story 2: Detecting a Conflict (Dr. Evelyn Marcus, Admin)
> **As** an Administrator,  
> **I want to** see automated visual alerts showing hard and soft conflicts on pending event proposals,  
> **So that** I can make informed approval decisions without manually cross-referencing calendars.
* **Acceptance Criteria:**
  1. The admin approval dashboard displays pending proposals sorted by submission date.
  2. Proposals with detected conflicts are clearly flagged with high-visibility color-coded alerts (e.g., Red for Hard Conflict, Amber for Soft Audience Overlap).
  3. Clicking on an alert displays a comparison interface showing the overlapping times, venues, or tags of the conflicting events.

### Story 3: Discovering and Checking In (Leo, General Student)
> **As** a General Student,  
> **I want to** filter events by my favorite tags, RSVP to an event, and present a QR code at the door,  
> **So that** I can easily discover social activities and get checked in instantly by the event organizers.
* **Acceptance Criteria:**
  1. The student feed allows filtering by single or multiple tags (e.g., `#tech`, `#networking`).
  2. Clicking "RSVP" checks availability limits in MySQL and registers the student.
  3. The system generates a cryptographic QR code containing the RSVP signature.
  4. The organizer can scan this QR code via their dashboard, which validates the signature against MySQL and marks the attendee as "checked-in".
