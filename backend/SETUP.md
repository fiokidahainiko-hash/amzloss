# Backlink Directory — Form Backend Setup

The directory form at `directory.html` posts submissions to a Google Apps Script
web app, which logs them to a Google Sheet you own and emails you when a site
verifies. Fully free, unlimited, and the data belongs to you.

## One-time setup (about 5 minutes)

### 1. Create the Google Sheet
1. Go to https://sheets.google.com and create a new blank spreadsheet.
2. Copy its **Sheet ID** from the URL — the part between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

### 2. Create the Apps Script
1. Go to https://script.google.com and click **New project**.
2. Delete the placeholder `function myFunction() {}`.
3. Open `backend/directory-form.gs` in this repo and paste the **entire file**
   into the editor.
4. At the top of the file, set:
   - `SHEET_ID` = the Sheet ID you copied
   - `OWNER_EMAIL` = `admin@amzloss.com` (or wherever you want notifications)

### 3. Authorize and initialize
1. In the editor, select `setup_` from the function dropdown and click **Run**.
2. Approve the permissions (Google will warn it's an unverified app — that's
   normal for personal scripts; click **Advanced → Go to project**).
3. This creates the `Submissions` and `Verified` tabs in your sheet.

### 4. Deploy as a web app
1. Click **Deploy → New deployment**.
2. Type: **Web app**
3. **Execute as:** *Me*
4. **Who has access:** *Anyone* (this is required for the public form)
5. Click **Deploy**, then **Allow** the permissions again if prompted.
6. Copy the **Web app URL** — it ends in `/exec`.

### 5. Point the site at it
Open `js/directory.js` and set:

```js
window.AMZLOSS_FORM_ENDPOINT = "https://script.google.com/macros/s/YOUR_SCRIPT_WEB_APP_ID/exec";
```

Replace `YOUR_SCRIPT_WEB_APP_ID` with the ID from your `/exec` URL, then commit
and push.

## How it works
- **Submit** → row added to the `Submissions` tab.
- **Verify** → row added to the `Verified` tab **and** you get an email with the
  site's details + verification token.

## Troubleshooting
- **No rows in the sheet:** make sure deployment is set to *Anyone* and the
  URL in `js/directory.js` is correct.
- **Email not arriving:** the `MailApp` notification only fires on `verified`
  submissions; check the `Verified` tab first. Gmail free accounts may place
  script mail in the same inbox — search for the subject line.
- **Public form CORS:** the frontend posts with `mode: 'no-cors'`, so the
  response is opaque — that's fine. If submissions stop, open the `/exec` URL
  in a browser once (it returns `{"ok":true,...}`) to confirm it's live.