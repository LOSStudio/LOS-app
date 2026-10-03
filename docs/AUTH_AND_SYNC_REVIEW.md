# LOS Studio automatic account sync

Implemented 3 October 2026, extending the V75 app without replacing its modules.

## User behaviour

Sign into the same account on any device. Account records and uploaded files load automatically. Saved changes queue after about 1.2 seconds; open devices check for updates every five seconds and on focus/reconnect. A visible account status reports when all changes are saved or when local changes are waiting to retry. Incoming updates wait while an editor field has focus, to avoid replacing unsaved typing.

The app still requires internet access to sign in. While already signed in, connection failures keep edits locally and retry. Wait for **All changes saved** before closing the app or switching devices. No manual project-key setup, upload or pull is required.

## Components and request flow

1. GitHub Pages extracts `LOS_Studio_V75_icon_fixed.zip`, repairs the full Orders/history bridge and injects the account-sync code inside the original cloud closure.
2. A pinned Supabase SDK (2.117.2, installed through the committed npm lockfile) is copied into the deployment as `supabase.js` and cached with the app shell.
3. The email/password gate authenticates through Supabase Auth. It reveals the workspace after loading account records and files. Password inputs are cleared. Signing out restores the gate and stops sync writes.
4. The browser calls Supabase over HTTPS. Android loads the same hosted app and its `AndroidSupabase` bridge forwards request headers and text bodies. File JSON envelopes keep this transport compatible without changing the installed APK.
5. Client snapshots exclude auth/config storage and the redundant local blueprint. Tokens stay with the Supabase SDK; no service-role key is present in the client.

## Record synchronization

`los_studio_sync` remains one snapshot per account. Existing ownership RLS policies are preserved. The new `revision` counter and server-side update timestamps replace device-clock ordering. `los_studio_commit` is SECURITY INVOKER and locks the user's row; it accepts only the expected revision. Stale requests return the current row so the client can merge and retry.

The client keeps its last accepted base snapshot in IndexedDB. Three-way merges preserve changes to different fields and different records, including a deletion on one device and an unrelated addition on another. Serialized legacy localStorage record arrays are parsed and merged as records, then kept consistent with the structured Orders bridge.

If both devices change the **same field**, the later committing change wins. This is automatic synchronization, not collaborative text editing. Avoid editing the same field simultaneously when both versions are needed.

## Uploaded files

`los-studio-private-files` is a private bucket. SELECT, INSERT, UPDATE and DELETE require an authenticated user whose id matches the first path segment. No public download URL is used.

The file manifest references SHA-256 content-addressed JSON envelopes. These include the original photo data or Base64 PDF/blob bytes and metadata. The app uploads each file separately before saving its manifest, checks downloaded content hashes, and restores files into the module's normal local store.

Covered local stores:

| Module/files | IndexedDB store |
|---|---|
| Inventory photos | `LOSStudioInventoryFilesDB / inventoryPhotos` |
| Project photos | `LOSStudioProjectFilesDB / projectPhotos` |
| Project PDFs/images | `LOSStudioProjectAssetDB / assets` |
| Packaging PDFs | `LOSStudioFilesDB / packagingPdfs` |
| Machine/business documents, patterns, media, printables | `LOS_Machine_Files / files` |

Local file databases are scoped by account id. Existing unscoped files are copied to the first/current owning account once; the original cache is retained. A pre-upgrade record snapshot is retained locally before the first authoritative cloud load, and per-account local checkpoints preserve queued data across account switching. The app never uploads a different account's local file cache.

Uploaded objects are immutable versions. Files removed from the current workspace drop out of its manifest; old storage objects are retained. Storage cleanup/retention is a future maintenance task. Normal module uploads remain limited to 15 MB; the private JSON-envelope bucket allows 25 MB to cover Base64 overhead. Account storage quotas still apply and failures show as pending sync.

## Database verification

- Existing snapshot RLS policies restrict all operations to the owning account; UPDATE checks both existing and new ownership.
- Anonymous users cannot execute the commit RPC.
- A live transactional test accepted the correct revision and rejected a stale revision. The transaction was rolled back, retaining the original records.
- The private bucket and its four ownership policies were inspected after setup.
- Security advisors reported no new database/storage warnings. The existing disabled leaked-password-protection warning remains; enable through Supabase Auth settings if supported by the plan.

## Automated validation

Run `npm ci && npm test` with Node 24 and Python 3. Tests reconstruct the exact deployment source patches and simulate two independent browser databases with a shared Supabase server.

Coverage includes login hydration; all 17 sidebar modules; different-field and record merging; save-race retries; deletion plus addition; timer-driven automatic propagation; round-trip transfers across all five file stores; offline retry; logout; account-isolated files; and private storage paths. Separate tests cover the merge algorithm, cross-origin service-worker cache exclusion, and the actual pinned SDK's login, JSON file upload/download, RPC and JWT-header transport.

Browser Chromium download was unavailable in the execution environment. These are DOM/integration simulations and real database checks, not a physical Samsung test. Phone login, printing layouts and long-file transfers need real-device confirmation after publication.

References:
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
