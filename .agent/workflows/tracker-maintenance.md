---
description: how to update and maintain the Instagram Tracker
---

Follow these steps to update the tracker logic or UI:

1. **Local Development**:
   - Start the backend: `cd api && node index.mjs`
   - Start the frontend: `cd frontend && npm run dev`

2. **Making Changes**:
   - Edit the UI in `frontend/src/App.jsx`.
   - Edit tracking logic in `api/index.mjs`.

3. **Deploying Updates**:
// turbo-all
   - Push to GitHub:
     ```powershell
     git add .
     git commit -m "Your update description"
     git push origin main
     ```
   - Vercel will automatically detect the push and redeploy the site.

4. **Monitoring Database**:
   - View live raw data in your **Supabase Dashboard** under the `history` and `events` tables.

5. **Troubleshooting**:
   - If stats aren't updating, check **Cron-job.org** to see if the pings are failing (status 200 is good).
   - Check **Vercel Logs** for any backend errors.
