#!/bin/zsh
# Lays every <out-dir>/<prefix>-*.png out in a labeled grid and screenshots it.
# usage: sheet.sh <out-dir> <prefix> <sheet.png>
out=$1; prefix=$2; sheet=$3
cd "$out" || exit 1
{
  echo '<!doctype html><style>body{margin:0;font:12px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px;background:#888}figure{margin:0}img{width:100%;display:block}</style>'
  for f in ${prefix}-*.png(N); do echo "<figure><img src=\"$f\"><figcaption>$f</figcaption></figure>"; done
} > sheet.html
agent-browser set media light >/dev/null
agent-browser open "file://$out/sheet.html" >/dev/null
agent-browser set viewport 1500 1100 >/dev/null
agent-browser screenshot --full-page "$out/$sheet" >/dev/null 2>&1 || agent-browser screenshot "$out/$sheet" >/dev/null
echo "$out/$sheet"
