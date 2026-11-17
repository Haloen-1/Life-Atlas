Life Atlas Windows journal reminders

1. In Workspace > Permissions, choose your journal reminder time and recurrence.
2. Select Export Windows schedule. This exports only the schedule and app address.
3. Extract this setup ZIP. Run Install Life Atlas Reminders.cmd and choose the exported JSON.
4. After changing the schedule in Life Atlas, export it again and rerun setup.

The installer adds one per-user Windows scheduled task, a Life Atlas Reminders
Start Menu shortcut, and a journal-opening protocol. It stores only its schedule
and helper files under LocalAppData\Life Atlas Reminders. It does not read your
journal entries or change your browser storage. No administrator account is needed.

The task runs at the chosen time and checks your recurrence. It can catch up when
you sign in or the task resumes later that day. You must be signed into Windows;
it cannot display a banner while the computer is shut down.

Windows controls banner appearance, duration, sounds, and Do not disturb.
Allow Life Atlas notifications in Windows Settings > System > Notifications.

To test, run in PowerShell:
& "$env:LOCALAPPDATA\Life Atlas Reminders\windows-reminders.ps1" -Test

To uninstall:
& "$env:LOCALAPPDATA\Life Atlas Reminders\windows-reminders.ps1" -Remove

Uninstall removes the task, protocol, and shortcut. The tiny schedule and helper
files remain in LocalAppData for optional reuse. Your Life Atlas data is untouched.
