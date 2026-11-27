#!/usr/bin/env python3
"""Add hostile values for the 2026-11-27 review-fix fields to the XSS clone made by inject_xss_phase2.py.
Run after it: python3 tools/inject_review.py /tmp/rv_review_xss"""
import json
import sys
from pathlib import Path

DEST = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/rv_review_xss")
P = '<img src=x onerror="window.__pwn=31"></script><script>window.__pwn=32</script>'
Q = '"><img src=x onerror="window.__pwn=33">'
JS = "javascript:window.__pwn=34"


def read_js(name, var):
    t = (DEST / "data" / name).read_text(encoding="utf-8")
    i = t.index("window." + var + "=") + len("window." + var + "=")
    return json.loads(t[i:].rstrip().rstrip(";"))


def write_js(obj, name, var):
    body = (json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
            .replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))
    (DEST / "data" / name).write_text("/* injected review */\nwindow." + var + "=" + body + ";\n", encoding="utf-8")


# vessel status overlay
st = read_js("vessel_status.js", "RV_VSTATUS")
V = st["vessels"]
V["MV-0112"].update({"status_basis": "Basis " + P, "status_source": "Src " + P, "status_url": JS, "r2r_url": JS,
                     "unols_class": P, "status_date": P,
                     "schedule": {"kind": "operator", "label": "Sched " + P, "url": JS}})
V["MV-0423"].update({"status": "Active" + P, "status_basis": Q, "status_url": "https://evil.example/" + Q,
                     "schedule": {"kind": P, "label": Q, "url": "https://evil.example/s?" + Q}})
V["MV-EVIL"] = {"legacy_status": P, "status": P, "status_basis": P, "status_date": P, "status_source": P,
                "status_url": "data:text/html," + P, "r2r_id": P, "r2r_url": "vbscript:x",
                "schedule": {"kind": "unols", "label": P, "url": " javascript:window.__pwn=35"}}
write_js(st, "vessel_status.js", "RV_VSTATUS")

# track index: bad paths must never be loaded as scripts
ti = read_js("track_index.js", "RV_TRACK_INDEX")
ti["tracks"]["MV-0001"] = {"file": "javascript:window.__pwn=36", "source": "r2r", "label": P}
ti["tracks"]["MV-0002"] = {"file": "https://evil.example/t.js", "source": "r2r", "label": P}
ti["tracks"]["MV-0003"] = {"file": "data/../../evil.js", "source": P, "label": P, "list": "//evil.example/l.js"}
ti["tracks"]["MV-0423"]["label"] = "Label " + P
ti["tracks"]["MV-EVIL"] = {"file": "data/tracks_MV-0423.js", "source": P, "label": P}
write_js(ti, "track_index.js", "RV_TRACK_INDEX")

# platform aliases pointing at hostile targets
ex = read_js("vessel_extra.js", "RV_EXTRA")
ex.setdefault("platform_aliases", {})
ex["platform_aliases"]["MV-0005"] = "evil" + Q
ex["platform_aliases"]["MV-0006"] = JS
ex["platform_aliases"]["MV-0007"] = "//evil.example/x"
ex.setdefault("platform_alias_notes", {})["MV-0005"] = P
write_js(ex, "vessel_extra.js", "RV_EXTRA")

# platforms: hostile display-name inputs and merge fields
pl = read_js("platforms.js", "RV_PLATFORMS")
for p in pl["platforms"]:
    if p.get("platform_id") == "evil-plat":
        p.update({"display_name": "Evil " + P + " (evil-plat)", "model": P, "serial_number": P, "status": P,
                  "vessel_id": "MV-0054" + Q, "legacy_ids": [P, Q], "aliases": [P],
                  "legacy_vessel_record": {"id": P, "name": P, "status": P, "notes": P}})
pl["platforms"].append({"platform_id": "ud_999", "display_name": "ud_999", "platform_class": "glider",
                        "model": "Slocum " + P, "serial_number": "000" + Q, "owner_id": "evil-inst",
                        "operator_id": "evil-inst", "status": "Unconfirmed", "autonomy": "supervised autonomous",
                        "aliases": [], "sensors": [], "other_specs": [], "sources": []})
pl.setdefault("status_labels", {})["Unconfirmed"] = P
write_js(pl, "platforms.js", "RV_PLATFORMS")

# institutions: extra hostile short name used by ownerShort()
ins = read_js("institutions.js", "RV_INSTITUTIONS")
for i in ins["institutions"]:
    if i.get("institution_id") == "evil-inst":
        i["short_name"] = Q
        i["type"] = P
write_js(ins, "institutions.js", "RV_INSTITUTIONS")
print("review injections written to", DEST)
