# UI/UX Design Document

## 1. Document Overview & Context
This UI/UX Design Document defines the design tokens, visual aesthetics, color palettes, and React component hierarchies for the **Campus Event Aggregator & Conflict-Prevention Engine**. It ensures all interfaces across our three distinct user bases maintain a premium, state-of-the-art look and feel.

This document is cross-referenced with the [Product Requirements Document (PRD)](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/docs/prd.md) and the [System Design Document (SDD)](file:///c:/Users/CARL/Documents/BuildWIthAI/BWAI-Project/docs/sdd.md).

---

## 2. Core Design Philosophy

To deliver an exceptional user experience, we adhere to the following four design pillars:
* **Rich & Modern Aesthetics:** Utilize a deep, sophisticated dark-mode palette layered with frosted glass (glassmorphism) elements and smooth, vibrant accent gradients to captivate users.
* **Contextual Color Coding:** Never use generic primary colors. Use carefully mapped HSL status colors (Emerald for Approved, Rose for Hard Conflicts, Amber for Soft Conflicts) to convey real-time system states without cluttering the UI.
* **Micro-Animations & Visual State Indicators:** Enhance interactions with micro-transitions (e.g., card expansion on hover, springy toggle buttons, and smooth loading shimmer skeletons).
* **Responsive Layout Integrity:** General student views are strictly mobile-first with thumb-friendly controls, while organization leader and admin views utilize advanced, informative desktop grids.

---

## 3. Tailwind CSS Design System

We use a custom, premium design token setup utilizing Tailwind utility classes.

### 3.1. Color System
Our theme is built on a dark aesthetic (`bg-zinc-950`) contrasted with premium gradients and rich feedback colors.

```javascript
// tailwind.config.js theme extension preview
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#09090b',       // bg-zinc-950
          card: '#18181b',       // bg-zinc-900
          border: '#27272a',     // border-zinc-800
        },
        gradient: {
          start: '#6366f1',      // Indigo 500
          end: '#8b5cf6',        // Violet 500
        },
        status: {
          approved: '#10b981',   // Emerald 500
          hardConflict: '#f43f5e',// Rose 500
          softConflict: '#f59e0b',// Amber 500
          pending: '#3b82f6',     // Blue 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    }
  }
}
```

### 3.2. Visual Styling Classes
* **Frosted Glass Containers:** `backdrop-blur-md bg-white/5 border border-white/10 shadow-xl`
* **Brand Premium Gradient Text:** `bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-transparent`
* **Card Hover State:** `transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30`

---

## 4. Component Hierarchy

### 4.1. Mobile-First Discoverer App (General Students)
Designed as a sleek mobile web application.

```
StudentFeedLayout (Main Container - max-w-md mx-auto)
 ├── StudentHeader (Avatar, Profile, RSVP Badge indicator)
 ├── TagScroller (Horizontal horizontal scrolling pill list of interest tags)
 │    └── TagPill (Active/Inactive toggle state with dynamic gradient borders)
 ├── EventCardGrid (Vertical scrollable container)
 │    └── EventCard (Media banner, card hover effects)
 │         ├── TagList (Small tags overlay)
 │         ├── EventDetails (Title, venue, date)
 │         └── RSVPButton (Interactive RSVP call to action)
 └── RSVPModal (Overlay slide-up panel)
      ├── DynamicDetails (Time, capacity, organization)
      └── QRCodeViewer (Secure QR generation widget with clean layout, dynamic refresh indicator)
```

### 4.2. Desktop Organizer Dashboard (Student Leaders)
A rich management grid to draft, run conflict checks, and scanner tools.

```
OrgDashboardLayout (Responsive desktop split layout)
 ├── OrgSidebar (Brand logo, navigation links: Dashboard, Proposal, Guest Scanner)
 ├── OrgMainContent (Grid system)
 │    ├── OverviewStats (Cards: RSVPs count, Pending, Approved with glassmorphism)
 │    ├── EventProposalForm (Submit form with real-time feedback)
 │    │    └── ConflictPredictor (Interactive sidebar that updates instantly)
 │    │         ├── HardConflictPanel (List of matching room booking overlaps)
 │    │         └── SoftConflictPanel (List of matching tag-based overlaps)
 │    └── ProposalStatusList (Visual queue of submitted proposals)
 │         └── ProposalRow (Status badges, event metadata, cancel actions)
 └── AttendanceScannerView (Full-viewport camera interface)
      └── HTML5QRScannerWrapper (Camera frame overlay, scan success animation)
```

### 4.3. High-Privilege Admin Dashboard (Faculty & Approvers)
A highly optimized verification tool focused on reviewing queues and visual auditing.

```
AdminDashboardLayout (Full-width grid)
 ├── AdminHeader (Aggregated statistics, pending alert indicators, logout)
 └── ProposalReviewQueue (Tab-separated table view: All, Flagged, Approved, Rejected)
      └── ProposalReviewCard (Expandable card representing a pending request)
           ├── EventMetadataSummary (Organization name, requested venue, times)
           ├── ConflictDetailsPanel (Appears if hard or soft conflicts exist)
           │    ├── HardConflictWarning (Details of overlapping physical bookings)
           │    └── SoftConflictWarning (Details of concurrent tag-based bookings)
           └── ReviewActionButtons
                ├── ApproveConfirmButton (Initiates secure approval)
                └── RejectReasonButton (Opens input dialog to provide feedback)
```
