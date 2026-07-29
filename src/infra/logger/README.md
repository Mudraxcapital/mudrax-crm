# infra/logger

Structured JSON logging (`INFO` / `WARN` / `ERROR` / `AUDIT` / `SECURITY`).

```ts
import { logger } from "@/infra/logger";

logger.info("campaign.created", { requestId, userId, organizationId });
logger.security("login.rate_limited", { userId: null, emailDomain: "…" });
```

Secret-shaped keys (`password`, `token`, `authorization`, …) are redacted.
