# Sentinel AI Frontend Structure

Last updated: Thursday, July 16, 2026

## Root

- `frontend/package.json`
  - Next.js 15, React 19, TailwindCSS, React Query, Axios, React Hook Form, Zod, Framer Motion, Leaflet, Recharts, next-themes, react-error-boundary.
- `frontend/next.config.ts`
  - Enables `typedRoutes` and pins `outputFileTracingRoot`.
- `frontend/components.json`
  - shadcn-style component registry metadata.
- `frontend/.npmrc`
  - Uses repo-local npm cache to stay development friendly on this machine.

## Application Layer

- `frontend/src/app/layout.tsx`
  - Root layout, Inter font, provider bootstrap.
- `frontend/src/app/page.tsx`
  - Redirects to `/dashboard`.
- `frontend/src/app/loading.tsx`
  - Global loading shell.
- `frontend/src/app/not-found.tsx`
  - Product-style not-found route.

## Route Groups

- `frontend/src/app/(auth)/`
  - `layout.tsx`: auth-shell split layout.
  - `login/page.tsx`: JWT login using existing backend auth API.
  - `forgot-password/page.tsx`: assisted reset flow aligned with the current backend surface.

- `frontend/src/app/(app)/`
  - `layout.tsx`: protected route shell.
  - `dashboard/page.tsx`
  - `plant-overview/page.tsx`
  - `plant-map/page.tsx`
  - `risk-center/page.tsx`
  - `incident-center/page.tsx`
  - `maintenance/page.tsx`
  - `equipment/page.tsx`
  - `workers/page.tsx`
  - `permits/page.tsx`
  - `analytics/page.tsx`
  - `compliance/page.tsx`
  - `ai-copilot/page.tsx`
  - `notifications/page.tsx`
  - `settings/page.tsx`

## Components

- `frontend/src/components/ui/`
  - Primitive UI building blocks: `button`, `input`, `textarea`, `select`, `checkbox`, `card`, `badge`, `skeleton`, `table`, `modal`, `drawer`.

- `frontend/src/components/common/`
  - Product-level shared blocks:
  - `activity-feed`
  - `command-palette`
  - `confirmation-dialog`
  - `empty-state`
  - `enterprise-card`
  - `error-state`
  - `filter-bar`
  - `loading-state`
  - `metric-card`
  - `notification-center`
  - `page-header`
  - `pagination`
  - `plant-map-view`
  - `plant-map-view-inner`
  - `risk-badge`
  - `search-bar`
  - `status-badge`
  - `success-banner`
  - `timeline`

- `frontend/src/components/layout/`
  - `app-shell`
  - `breadcrumbs`
  - `footer`
  - `mobile-navigation`
  - `sidebar`
  - `top-navigation`
  - `user-menu`

- `frontend/src/components/charts/`
  - `severity-bar-chart`
  - `status-donut-chart`

## Features

- `frontend/src/features/auth/`
  - `login-form`
  - `forgot-password-panel`

- `frontend/src/features/dashboard/`
  - `dashboard-overview`

- `frontend/src/features/copilot/`
  - `copilot-workbench`

## Providers

- `frontend/src/providers/app-providers.tsx`
- `frontend/src/providers/app-error-boundary.tsx`
- `frontend/src/providers/auth-provider.tsx`
- `frontend/src/providers/notification-provider.tsx`
- `frontend/src/providers/query-provider.tsx`
- `frontend/src/providers/theme-provider.tsx`

## Hooks

- `frontend/src/hooks/use-auth.ts`
- `frontend/src/hooks/use-debounced-value.ts`

## Services

- `frontend/src/services/api-client.ts`
  - Axios client, JWT injection, refresh-token flow, single retry for safe requests, global auth-expiry dispatch.
- `frontend/src/services/auth-service.ts`
- `frontend/src/services/health-service.ts`
- `frontend/src/services/dashboard-service.ts`
- `frontend/src/services/entities-service.ts`
- `frontend/src/services/risk-service.ts`
- `frontend/src/services/analytics-service.ts`
- `frontend/src/services/graph-service.ts`
- `frontend/src/services/copilot-service.ts`
- `frontend/src/services/compliance-service.ts`
- `frontend/src/services/notification-service.ts`
- `frontend/src/services/action-service.ts`
- `frontend/src/services/simulation-service.ts`

## Supporting Layers

- `frontend/src/store/auth-storage.ts`
  - Access and refresh token persistence.
- `frontend/src/lib/env.ts`
  - Frontend environment settings.
- `frontend/src/lib/navigation.tsx`
  - Sidebar and mobile nav registry with role-aware visibility.
- `frontend/src/lib/query-keys.ts`
  - Shared React Query keys.
- `frontend/src/styles/tokens.css`
  - Theme tokens.
- `frontend/src/app/globals.css`
  - Global visual system and utilities.
- `frontend/src/utils/cn.ts`
  - Tailwind class merging helper.
- `frontend/src/utils/format.ts`
  - Number, percent, date, and label formatting.

## Types

- `frontend/src/types/api.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/types/domain.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/types/analytics.ts`
- `frontend/src/types/risk.ts`
- `frontend/src/types/copilot.ts`
- `frontend/src/types/graph.ts`
- `frontend/src/types/simulation.ts`
- `frontend/src/types/navigation.ts`

## Backend APIs Used

- Auth: `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/me`
- Dashboard: `/api/v1/dashboard`
- Entities: plants, zones, equipment, workers, permits, maintenance, incidents
- Risk: `/api/v1/risk/analyze`, `/api/v1/risk/live`, `/api/v1/risk/history`
- Analytics: `/api/v1/analytics/overview`
- Compliance: `/api/v1/compliance`, `/api/v1/compliance/generate`
- Copilot: `/api/v1/copilot/chat`, `/api/v1/copilot/history`, `/api/v1/copilot/history` delete
- Notifications: `/api/v1/notifications`, `/api/v1/notifications/unread`, `/api/v1/notifications/{notification_id}`
- Health: `/api/v1/health`, `/api/v1/version`
- Simulation: `/api/v1/simulation/scenarios`

## Verification Snapshot

- `npm.cmd install`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: passed
- `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000`: started successfully and reported ready on `http://127.0.0.1:3000`
