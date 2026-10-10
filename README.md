# CampusCare AI — fixed PostgreSQL-connected project

This version connects the existing CampusCare interface to the Express/PostgreSQL API. Demo/sample complaints are no longer shown as real records. Student registration/login, complaint submission, student complaint listing, and management status updates use the API.

## Quick setup (Windows)

1. Open this folder in VS Code.
2. In pgAdmin, select the `campuscare` database, open Query Tool, and run `backend/schema.sql`. The script creates the expected tables and adds missing columns to the earlier `user_id` / `complaint_id` version. It does not drop tables.
3. Open `backend/.env.example`, copy it as `backend/.env`, and set your actual PostgreSQL password in `DATABASE_URL`. Set `JWT_SECRET` to a private random string of at least 32 characters. Never share `.env`.
4. Open a terminal in VS Code and run:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

5. Visit `http://localhost:3000/api/health`. It should return `{"ok":true,"database":"connected"}`.
6. Open `frontend/index.html` with VS Code Live Server. The expected origin is `http://127.0.0.1:5500`; if Live Server uses another port/origin, update `FRONTEND_ORIGIN` in `.env` and restart the backend.
7. Choose Student Login, enter an email and password, and click **Create student account** to register. Then log in with the same credentials.

## Management account

New accounts are students by default. To promote an account to management, run this in pgAdmin after registering that account (replace the email):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-management-email@college.edu';
```

Log out and log in again using the Management Login tab so the new role is included in the token.

## Notes

- The API listens on port 3000.
- Frontend API URL is set near the top of `frontend/script.js` as `http://localhost:3000/api`.
- The optional photo input currently only validates/displays the filename; image uploads are not sent to the server.
- This is a local development project. Before deployment, add production hosting, HTTPS, backups, and review the privacy/security settings.
- If PostgreSQL reports that a column already exists, that is okay for the `ADD COLUMN IF NOT EXISTS` statements. If it reports a type conflict, stop and share the exact error rather than dropping tables.
