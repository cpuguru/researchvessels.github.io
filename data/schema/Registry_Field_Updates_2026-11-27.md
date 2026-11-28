# Registry field updates, 27 November 2026

Draft changes on branch `registry-field-updates-2026-11-27` (not pushed). Schema version is now **0.5-draft**. This note is documentation for review; it is not published as a site page.

## New fields

`platforms.json` now has:

- `depth_kinds`: `rated` (published design or operator rating) and `observed_max` (a deployment or dataset maximum, not a rating).
- `endurance_kinds`: `dive_duration`, `system`, `mission`, `class_level`, `qualitative`.
- `depth_endurance_note` describes how they are stored.

On a value, `depth_rating_m.kind` is `rated` when known (older records may omit it; the page treats that as a rating). An optional `depth_rating_m.observed_max` object holds a sourced observed maximum. `endurance.kind` labels a single figure. When a vehicle has more than one published figure, `endurance.figures[]` lists each one. New or updated values carry `evidence` (a short source snippet) and `as_of`. Source URL and the as-of date also live on the cited `sources[]` record (`url`, `accessed`), as before.

Platform pages render these as plain text through `RV.h()` (no `innerHTML` with data). External links still go through `assets/external-links.js` (`target="_blank"` and `rel="noopener"`; Doug's domains stay in the same tab).

## Known conflicts (item 2)

- **`ud_orris` depth:** the 350 m unit rating is unchanged and marked `rated`. ERDDAP `geospatial_vertical_max` 307.8083 m from deployment `ud_orris-20260813T1614` (13–20 August 2026) is stored only as `observed_max`.
- **`ifremer-victor6000` endurance:** both sourced figures are kept and labelled: **6–10 h** as `dive_duration` (Ifremer/FOF factsheet: “Endurance / Autonomie 6 heures - 10 heures”) and **up to 100 h** as `system` (existing registry figure from the same comparison-table research). They were not collapsed.

## Recommend-accept rows (item 1)

Twenty-six of the 28 recommended-accept rows were applied to blank fields (sensors, depth or endurance), each with a source, snippet and as-of date of 2026-11-27. Two were **not** applied:

- **`sams-freya` endurance “max 10 hours”.** The source snippet describes **Rebus** (`sams-remus`), not Freya. Freya was left unchanged. `sams-remus` already had a 10 h endurance figure and was not overwritten.
- **`noaa-nccos-auv` depth “50 to 300 meters”.** The snippet is habitat zonation (“mesophotic (50 to 300 meters deep) and deep benthic (deeper than 300 meters)”), not a published vehicle rating.

A 10 h Rebus figure that the extract had attached to Freya was therefore not copied onto Freya.

## Data endpoints, licences and WMO IDs (item 3)

Added official AODN Portal links, with the IMOS CC BY 4.0 licence from [IMOS Conditions of Use](https://imos.org.au/conditions-of-use):

- `imos-sirius`: AODN Portal and the IMOS AUV Facility dataset (`uuid=af5d0ff9-bb9c-4b7c-a63c-854a630b6984`).
- `anfog-slocum` and `anfog-seaglider`: AODN Portal plus delayed-mode (`uuid=c317b0fe-02e8-4ff9-96c9-563fd58e82ac`) and real-time (`uuid=a681fdba-c6d9-44ab-90b9-113b0ed03536`) Ocean Gliders datasets.

### Could not be confirmed (nothing guessed)

- **No new WMO IDs were added.** The IOOS Glider DAC University of Delaware deployments list (checked 27 November 2026) does not include `ud_275`. Fleet or class records (`whoi-spray`, `whoi-slocum`, `noc-gliders`, `sams-seagliders`, `bas-marine-robotics`, `anfog-slocum`, `anfog-seaglider`, `csiro-seagliders`, `noaa-aoml-hurricane-gliders`, `navoceano-lbs-g`) were not given a single WMO. No confirming DAC, OceanGliders or ERDDAP record was found this turn for `imr-frigg`, `imr-seaglider` or `noaa-uxsoc-kelpie`.
- **IOOS / Rutgers / UD ERDDAP licences** were not added. A live ERDDAP `.license` URL returned HTTP 400 this turn, so the earlier “may be redistributed and used without restriction” wording was not re-confirmed and was not applied.
