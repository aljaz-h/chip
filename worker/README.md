# Chip link service

A tiny Cloudflare Worker that stores a Nuvio badge pack and serves it at a short link
(`https://your-worker.workers.dev/p/abc12345`). It powers the **Generate link** button in Chip,
so people can get an import link without a GitHub account.

- `POST /api/packs` stores a pack and returns `{ id, key, url }`. The `key` is the secret edit key.
- `PUT /api/packs/<id>` with header `X-Edit-Key` updates the pack. The link stays the same.
- `DELETE /api/packs/<id>` with the edit key removes it.
- `GET /p/<id>` returns the pack. This is what Nuvio downloads.

Limits: 1.5 MB per pack, 30 writes per hour and 25 new links per day per visitor. Only a hash of the
visitor's address is stored (for the rate limit), and old entries are cleaned up. Edit keys are stored
hashed. Packs are public to anyone who has the link.

## Deploy (no command line needed)

1. In the Cloudflare dashboard open **Storage & databases → D1 SQL database → Create database**. Name it `chip-links`.
2. Open the database, go to the **Console** tab, paste the contents of `schema.sql` and run it.
3. Open **Compute (Workers) → Create application → Start with Hello World**. Name it `chip-links` and deploy.
4. Click **Edit code**, replace everything with `index.js` from this folder, and deploy.
5. Open the Worker's **Settings → Bindings → Add → D1 database**. Set the variable name to exactly `DB`, pick `chip-links`, and deploy.
6. Visit the Worker's address. It should say "Chip link service".
7. Put that address in `LINK_API` at the top of `app.js` (already set to the live one).

The menu names move around from time to time, but the steps stay the same.

### With the command line

```
npm i -g wrangler
wrangler d1 create chip-links        # copy the database_id into wrangler.toml
wrangler d1 execute chip-links --remote --file=schema.sql
wrangler deploy
```

## Notes

`ORIGINS` at the top of `index.js` lists the sites that may create or edit links from a browser.
Reading a link (`GET /p/<id>`) is open to everyone, which Nuvio needs.
