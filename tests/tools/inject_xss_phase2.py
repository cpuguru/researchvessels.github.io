#!/usr/bin/env python3
"""Copy the phase-2 site and inject hostile autonomy/sensor/institution values for XSS tests."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(__file__).resolve().parents[2]
DEST = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/rv_xss_phase2")

PAYLOAD = '<img src=x onerror="window.__pwn=1"></script><script>window.__pwn=2</script>'
JSURL = "javascript:alert(1)"

if DEST.exists():
    shutil.rmtree(DEST)
# copy tree but skip bulky image assets we don't need for XSS pages? Keep them for fidelity.
shutil.copytree(SRC, DEST, ignore=shutil.ignore_patterns("*.zip", ".git", "tests", "node_modules"))


def write_js(obj, path: Path, var: str, header: str) -> None:
    body = (
        json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        .replace("</", "<\\/")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )
    path.write_text(header + "window." + var + "=" + body + ";\n", encoding="utf-8")


inst = json.loads((DEST / "data/institutions.json").read_text(encoding="utf-8"))
inst["institutions"].append({
    "institution_id": "evil-inst",
    "name": "Evil " + PAYLOAD,
    "short_name": "EV" + PAYLOAD,
    "aliases": [PAYLOAD],
    "parent_id": None,
    "country": "US",
    "ror_id": JSURL,
    "url": JSURL,
    "notes": PAYLOAD,
    "vessel_ids": [],
})
(DEST / "data/institutions.json").write_text(json.dumps(inst, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(inst, DEST / "data/institutions.js", "RV_INSTITUTIONS",
         "/* Generated from data/institutions.json so pages work when opened from disk (file://).\n   DRAFT, unverified. License: CC BY 4.0. Attribution: Data compiled by Doug White / researchvessels.org. */\n")

plat = json.loads((DEST / "data/platforms.json").read_text(encoding="utf-8"))
# Hostile values on a dedicated record plus a couple of visible fields on Alvin
for p in plat["platforms"]:
    if p.get("platform_id") == "whoi-alvin":
        p["autonomy_basis"] = "Basis " + PAYLOAD
        p.setdefault("sensors", []).append({
            "kind": "camera" + PAYLOAD,
            "name": "Hostile sensor " + PAYLOAD,
            "maker": "Maker " + PAYLOAD,
            "model": "Model " + PAYLOAD,
            "serial_number": PAYLOAD,
            "calibration_date": None,
            "notes": PAYLOAD,
            "source_id": None,
        })
        p.setdefault("other_specs", []).append({
            "label": "Evil spec " + PAYLOAD,
            "value": PAYLOAD,
            "unit": None,
            "basis": None,
            "source_id": None,
            "comment": PAYLOAD,
        })

plat["platforms"].append({
    "platform_id": "evil-plat",
    "name": "Evil platform " + PAYLOAD,
    "display_name": "Evil platform " + PAYLOAD,
    "aliases": [PAYLOAD],
    "distinct_from": [],
    "platform_class": "AUV",
    "autonomy": PAYLOAD,  # not in the allowlist; must render as text, not HTML
    "autonomy_basis": "Hostile basis " + PAYLOAD,
    "model": "Model " + PAYLOAD,
    "manufacturer": "Maker " + PAYLOAD,
    "owner_org": PAYLOAD,
    "operator_org": PAYLOAD,
    "affiliations": [{"institution_id": "evil-inst", "role": "operator", "note": PAYLOAD, "source_id": None}],
    "countries": ["US"],
    "status": "Active",
    "status_date": None,
    "status_basis": PAYLOAD,
    "specs": [],
    "other_specs": [{"label": "Evil " + PAYLOAD, "value": PAYLOAD, "unit": None, "basis": None, "source_id": None, "comment": PAYLOAD}],
    "sensors": [{"kind": PAYLOAD, "name": "Sensor " + PAYLOAD, "maker": PAYLOAD, "model": PAYLOAD,
                 "serial_number": PAYLOAD, "calibration_date": None, "notes": PAYLOAD, "source_id": None}],
    "applications": [PAYLOAD],
    "deployments": [],
    "data_endpoints": [{"label": PAYLOAD, "type": "html", "url": JSURL}],
    "photos": [{"url": JSURL, "label": PAYLOAD, "credit": PAYLOAD, "source_id": None}],
    "notes": [PAYLOAD],
    "source_ids": [],
    "depth_rating_m": None,
    "endurance": {"value": None, "unit": None, "text": PAYLOAD, "basis": None, "source_id": None, "comment": PAYLOAD},
    "survey_speed_kn": None,
    "provenance": {"record_status": "draft", "confidence": "low", "last_verified": "2026-11-26", "verified_by": PAYLOAD, "gaps": [PAYLOAD]},
})
(DEST / "data/platforms.json").write_text(json.dumps(plat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(plat, DEST / "data/platforms.js", "RV_PLATFORMS",
         "/* Generated from data/platforms.json so pages work when opened from disk (file://).\n   DRAFT, unverified. License: CC BY 4.0. Attribution: Data compiled by Doug White / researchvessels.org. */\n")

ves = json.loads((DEST / "data/vessels.json").read_text(encoding="utf-8"))
ves.append({
    "id": "MV-EVIL",
    "name": "Evil vessel " + PAYLOAD,
    "country": "Us" + PAYLOAD if False else "Testland",
    "operator": "Op " + PAYLOAD,
    "owner": "Ow " + PAYLOAD,
    "type": "Vessel",
    "status": "active",
    "autonomy": PAYLOAD,
    "autonomy_basis": "Hostile " + PAYLOAD,
    "vehicle_class": "AUV",
    "len": None, "built": None, "gt": None, "url": JSURL, "imo": None, "mmsi": None, "cs": None,
    "former_names": [PAYLOAD],
})
(DEST / "data/vessels.json").write_text(json.dumps(ves, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(ves, DEST / "data/vessels.js", "RV_VESSELS",
         "/* Generated from data/vessels.json so pages work when opened from disk (file://).\n   License: CC BY 4.0. Attribution: Data compiled by Doug White / researchvessels.org.\n   vessels.json is a bare array (no top-level license key) so existing page scripts keep working. */\n")


# ------------------------------------------------------------------ phase 2 additions
P2 = '<img src=x onerror="window.__pwn=7"></script><script>window.__pwn=8</script>'
plat = json.loads((DEST / "data/platforms.json").read_text(encoding="utf-8"))
for p in plat["platforms"]:
    if p["platform_id"] == "evil-plat":
        p["support_vessels"] = [
            {"vessel_id": "MV-EVIL", "name": "Ship " + P2, "role": P2, "source_id": P2, "date": P2, "evidence_period": P2,
             "evidence": P2, "verified": P2, "note": P2},
            {"vessel_id": P2, "name": P2, "role": "usual ship", "source_id": None, "date": None, "evidence": None, "verified": False, "note": P2},
            {"vessel_id": "../../etc/passwd", "name": "__proto__", "role": "mother ship", "source_id": "__proto__", "date": "2026-11-26", "evidence": None, "verified": False, "note": "x"},
            {"vessel_id": None, "name": "constructor", "role": "any suitable ship", "source_id": None, "date": None, "evidence": None, "verified": True, "note": None},
            "not an object", None, 7,
        ]
        p["access"] = {"national_facility": P2, "contracted_service": P2, "program": P2,
                       "access_how": {"text": P2, "url": JSURL}, "source_id": P2, "verified": P2, "date": P2, "note": P2}
    if p["platform_id"] == "whoi-alvin":
        p["support_vessels"].append({"vessel_id": "MV-EVIL", "name": "Evil ship " + P2, "role": "usual ship", "source_id": None,
                                     "date": "2026-11-26", "evidence": P2, "verified": False, "note": P2})
        p["access"]["program"] = "Program " + P2
        p["access"]["access_how"] = {"text": "How " + P2, "url": JSURL}
        p["access"]["note"] = P2
(DEST / "data/platforms.json").write_text(json.dumps(plat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(plat, DEST / "data/platforms.js", "RV_PLATFORMS", "/* injected */\n")

ex = json.loads((DEST / "data/vessel_extra.json").read_text(encoding="utf-8"))
fact = lambda: {"text": P2, "value": P2, "unit": P2, "source_id": P2, "verified": P2}
ex["vessels"]["MV-EVIL"] = {"launch_recovery": {"vehicle_classes": [P2, "AUV"], "usv_support": P2, "lars": fact(), "a_frame_swl": fact(),
                            "crane_swl": fact(), "deck_space": fact(), "power": fact(), "sources": [P2, "__proto__"], "verified": P2, "notes": [P2]}}
ex["vessels"]["MV-0112"]["launch_recovery"]["notes"] = (ex["vessels"]["MV-0112"]["launch_recovery"].get("notes") or []) + [P2]
ex["vessels"]["MV-0112"]["launch_recovery"]["lars"]["text"] = "LARS " + P2
(DEST / "data/vessel_extra.json").write_text(json.dumps(ex, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(ex, DEST / "data/vessel_extra.js", "RV_EXTRA", "/* injected */\n")

res = json.loads((DEST / "data/resources.json").read_text(encoding="utf-8"))
for g in res["research_links"]:
    if g["group"] == "Uncrewed ocean mapping":
        g["items"].append({"title": "Evil " + P2, "url": JSURL, "region": P2, "desc": P2, "check": {"result": P2, "status": P2, "date": P2}})
        g["items"].append({"title": "Evil2 " + P2, "url": "https://example.org/x", "region": "USA", "desc": P2, "check": {"result": "live", "status": 200, "date": P2}})
res["research_links"].append({"group": "Group " + P2, "items": [{"title": P2, "url": "https://example.org/y", "region": "USA", "desc": P2,
                              "check": {"result": "live", "status": 200, "date": "2026-11-26"}}]})
(DEST / "data/resources.json").write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(res, DEST / "data/resources.js", "RV_RESOURCES", "/* injected */\n")

dep = json.loads((DEST / "data/uncrewed_deployments.json").read_text(encoding="utf-8"))
dep["gliders"]["items"] = [
    {"id": "ok-1", "title": P2, "institution": P2, "start": P2, "time": P2, "lat": 10, "lon": 20},
    {"id": P2, "title": "bad id", "institution": "x", "start": "", "time": "", "lat": 1, "lon": 1},
    {"id": "str-pos", "title": "t", "institution": "i", "start": "", "time": "", "lat": "10", "lon": "20"},
    {"id": "far", "title": "t", "institution": "i", "start": "", "time": "", "lat": 999, "lon": 0},
    {"id": "good-2", "title": "Good", "institution": "Inst", "start": "2026-11-20", "time": "2026-11-26T01:00:00Z", "lat": -20, "lon": 100},
    "junk", None, 5,
] + dep["gliders"]["items"][:3]
dep["gliders"]["as_of"] = P2
dep["gliders"]["source"] = P2
dep["argo"]["items"] = [[P2, 0, 0, P2], ["1900001", 10, 20, P2], ["1900002", "x", 1, ""], ["1900003", 91, 0, ""], "junk", None, ["1900004", 5, 5, "2026-11-25"]] + dep["argo"]["items"][:20]
dep["argo"]["as_of"] = P2
(DEST / "data/uncrewed_deployments.json").write_text(json.dumps(dep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write_js(dep, DEST / "data/uncrewed_deployments.js", "RV_DEPLOYMENTS", "/* injected */\n")

print("injected XSS fixtures into", DEST)
