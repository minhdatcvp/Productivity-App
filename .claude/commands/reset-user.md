Reset all data (goals, tasks, streaks) for a specific user by email. Keeps the account intact.

The user will provide an email address as the argument: $ARGUMENTS

Run the following command using PowerShell from the `api` directory:

```powershell
cd "c:\Users\Crossian LLC\Desktop\dat\News\api"
.\venv\Scripts\python reset_user.py $ARGUMENTS
```

Report the result. If no email was provided in $ARGUMENTS, ask the user for it before running.
