# Frontend Runtime Report

Generated on: Thursday, July 16, 2026

## Summary

- Sentinel AI frontend runtime was verified successfully.
- Verified runtime URL: `http://127.0.0.1:3001/`
- Verified homepage title: `Sentinel AI`
- Verified homepage content markers:
  - `Sentinel AI`
  - `Industrial AI operations platform`
- Root homepage response returned HTTP `200` and served the Sentinel AI application, not another app.

## Port Audit Before Cleanup

Observed before stopping unrelated processes:

- Port `3000`
  - PID: `27072`
  - Process: `node.exe`
  - Result: unrelated application
  - Verification: `http://[::1]:3000/` returned a different app titled `SevakAI — Smart Volunteer Deployment for Mahakumbh 2028`

- Port `3001`
  - PID: `5832`
  - Process: `node.exe`
  - Result: stale unrelated Node runtime

Additional unrelated Node PIDs present before cleanup:

- `19072`
- `19768`

Exact command-line inspection for those stale Node processes was blocked by Windows process-access restrictions in this managed environment, but port ownership and executable identity were confirmed as `node.exe`.

## Process Cleanup

Stopped unrelated Node runtimes:

- `5832`
- `19072`
- `19768`
- `27072`

Cleanup command result:

```text
STOPPED_PIDS=5832,19072,19768,27072
```

## Launch Command Used

The frontend `dev` script was normalized to avoid the unrelated `3000` conflict:

```json
"dev": "next dev --hostname 127.0.0.1 --port 3001"
```

Verified launch command:

```text
npm run dev
```

## Exact Terminal Output From `npm run dev`

```text
> sentinel-ai-frontend@0.1.0 dev
> next dev --hostname 127.0.0.1 --port 3001

   ▲ Next.js 15.5.20
   - Local:        http://127.0.0.1:3001
   - Network:      http://127.0.0.1:3001

 ✓ Starting...
 ✓ Ready in 3.1s
 ○ Compiling / ...
 ✓ Compiled / in 11.9s (1791 modules)
 GET / 200 in 13152ms
 GET / 200 in 13184ms
 ✓ Compiled in 1547ms (779 modules)
 ✓ Compiled in 126ms (759 modules)
```

## Running Port And Process ID

During the verified live Sentinel runtime:

- Port: `3001`
- PID: `3636`
- Listener observed as:

```text
TCP    127.0.0.1:3001         0.0.0.0:0              LISTENING       3636
```

## Homepage Verification

HTTP verification during the active Sentinel runtime:

```text
STATUS=200
URL=http://127.0.0.1:3001/
TITLE=Sentinel AI
HAS_SENTINEL=True
```

Content markers detected in the homepage response:

```text
FOUND=Sentinel AI
FOUND=Industrial AI operations platform
```

Homepage response excerpt:

```html
<title>Sentinel AI</title>
<meta name="description" content="Industrial AI operations platform for risk, compliance, and operational resilience."/>
<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/dashboard"/>
```

This confirms the homepage returned the Sentinel AI application, not the unrelated SevakAI runtime that had been occupying port `3000`.

## Build Status

Build verification passed on Thursday, July 16, 2026:

```text
> sentinel-ai-frontend@0.1.0 build
> next build

▲ Next.js 15.5.20
✓ Compiled successfully
✓ Generating static pages (20/20)
```

## Errors Encountered

1. `ERR_CONNECTION_REFUSED` on preview
   - Cause: Sentinel AI was not the app bound to the expected preview target.

2. Port `3000` was occupied by another application
   - Confirmed unrelated homepage title:
     - `SevakAI — Smart Volunteer Deployment for Mahakumbh 2028`

3. Port `3001` had a stale unrelated `node.exe` listener before cleanup
   - Caused ambiguous runtime verification until the stale Node processes were stopped.

4. Detached background launch attempts were unreliable in this managed shell
   - Hidden/detached wrappers did not persist consistently after command completion.
   - This affected long-lived background process retention, not the Next.js app itself.

## Fixes Applied

1. Stopped unrelated Node.js processes occupying the development ports.
2. Updated the Sentinel frontend `dev` script to bind explicitly to:
   - host: `127.0.0.1`
   - port: `3001`
3. Added `frontend/run-dev.cmd` as a local launcher helper for runtime logging.
4. Re-ran the frontend in a clean foreground session and verified the live HTTP response.

## Final Verification

- Sentinel AI frontend starts successfully with `npm run dev`.
- Sentinel AI serves successfully at `http://127.0.0.1:3001/`.
- Homepage returns HTTP `200`.
- Homepage title is `Sentinel AI`.
- Homepage content matches the Sentinel AI application.
- Frontend build status is passing.

Note:

- In this managed shell, detached background processes do not remain stable after command completion.
- The runtime itself was verified successfully during the active live `npm run dev` session.
