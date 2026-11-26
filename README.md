# researchvessels.github.io

Source for **https://researchvessels.org/**, an open registry of research vessels, their cruises, and where to find their data. Contact: ships@oceandata.org.

- Plain static site: HTML, CSS and JavaScript with Bootstrap 5.3 from a CDN. No build step, no Jekyll (`.nojekyll`), no server code.
- Pages: `index.html` (home), `vessels.html` (directory), `vessel.html?id=MV-…` (one vessel), `platforms.html` and `platform.html?id=…` (draft non-ship platforms), `fleet.html`, `map.html`, `resources.html`, `operators.html`, `equipment-search.html`, `about.html`.
- Data: `data/` (JSON plus matching `.js` files the pages load). Platform data (draft): `data/platforms.json` and `data/manufacturers.json`, with matching `.js` files. Licenses: `LICENSE` (site code) and `DATA_LICENSE.md` (data, CC BY 4.0).
- Legacy downloads stay at their old addresses: `ship_info.json`, `ship_info.xml`, `ship_info.xsd`, `Ship_Specification_Form.doc` / `.pdf`, `CruiseScheduleSpreadsheet.xls`, and `images/`.
- Old pages (`ship_details.html?shipID=…`, `ship_info.html`, `faq.html`, `techlinks.htm`, and others) are small redirect stubs that send visitors to the matching new page; `404.html` catches old `.asp` addresses. The shipID map is `data/legacy_shipids.js`.
- `_redirects` and `_headers` are only used by Cloudflare Pages or Netlify; GitHub Pages ignores them.

## Uncrewed vehicles: data, map layer and form (phase 2)

- `uncrewed.html` is the landing page. `vehicle_condition_form.html` is a draft checklist that runs in the browser only: it prints, downloads a JSON file or opens an e-mail draft that the user sends; it stores and submits nothing.
- The map layer "Active uncrewed deployments" on `map.html` reads IOOS Glider DAC positions live and falls back to `data/uncrewed_deployments.json`/`.js`. Argo positions always come from that snapshot, because the Argo ERDDAP server sends no CORS header.
- To refresh the snapshot, run `python3 tools/refresh_uncrewed_deployments.py` from the repo root. It writes only the two snapshot files. Review the diff and commit it yourself; nothing is published automatically.
- Vessel-vehicle links (`support_vessels`), access fields (`access`) and launch-and-recovery fields (`launch_recovery` in `vessel_extra.json`) each carry a source and a `verified` flag. See `Platform_Unified_Schema_2026-11-26.md` in the data notes for the schema.
