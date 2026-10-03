# LOS Studio authentication and sync review

Reviewed 3 October 2026 against main commit 944f2a4e74a25182ce8914fecad972a6c9fb8cdc.

## Architecture

GitHub Pages extracts `LOS_Studio_V75_icon_fixed.zip`, applies the Orders bridge repair and injects `.github/scripts/auth-sync.js` inside the original cloud-sync IIFE. Android loads that hosted page in a WebView and forwards Supabase HTTPS requests through `AndroidSupabase`. No separate Android authentication service exists.

The original HTML creates a Supabase client with `persistSession`, `autoRefreshToken`, and `detectSessionInUrl` enabled. Email/password sign-in uses `signInWithPassword`; account creation uses `signUp`; recovery uses `resetPasswordForEmail` and `updateUser`. The project publishable key is public frontend configuration, not an administrator credential. The SDK stores access/refresh tokens locally. Authentication storage is excluded from snapshots.

Cloud reads call `auth.getUser()` and select `los_studio_sync` by `user_id`; writes upsert by its primary key. The account owns one JSON snapshot. Files in IndexedDB are separate from that snapshot.

## Database checks

- Both public tables (`los_studio_sync`, `app_sync`) have RLS enabled, with SELECT/INSERT/UPDATE/DELETE ownership policies.
- UPDATE includes both USING and WITH CHECK ownership predicates.
- An anonymous SELECT was denied at the table privilege boundary.
- A transaction with an unrelated authenticated identity returned zero sync rows. No user rows were altered by these checks.
- Initial advisor output contained function warnings; subsequent direct privilege checks and a fresh advisor run showed those had already been resolved. This review did not change database schema or records.
- The remaining advisor notice is disabled leaked-password protection. Configure through Supabase Auth settings if supported by the current plan; the connected tools do not expose that setting.

## Repairs in this change

- Cloud snapshot application refreshes views without restarting the login gate.
- SIGNED_OUT restores the gate and disables writes; passwords are cleared from the inputs after successful authentication.
- The interface starts hidden, before application scripts run, and is revealed only after account data hydration.
- Local account ownership metadata prevents another account inheriting a previous account's local order workspace.
- Pending local changes are detected before initial cloud hydration, with an explicit choice between downloading cloud data and uploading this device.
- The existing Orders bridge repair is executed by deployment, preserving full legacy orders and order history rather than summaries alone.
- Auth/config metadata and the redundant large blueprint are excluded from the localStorage component of cloud snapshots. The business logo stays in the structured state.
- The service worker caches only same-origin successful GET responses, excluding Supabase and CDN responses.
- Early branding calls tolerate the logo helper loading in a later script, avoiding the confirmed startup ReferenceError.

## Module review

All 17 sidebar modules passed DOM navigation/render smoke checks: Welcome, Planner, Media, Info, Inventory, Patterns, Orders, StudioHub, Projects, Packaging, Machines, Stock, Accounts, HMRC, History, Prints and CloudSync. This checks startup and module opening, not every form, financial calculation, print layout, or the Android native bridge.

## Remaining work

1. Uploaded files do not yet sync across devices. Inventory photos, project files, packaging PDFs, machine documents, business documents, pattern files, media uploads and printable uploads use IndexedDB. Full backup export includes them, while cloud sync currently includes their metadata only. A private per-account attachment storage design and migration is required; do not describe current cloud sync as a full backup.
2. Whole-snapshot writes are not transactional conflict resolution. Simultaneous edits on two devices can still replace one another; client-side timestamps also depend on device clocks.
3. Supabase SDK is loaded from a floating `@2` CDN URL. Pin and vendor it when implementing offline authentication reliability.
4. Real-device Android transport, attachment upload/download, print layouts and every business workflow still need end-to-end testing.

## Validation

Run `npm ci && npm test` with Node 20.19+ and Python 3. The tests reconstruct the exact deployment patches from the V75 ZIP and run the app with jsdom, fake IndexedDB and a mocked Supabase client. They cover the mandatory gate, all sidebar modules, cloud pull without reload, logout locking, blocked post-logout uploads, account switching and token exclusion. A separate service-worker test verifies cross-origin requests bypass caching.

A real Chromium install was attempted but its download failed in the execution environment. These checks are DOM simulations, not visual browser or real Supabase login tests.

References:
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
