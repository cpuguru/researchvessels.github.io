# Data license

The compiled ResearchVessels.org vessel registry and related data files
(for example `data/vessels.json`, `data/cruises.json`, and the other
curated JSON/JS data files in `data/`) are licensed under

**[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**

You may copy, share, and build on this compiled data, including for
commercial use, if you give credit.

## Required attribution

Use this wording (or a close equivalent that remains clear):

> Data compiled by Doug White / researchvessels.org

Suggested citation:

> White, D. (2026). ResearchVessels.org research vessel registry.
> https://researchvessels.org/. CC BY 4.0.
>
> This is the single-maintainer public compilation of that registry.

Where a record already names an original source, please credit that
source as well.

## Upstream licences still apply

Some files include data that is already public under a different licence.
Those terms are not replaced by CC BY 4.0:

| Source | Licence | Notes |
| --- | --- | --- |
| Rolling Deck to Repository (R2R), [rvdata.us](https://www.rvdata.us/) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Cruise, equipment, and navigation used on vessel pages and the home-page globe. |
| NOAA NCEI and Ocean Exploration | U.S. Government work, public domain | Including Okeanos Explorer tracks and expeditions. |
| World Port Index (Pub. 150), National Geospatial-Intelligence Agency | U.S. Government work, public domain (17 U.S.C. § 105) | Port locations and characteristics. Lewes, Delaware is not in the WPI and is not given an invented WPI number. |
| Marine Institute (Ireland) | CC BY 4.0, where that licence is confirmed | Materials used on Celtic Voyager / Moses Appaqaq pages. The Tom Crean track licence is still unconfirmed and is not republished here. |
| Photographs | As stated in each caption | Wikimedia Commons CC BY or CC BY-SA, or U.S. Government public domain. Do not treat photos as CC BY 4.0 unless the caption says so. |
| GEBCO_2026 Grid, GEBCO Compilation Group (2026) | See [GEBCO](https://www.gebco.net/) terms | Bathymetry imagery on the home-page globe; not for navigation. |
| OpenFreeMap / OpenStreetMap | © OpenStreetMap contributors | Map tiles. |

The historical cruise schedules and vessel list also draw on the original
researchvessels.org database and on public sources including GMSO,
VesselConnect, Wikipedia/Wikidata, and Sailwx.info (Hal Mueller).

## File-level fields

Object-shaped data files carry a top-level `"license"` and
`"attribution"` field for this compiled-data licence. Files that already
had an upstream `"license"` (World Port Index, R2R) keep that field and
add `"compilation_license"` and `"compilation_attribution"` instead.

`data/vessels.json` is a bare JSON array, because the site scripts treat
it as a list of vessels. Wrapping it in an object would break those
pages. The matching `data/vessels.js` file states the licence in its
header comment instead.

## The site code is separate

The pages, scripts, and tools are all rights reserved. See `LICENSE`.
