# deploy/nginx

Nginx reverse-proxy configuration templates for staging/production.

Canonical public hostnames (match `deploy/env/`):

| Environment | `server_name` | Upstream |
| --- | --- | --- |
| Production | `mudrax.crm` | app on `:3000` |
| Staging | `staging.mudrax.crm` | app on `:3001` |

Terminate TLS here and proxy to the Next.js container. Set `APP_URL` /
`AUTH_URL` to `https://mudrax.crm` (or staging) and keep `AUTH_TRUST_HOST=true`.
