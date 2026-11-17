# tests/

Marketplace logic for the Next.js app is tested inside `web/` (DEC-002). Run the suite
from the repository root:

```bash
npm test --prefix web
```

That command runs Vitest over `web/lib/**/*.test.ts`. Lint and production build:

```bash
npm run lint --prefix web
npm run build --prefix web
```
