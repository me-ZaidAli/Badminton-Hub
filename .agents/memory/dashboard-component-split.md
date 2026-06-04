---
name: Dashboard wrapper/content split
description: Dashboard.tsx has two separate top-level components — put hooks/state in the right one.
---

`client/src/pages/Dashboard.tsx` is split into TWO top-level components:
- `Dashboard()` — thin wrapper: reads user/sessions/clubs, gates access, then `return <DashboardContent .../>` passing props.
- `DashboardContent({...props})` — holds ALL the dashboard UI/JSX and most local UI state (selectedSession, kpiDetail, openSection, etc.).

**Rule:** any new `useState`/hook whose value is consumed by the dashboard JSX must live in `DashboardContent`, NOT in `Dashboard`. They are siblings, not nested, so state declared in `Dashboard` is out of scope in `DashboardContent`.

**Why:** Easy to add state to `Dashboard()` (top of file) and have it silently be the wrong component. (Type-checking can be slow/misleading via incremental cache — verify scope by reading where the JSX actually lives.)
