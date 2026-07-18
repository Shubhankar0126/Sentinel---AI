# Notifications Fix Report

Generated on: Friday, July 17, 2026

## Issue

The Notifications page was requesting:

- `GET /api/v1/notifications?skip=0&limit=200`

The backend validation only accepts:

- `limit <= 100`

This caused the Notifications page request to fail validation.

## Notifications API Requests Found

1. Main Notifications page
   - File: `frontend/src/app/(app)/notifications/page.tsx`
   - Before: `notificationService.list({ skip: 0, limit: 200 })`
   - After: `notificationService.list({ skip: 0, limit: NOTIFICATIONS_FETCH_LIMIT })`
   - Shared page fetch cap: `NOTIFICATIONS_FETCH_LIMIT = 100`

2. Notification drawer
   - File: `frontend/src/components/common/notification-center.tsx`
   - Request: `notificationService.list({ skip: 0, limit: 10 })`
   - Status: unchanged, already valid

3. Notification service
   - File: `frontend/src/services/notification-service.ts`
   - Role: shared service wrapper for `/notifications`
   - Status: unchanged, request parameters are passed through correctly

## Fix Applied

Updated the Notifications page request to use a compliant shared fetch cap:

- Added `NOTIFICATIONS_FETCH_LIMIT = 100`
- Replaced `limit: 200` with `limit: NOTIFICATIONS_FETCH_LIMIT`

No backend validation rules were modified.

## Verification

### Backend API Validation

Verified using the existing admin account:

- `POST /api/v1/auth/login` -> HTTP `200`
- `GET /api/v1/notifications?skip=0&limit=100` -> HTTP `200`

This confirms the fixed frontend request shape now satisfies backend validation.

### Frontend Runtime

Started a temporary Next.js dev process on:

- `http://127.0.0.1:3002`

Verified:

- `GET /notifications` -> HTTP `200`
- Page title: `Sentinel AI`

Next.js runtime output confirmed the route compiled successfully:

- `Compiled /notifications`
- `GET /login 200`

### Frontend Validation Commands

Verified successfully:

- `npm.cmd run build`
- `npm.cmd run typecheck`

Note:

- `npm.cmd run typecheck` depends on Next-generated `.next/types` in this repo.
- The reliable validation order is:
  1. `npm.cmd run build`
  2. `npm.cmd run typecheck`

## Files Changed

- `frontend/src/app/(app)/notifications/page.tsx`

## Result

The invalid Notifications page request was fixed without changing backend rules.

The Notifications page request now uses:

- `skip=0`
- `limit=100`

The page route loads successfully, the backend notifications endpoint accepts the request, and the frontend build and typecheck both pass.
