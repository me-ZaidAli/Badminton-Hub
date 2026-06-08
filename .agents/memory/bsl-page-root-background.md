---
name: BSL page root background
description: Why every BSL page root needs an explicit dark background, not just the BSLBackground layer.
---

# BSL pages must paint their own dark background

Every BSL page root `<div>` must set an explicit dark background, e.g.
`<div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>`.

**Why:** `BSLBackground` is a `position: fixed; -z-10` dark layer. When the app's
global theme is a *light* theme, the white app root sits *above* that fixed layer
in the stacking context, so a transparent page root shows white with dark tiles
floating on it. Setting the dark bg directly on the page root fixes it.

**How to apply:** match the working pages (`Results.tsx`, `PlayerLeaderboard.tsx`,
`Prizes.tsx`). Never rely on `BSLBackground` alone for the page's base color.
