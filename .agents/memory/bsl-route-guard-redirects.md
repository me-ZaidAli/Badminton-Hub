---
name: Route guards must redirect with <Redirect>, not setLocation-in-render
description: Why client/src/App.tsx route guards use wouter <Redirect> instead of calling setLocation during render
---

Route guard components in `client/src/App.tsx` (PrivateRoute, AdminRoute, PremiumRoute, OwnerRoute, etc.) must perform redirects by returning `<Redirect to="..." />` from wouter, NOT by calling `setLocation("...")` in the render body followed by `return null`.

**Why:** Calling `setLocation(...)` during render triggers React's "Cannot update a component while rendering a different component" warning, and when the redirect target is a lazy() route the synchronous navigation makes the lazy child suspend, producing the dev overlay "A component suspended while responding to synchronous input." This overlay covers the whole preview and is easily mistaken for a real crash — it most visibly appears when the preview session is logged out (401), so `/bsl` and other guarded routes bounce to the lazy `/login` page. `<Redirect>` navigates inside an effect, so it is render-safe.

**How to apply:** Any new route guard or redirect-on-condition in App.tsx should `return <Redirect to={...} />`. The only legitimate `setLocation` call left is inside an event handler (e.g. an onClick "View Upgrade Options" button), which is fine.
