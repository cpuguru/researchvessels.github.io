# researchvessels.github.io

Source for **https://researchvessels.org/**, an open registry of research vessels, their cruises, and where to find their data. Contact: ships@oceandata.org.

- Plain static site: HTML, CSS and JavaScript with Bootstrap 5.3 from a CDN. No build step, no Jekyll (`.nojekyll`), no server code.
- Pages: `index.html` (home), `vessels.html` (directory), `vessel.html?id=MV-…` (one vessel), `fleet.html`, `map.html`, `resources.html`, `operators.html`, `equipment-search.html`, `about.html`.
- Data: `data/` (JSON plus matching `.js` files the pages load). Licenses: `LICENSE` (site code) and `DATA_LICENSE.md` (data, CC BY 4.0).
- Legacy downloads stay at their old addresses: `ship_info.json`, `ship_info.xml`, `ship_info.xsd`, `Ship_Specification_Form.doc` / `.pdf`, `CruiseScheduleSpreadsheet.xls`, and `images/`.
- Old pages (`ship_details.html?shipID=…`, `ship_info.html`, `faq.html`, `techlinks.htm`, and others) are small redirect stubs that send visitors to the matching new page; `404.html` catches old `.asp` addresses. The shipID map is `data/legacy_shipids.js`.
- `_redirects` and `_headers` are only used by Cloudflare Pages or Netlify; GitHub Pages ignores them.
