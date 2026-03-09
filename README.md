# AdapTeach Frontend (Next.js)

Production-oriented mockup with API-ready integration for student and admin workflows.

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- React Query (`@tanstack/react-query`)
- Radix UI primitives
- DnD Kit (Parsons)
- Monaco Editor (tracing/mutation)
- Recharts (analytics)
- Axios (`mock`/`live` adapter switch)

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## API Modes

- `NEXT_PUBLIC_API_MODE=mock` (default)
- `NEXT_PUBLIC_API_MODE=live`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api`

Adapter selection is in `src/lib/api/client.ts`.

## Key Routes

### Public
- `/`
- `/login`
- `/onboarding`

### Student
- `/student/dashboard`
- `/student/session`
- `/student/artifact/[artifactId]`
- `/student/pretest`
- `/student/posttest`
- `/student/survey`
- `/student/history`
- `/student/profile`

### Admin
- `/admin`
- `/admin/experiments`
- `/admin/students`
- `/admin/content`
- `/admin/content/artifacts/[id]`
- `/admin/analytics`
- `/admin/runs`
- `/admin/logs`
- `/admin/settings`

## Architecture Notes

- Domain models: `src/types/models.ts`
- API contracts/adapters: `src/lib/api/*`
- Mock data: `src/lib/mocks/*`
- Query hooks: `src/lib/hooks/queries.ts`
- Telemetry hook: `src/lib/telemetry/useTelemetry.ts`
- Student/admin shells: `src/components/layout/*`
- Artifact components: `src/components/artifacts/*`

## Research Alignment

This UI is structured around:
- adaptive vs static-linear parity,
- artifact-driven intervention (Parsons, tracing, mutation, slicing, quiz),
- instrumentation-ready flows for attempts, hints, duration, and progression.
