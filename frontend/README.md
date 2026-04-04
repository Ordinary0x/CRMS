Frontend service alias

- Actual code: `artifacts/crmbs`
- Local alias: `frontend/client` (symlink)
- Log file: `frontend/client.log`

Run manually:

```bash
PORT=5173 BASE_PATH=/ VITE_API_PROXY_TARGET=http://127.0.0.1:5000 npx pnpm --filter @workspace/crmbs run dev
```
