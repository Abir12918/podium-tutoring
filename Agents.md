# Podium Tutoring: AI Agent Blueprint & Interaction Protocol

This document serves as the master architectural blueprint and interaction protocol for all AI coding assistants working on the Podium Tutoring codebase. Strictly adhere to these rules to ensure data integrity, security, and UI/UX consistency.

---

## 1. Project Overview & Tech Stack

**Project Goal**: Internal management portal for Podium Tutoring, handling student registration, attendance tracking, and tuition management.

### Tech Stack (Source of Truth)
- **Frontend**: React 18.3.1 (Vite 5.4.10)
- **Routing**: React Router Dom 7.14.2
- **Backend/Auth**: Firebase 12.12.1 (Modular SDK v9+)
- **Styling**: Tailwind CSS 4.x (using custom brand colors: blue, yellow, cream, red, green)
- **Icons**: Lucide React
- **Runtime**: Node.js >= 18.0.0
- **Database**: Firebase Firestore (NoSQL structure)

---

## 2. Interaction Protocol ("Think Before You Code")

### Plan-First Requirement
Before writing any code, provide a brief bulleted plan of the changes you intend to make. **Wait for an "LGTM" (Looks Good To Me) from the user before proceeding.**

### Identify Debt
If a requested change contradicts the current architecture or introduces "spaghetti code," you MUST flag it immediately instead of executing it. Propose a cleaner alternative.

### Context Window Management
Prioritize reading files in relevant feature folders (e.g., `src/pages`, `src/services`) over global searches to maintain focus and efficiency. Before writing code, always read the existing component in the target directory to match the style.

---

## 3. Repository Map & Navigation

### Directory Structure
- `src/pages/`: Feature-specific pages (e.g., `StudentDetail.jsx`, `Attendance.jsx`).
- `src/components/`: Layout and shared UI components (e.g., `Sidebar.jsx`, `Layout.jsx`).
- `src/components/ui/`: (PLANNED) Standardized Radix/Shadcn components.
- `src/services/`: Data fetching and business logic (Firestore operations).
- `src/utils/`: Helper functions (e.g., `dateUtils.js`).
- `src/types/`: TypeScript definitions/interfaces (e.g., `database.d.ts`).
- `src/context/`: Global state providers (e.g., `AuthContext.jsx`).
- `src/firebase/`: Firebase initialization and configuration.

### Critical Entry Points
- `src/main.jsx`: Application entry.
- `src/App.jsx`: Root router and layout wrapper.
- `src/firebase/firebaseConfig.js`: Firebase initialization.

---

## 4. Constraints & "Do Not Touch" Zone

### Immutable Files
- `.env`: Never modify or hardcode values from this file.
- `firebase.json` & `.firebaserc`: Deployment and hosting configurations.
- `Makefile`: Project-level automation commands.

### Standard Patterns
- **Functional Components**: Always use Arrow functions and Hooks.
- **Styling**: Use Tailwind utility classes ONLY. Avoid inline styles or CSS modules.
- **Safety**: Never delete existing comments or console.log statements unless explicitly asked.

---

## 5. Data Integrity & Security

### Schema Enforcement
All Firestore writes must strictly adhere to the interfaces defined in `src/types/database.d.ts`. Do not introduce ad-hoc fields without updating the schema.

### No Sensitive Leaks
Never hardcode API keys, Firebase config secrets, or student PII. Use environment variables.

### Batch Operations
For attendance updates or tuition generation involving multiple students, always use Firestore Batched Writes or Transactions to ensure atomicity.

---

## 6. Feature Development Workflow

1.  **Schema Check**: Check `src/types/database.d.ts` for relevant interfaces.
2.  **Logic First**: Create or update service functions in `src/services/`.
3.  **UI Implementation**: Build the UI in `src/pages/` or `src/components/`, consuming services via hooks.
4.  **State Management**: Keep state as local as possible. Use `AuthContext` only for global authentication data.
5.  **Refinement**: Apply Framer Motion animations for premium polish.

---

## 7. Coding Style & Best Practices

### Naming Conventions
- **Components**: `PascalCase` (e.g., `StudentCard.jsx`)
- **Functions/Variables**: `camelCase` (e.g., `handleUpdateAttendance`)
- **Folders**: `kebab-case` or `camelCase` (consistency is key)

### Error Handling
- Always wrap Firebase calls in `try/catch` blocks with descriptive error logs.
- Provide explicit loading and error states in UI components: `const { data, loading, error } = ...`

### Documentation
- Prioritize clear variable names over heavy commenting.
- Use **JSDoc blocks** for complex logic explaining the *Why*, not the *What*.

---

## 8. Project Management

### Current Project Status
- [x] Firebase Initialization
- [x] Student Registration Module
- [x] Attendance Tracking (Core functional, Refactoring for Batch Writes)
- [x] Financial Reporting (Tuition logic exists, UI/UX polish planned)
- [ ] UI/UX Design System (Radix/Shadcn integration PLANNED)
