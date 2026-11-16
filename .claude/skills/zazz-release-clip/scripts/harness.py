#!/usr/bin/env python3
"""Writes <out>/<Clip>.html: the clip's markup and scoped style, outside Astro, on the
kit's built CSS (packages/core/dist/zazz.css; run `vp run core#build` first).

usage: harness.py <ClipName> <out-dir>   (run from the repo root)
"""
import pathlib
import re
import sys

name, out = sys.argv[1], pathlib.Path(sys.argv[2])
root = pathlib.Path.cwd()
source = root / f"apps/docs/src/components/clips/{name}.astro"
css = (root / "packages/core/dist/zazz.css").as_uri()
body = re.split(r"^---\s*$", source.read_text(), flags=re.M)[2]
out.mkdir(parents=True, exist_ok=True)
(out / f"{name}.html").write_text(
    f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="{css}">
<style>body{{margin:0;padding:16px;background:var(--color-background)}}.wrap{{max-width:740px;margin:auto;width:100%}}</style>
</head><body><div class="wrap">{body}</div></body></html>"""
)
print(out / f"{name}.html")
