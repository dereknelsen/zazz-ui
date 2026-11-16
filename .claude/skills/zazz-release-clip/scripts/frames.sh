#!/bin/zsh
# Screenshots a clip with every animation paused at each percentage of its 10s loop.
# usage: frames.sh <out-dir> <ClipName> <light|dark> <pct...>
# writes <out-dir>/<ClipName>-<theme>-<pct>.png; needs <out-dir>/<ClipName>.html (harness.py)
out=$1; clip=$2; theme=$3; shift 3
agent-browser set media $theme >/dev/null
agent-browser open "file://$out/$clip.html" >/dev/null
agent-browser set viewport 800 520 >/dev/null
for p in "$@"; do
  agent-browser eval "document.getAnimations().forEach(a=>{a.pause();a.currentTime=$p*100});'ok'" >/dev/null
  agent-browser screenshot "$out/$clip-$theme-$p.png" >/dev/null
done
agent-browser set media light >/dev/null
