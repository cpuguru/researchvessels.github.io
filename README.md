# researchvessels.github.io

Source for **https://researchvessels.org/**, an open registry of research vessels, their cruises, and where to find their data. Contact: ships@oceandata.org.

- Plain static site: HTML, CSS and JavaScript with Bootstrap 5.3 from a CDN. No build step, no Jekyll (`.nojekyll`), no server code.
- Pages: `index.html` (home), `vessels.html` (directory), `vessel.html?id=MV-…` (one vessel), `platforms.html` and `platform.html?id=…` (draft non-ship platforms), `institutions.html` and `institution.html?id=…` (institutions and groups; IDs match in any letter case), `fleet.html`, `map.html`, `resources.html`, `operators.html`, `equipment-search.html`, `about.html`.
- Data: `data/` (JSON plus matching `.js` files the pages load). Platform data (draft): `data/platforms.json` and `data/manufacturers.json`, with matching `.js` files. Licenses: `LICENSE` (site code) and `DATA_LICENSE.md` (data, CC BY 4.0).
- Legacy downloads stay at their old addresses: `ship_info.json`, `ship_info.xml`, `ship_info.xsd`, `Ship_Specification_Form.doc` / `.pdf`, `CruiseScheduleSpreadsheet.xls`, and `images/`.
- Old pages (`ship_details.html?shipID=…`, `ship_info.html`, `faq.html`, `techlinks.htm`, and others) are small redirect stubs that send visitors to the matching new page; `404.html` catches old `.asp` addresses. The shipID map is `data/legacy_shipids.js`.
- `_redirects` and `_headers` are only used by Cloudflare Pages or Netlify; GitHub Pages ignores them.

## Uncrewed vehicles: data, map layer and form (phase 2)

- `uncrewed.html` is the landing page. `vehicle_condition_form.html` is a draft checklist that runs in the browser only: it prints, downloads a JSON file or opens an e-mail draft that the user sends; it stores and submits nothing.
- `map.html` ("Where were ships?") no longer shows Sailwx positions (2026-11-27); Sailwx daily positions remain on vessel pages (`data/positions.js`). The map layer "Active uncrewed deployments" on `map.html` is still off by default (`?layer=uncrewed` turns it on). It reads IOOS Glider DAC positions live and falls back to `data/uncrewed_deployments.json`/`.js`. Argo positions always come from that snapshot, because the Argo ERDDAP server sends no CORS header.
- To refresh the snapshot, run `python3 tools/refresh_uncrewed_deployments.py` from the repo root. It writes only the two snapshot files. Review the diff and commit it yourself; nothing is published automatically.
- Vessel-vehicle links (`support_vessels`), access fields (`access`) and launch-and-recovery fields (`launch_recovery` in `vessel_extra.json`) each carry a source and a `verified` flag. See `Platform_Unified_Schema_2026-11-26.md` in the data notes for the schema.
- Platform depth and endurance (schema 0.5-draft, 2026-11-27): a depth value is a **rating** or an **observed maximum** (stored separately, never used to overwrite a rating). Endurance figures are labelled **dive duration**, **system**, **mission**, **class-level** or **qualitative**. New values carry a source URL, a short snippet (`evidence`) and an `as_of` date. See `data/schema/Registry_Field_Updates_2026-11-27.md`.


## Statuses, merged records and cruise tracks (review fixes, 2026-11-27)

- One status vocabulary for ships and platforms: **Active** (used or published within about 12 months of the last check), **Listed** (listed as current by the operator or a fleet register; no dated use checked), **Probable** (seen in use 2021-2025), **Dormant** (data trail stopped), **Unconfirmed** (not yet verified; shown as unverified, never as active) and **Retired** (reported retired, lost, replaced or out of service). The labels live in `assets/app.js` (`RV.STATUS_LEVELS`) and in `status_labels` in `data/platforms.json`.
- Ship statuses come from `data/vessel_status.json`/`.js`, an overlay that survives regeneration of `vessels.json`. Each entry keeps the legacy value and records the basis, check date, source and (where known) the R2R record and schedule link. A ship is only promoted above Unconfirmed on positive, dated evidence.
- Vessel entries that duplicated a platform record (Alvin, Jason, Sentry, DSL-120A, Shinkai 6500, Urashima 8000) are merged into the platform record. `platform_aliases` in `data/vessel_extra.json` maps the old MV IDs; `vessel.html?id=MV-…` and the old `ship_details.html?shipID=…` links redirect to the platform page. The vessel records stay in `vessels.json` but are hidden from lists and counts.
- Cruise tracks: `data/track_index.json`/`.js` lists the ships that have a track file in `data/`. Vessel pages and the track layer on `map.html` ("Where were ships?", on by default; `?tracks=off` starts with it off) load tracks only from that list; every other ship shows "No track data yet". The note in `track_index.json` describes the data needed to add a ship. No track is ever drawn from schedule or port data.
- External links open in a new tab with `rel="noopener"` (no `noreferrer`, so linked sites can see the visit came from researchvessels.org). Doug's own domains open in the same tab.
