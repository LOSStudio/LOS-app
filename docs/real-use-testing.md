# LOS Studio: real-use testing

Close and reopen the app online to load the current web update. No new APK is needed for these changes.

## Before your first real order

The optional guide on Welcome links to business details, inventory, Orders and backup. Hide it when finished; show it again from Account & Sync.

The status button at the bottom of every page opens Account & Sync. It distinguishes saved changes, saving, offline and sync failures. Wait for All changes saved before closing or switching accounts.

## Backup and restore

Account & Sync → Download full backup prepares one JSON file containing records, stored photo/PDF bytes and other attached library files. Finish saving it in the device save dialog and keep it privately. Backups are unencrypted and contain business/customer information, but no login tokens or passwords. Maximum bundle size is 45 MB for compatibility with the Android saver. Missing attachments stop the backup instead of producing an incomplete copy.

Choose backup to restore validates its checksum, record collections, attachments and immutable account ID, then shows the date and record/file counts. Cancel changes nothing. Restore replaces saved information and keeps a complete pre-restore copy on the device, available through Download copy from before last restore. A backup stays valid for that same account after its email changes. It cannot be imported into another account or a newly recreated account after deletion. Old unscoped backup formats are not accepted by this new restore flow.

If cloud syncing fails after restore, the restored data remains local and retries; keep the app open until All changes saved. Pre-restore recovery copies on this device are removed when the account is deleted.

## Deletion protection

Existing confirmations, double-tap deletion and undo controls remain. Destructive controls without protection now show Cancel/Delete. Confirmations opened under another signed-in account cannot be used after an account switch. Account deletion still requires its existing confirmation and password.

## Suggested real test

1. Add business contact details and a small inventory entry.
2. Create and save an order; confirm it appears on the other device.
3. Attach a photo and PDF, download a full backup, and verify the file exists in Files/Drive.
4. Change a test record, then restore the backup and check its records, photo and PDF on both devices.
5. Open a delete confirmation and cancel; verify the record remains.
6. Turn off internet, save a test change, reconnect and wait for saved status. Check the other device.
7. Test printing and delivery-image downloads on the phone and Chromebook.

Automated checks cover these code paths, but real device testing is still needed before a public launch.
