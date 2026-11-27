#!/usr/bin/env python3
"""Hostile cruise-track properties for the Where were ships? map (run after inject_review.py)."""
import json
import sys
from pathlib import Path
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/rv_where_xss")
P = '<img src=x onerror="window.__pwn=51"></script><script>window.__pwn=52</script>'
f = D / "data/tracks_MV-0423.js"
t = f.read_text(encoding="utf-8")
add = ('\nwindow.RV_TRACKS["MV-0423"].features.push({"type":"Feature","geometry":{"type":"LineString","coordinates":[[-75,38],[-74,38.5]]},'
       '"properties":' + json.dumps({"cruise_id": "HRS9999<img src=x onerror=window.__pwn=53>", "year": 2099, "dates": P, "type": P, "url": "javascript:window.__pwn=54"}) + '});\n'
       'window.RV_TRACKS["MV-0423"].features.push({"type":"Feature","geometry":{"type":"LineString","coordinates":[[-74.5,38],[-74,39]]},'
       '"properties":{"cruise_id":"HRS9998","year":"2026","dates":"2026-12-01 to 2026-12-02 <b>bold</b>"}});\n')
f.write_text(t + add, encoding="utf-8")
print("where injections written")
