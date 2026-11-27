# Tests (developer-only)

These are browser tests for the static site. They are not part of the site: no page links to `tests/`, there are no HTML files in it, `robots.txt` disallows it, and it is not in the sitemap. The site itself has no build step. Note that GitHub Pages publishes every file in the repo, so these files can still be fetched as plain text at `/tests/…`. They contain no secrets.

## Requirements

- python3 (to serve the site and build the hostile-data copy)
- Node 18 or newer (uses built-in `fetch` and `WebSocket`; no npm packages, no `node_modules`)
- google-chrome (run headless through the DevTools protocol)

## Run everything

```
bash tests/run_all.sh [tag]
```

The runner picks two free local ports. It serves the repo on one, and on the other it serves a temporary copy with hostile data injected (`tests/tools/inject_*.py`, under `/tmp`, removed afterwards). It then runs each suite and writes `tests/out/<tag>_status.txt`, one log per suite, and screenshots under `tests/out/shots/`. `tests/out/` is git-ignored. A full run takes about 45 minutes.

## Suites

| File | What it checks |
|---|---|
| `where_test.mjs` | "Where were ships?" (`map.html`): no Sailwx, cruise tracks on by default, `?tracks=off`, year filter, presets, hostile track data, 1280/375 px screenshots |
| `review_test.mjs` / `review_xss.mjs` | 2026-11-27 review fixes: statuses, merged records, equipment, sticky menu, counts, display names, institutions, governance, noopener; plus XSS on the new fields |
| `phase2_test.mjs` / `phase2_xss.mjs` | Uncrewed pages, the deployments map layer, the vehicle form, and their XSS cases |
| `phase1/inst_test.mjs`, `phase1/xss_test.mjs`, `phase1/resources_smoke.mjs` | Platform registry, institution pages, nav, Resources links |

Run one suite by hand against a server you started yourself, for example:

```
python3 tests/tools/ghp_server.py . 8899 &
BASE=http://127.0.0.1:8899/ node tests/where_test.mjs
```

Its hostile-data checks also need `XBASE` (a server for the injected copy). `SITE`, `SHOTS`, `OUT` and `RV_OUT` override the default paths.

## Known noise on a sandboxed machine

Map tiles come from tiles.openfreemap.org, and the gliders layer calls the IOOS Glider DAC. Without a reliable network these produce "Failed to fetch" or WebGL errors in the map checks. The click-grid popup check in `phase2_xss.mjs` is timing-dependent. Re-run before treating these as real failures.
