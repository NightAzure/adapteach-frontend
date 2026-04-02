# AdapTeach Frontend

Next.js frontend for the AdapTeach adaptive tutor. Covers both the student learning flow and the admin dashboard.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- React Query (`@tanstack/react-query`)
- Radix UI primitives
- DnD Kit — Parsons problem drag-and-drop
- Monaco Editor — tracing and mutation exercises
- Recharts — analytics views
- Axios with a `mock`/`live` adapter switch

## Getting Started

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_MODE=live` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api` in `.env.local` to connect to the backend. The default is `mock`, which runs entirely off static fixtures — useful when the backend isn't running.

Adapter selection lives in `src/lib/api/client.ts`.

## Routes

**Public**
- `/` — landing / redirect
- `/login`
- `/onboarding` — invite-based account activation

**Student**
- `/student/dashboard`
- `/student/session` — current learning session
- `/student/artifact/[artifactId]` — individual exercise
- `/student/pretest` / `/student/posttest`
- `/student/survey`
- `/student/history`
- `/student/profile`

**Admin**
- `/admin` — overview
- `/admin/experiments` — pipeline config management
- `/admin/students` — cohort view + protocol controls
- `/admin/content` / `/admin/content/artifacts/[id]`
- `/admin/analytics`
- `/admin/runs` — pipeline run logs
- `/admin/logs` — telemetry
- `/admin/settings`

## Codebase Layout

| Path | What's there |
|---|---|
| `src/types/models.ts` | Shared domain types |
| `src/lib/api/` | API client, contracts, mock/live adapters |
| `src/lib/mocks/` | Static mock data |
| `src/lib/hooks/queries.ts` | React Query hooks |
| `src/lib/telemetry/useTelemetry.ts` | Attempt timing + hint tracking |
| `src/components/layout/` | Student and admin shell layouts |
| `src/components/artifacts/` | Exercise renderers (Parsons, tracing, etc.) |

## Research Notes

The UI supports five artifact types (Parsons, code tracing, mutation, slicing, quiz) and instruments each for attempt count, hint usage, time-on-task, and step-level progression. The adaptive group gets artifacts selected by BKT mastery estimates; the control group follows a fixed linear sequence. Both flows share the same components — the difference is only in which artifact gets assigned.
