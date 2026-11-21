"""Module 1.4 - data.gov.tn search (CKAN API if available).
Writes data/raw/datagov/search_results.json and downloads small CSV/XLSX resources (<20 MB).
Re-run: py -3.13 scripts/03_fetch_datagov.py
"""
import json, re
from common import *

BASES = ["https://catalog.data.gov.tn", "https://data.gov.tn", "http://www.data.gov.tn"]
QUERIES = ["station d'épuration", "STEP", "ONAS", "eaux usées traitées", "réutilisation", "assainissement",
           "périmètres irrigués", "Sousse", "barrages", "nappes", "forages", "pluviométrie",
           "محطات التطهير", "المياه المستعملة المعالجة", "الديوان الوطني للتطهير"]
KEEP = re.compile(r"(épur|epur|assainiss|usée|usee|onas|irrigu|barrage|nappe|forage|pluvio|sousse|تطهير|معالج|سوسة|سدود)", re.I)


def main():
    out = {"api_base": None, "errors": [], "results": {}}
    for b in BASES:
        try:
            r = get(f"{b}/api/3/action/package_search", params={"q": "eau", "rows": 1}, timeout=40, tries=1)
            if r.headers.get("content-type", "").startswith("application/json") and r.json().get("success"):
                out["api_base"] = b; break
        except Exception as e:
            out["errors"].append(f"{b}: {e}")
    print("CKAN base:", out["api_base"])
    if not out["api_base"]:
        (RAW / "datagov" / "search_results.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        return
    seen = {}
    for q in QUERIES:
        try:
            js = get(f"{out['api_base']}/api/3/action/package_search", params={"q": q, "rows": 50}, timeout=60).json()
        except Exception as e:
            out["errors"].append(f"{q}: {e}"); continue
        res = js["result"]["results"]
        out["results"][q] = js["result"]["count"]
        for p in res:
            seen[p["id"]] = {"name": p["name"], "title": p.get("title"), "org": (p.get("organization") or {}).get("title"),
                             "modified": p.get("metadata_modified"), "query": q,
                             "resources": [{"name": x.get("name"), "format": x.get("format"), "url": x.get("url"),
                                            "size": x.get("size")} for x in p.get("resources", [])]}
    rel = {k: v for k, v in seen.items() if KEEP.search((v["title"] or "") + " " + v["name"])}
    out["packages_relevant"] = rel
    out["n_packages_all"] = len(seen)
    (RAW / "datagov" / "search_results.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("packages total", len(seen), "relevant", len(rel))
    n = 0
    for pid, p in rel.items():
        for res in p["resources"]:
            fmt = (res["format"] or "").lower()
            if fmt in ("csv", "xlsx", "xls") and res["url"] and n < 40:
                fn = re.sub(r"[^\w.-]+", "_", f"{p['name'][:60]}__{(res['name'] or 'res')[:40]}.{fmt}")
                try:
                    r = get(res["url"], timeout=60, tries=1, delay=1.5)
                    if len(r.content) < 20e6:
                        (RAW / "datagov" / fn).write_bytes(r.content); n += 1
                except Exception as e:
                    out["errors"].append(f"dl {res['url']}: {e}")
    print("downloaded", n)
    (RAW / "datagov" / "search_results.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
