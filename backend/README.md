Backend service alias

- Actual code: `artifacts/api-server`
- Local alias: `backend/server` (symlink)
- Log file: `backend/server.log`

Run manually:

```bash
PORT=5000 DATABASE_URL=postgresql://sharad@127.0.0.1:5433/crmbs JWT_SECRET=crmbs-local-dev npx pnpm --filter @workspace/api-server run dev
```
