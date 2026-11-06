# Khmer Q&A Correction System

A teacher-focused application for importing Khmer question-and-answer datasets,
reviewing one item at a time, correcting content, and exporting the verified
JSON. Corrections are made by teachers; the system will not generate answers.

## Phase 1: Project foundation

This phase establishes the Next.js App Router, TypeScript, linting, project
identity, and the planned application boundaries. No database, authentication,
or review workflow is implemented in this phase.

## Architecture

- **Web application:** Next.js App Router with TypeScript. Pages and reusable
  UI live under `src/app` and `src/components`.
- **Server-side application logic:** Next.js Route Handlers under
  `src/app/api`. Database access and domain rules will remain server-side.
- **Database:** PostgreSQL managed with Prisma. The schema and migrations will
  be introduced in Phase 2.
- **Authentication and authorization:** Auth.js with hashed passwords and
  Admin/Teacher roles. Protected server operations will verify the current
  user's role.
- **Data boundaries:** JSON imports will be validated before persistence.
  Exports will contain only `question` and `answer` properties, preserving
  Khmer Unicode.
- **Deployment:** Docker Compose will run the app, PostgreSQL, and Nginx behind
  an internal network. Secrets will be supplied through server environment
  variables.

### Planned source layout

```text
src/
  app/
    (auth)/                 # Sign-in pages
    (teacher)/              # Teacher and admin workspace
    api/                    # Server-side Route Handlers
    layout.tsx              # Root document, Khmer locale, global styles
  components/               # Reusable interface components
  lib/                      # Authentication, database, validation, services
  types/                    # Shared TypeScript types
prisma/                     # Schema and database migrations (Phase 2)
deploy/nginx/               # Reverse-proxy configuration (Phase 8)
```

Routes and modules will be added in the phase where their behavior is
implemented, rather than creating nonfunctional placeholders.

## Requirements

- Node.js 22.13 or newer (`.nvmrc` targets Node 22)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify the foundation

```bash
npm run lint
npm run build
```

## Project phases

1. **Foundation and architecture** — Next.js App Router and TypeScript setup.
2. **PostgreSQL and Prisma** — data models, migrations, and database access.
3. **Authentication and roles** — teacher/admin sign-in and authorization.
4. **JSON import** — validation, dataset creation, and duplicate protection.
5. **Teacher dashboard** — dataset and step-by-step review interface.
6. **Corrections** — edit, save, cancel, and review-state updates.
7. **History and export** — audit history and clean UTF-8 JSON downloads.
8. **Docker and Nginx** — production containers and reverse proxy.
9. **Ubuntu deployment** — server setup, HTTPS, backups, and updates.

Each phase will be implemented and verified separately before moving to the
next.
