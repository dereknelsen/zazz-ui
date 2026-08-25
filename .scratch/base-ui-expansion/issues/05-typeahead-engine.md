# 05-typeahead-engine

Status: resolved
Type: task

base/command-score.ts + base/hotkeys.ts + base/typeahead.ts + tests + ADR-0007

See ../spec.md and the approved plan for detail.

## Comments

## Answer

base/command-score.ts (faithful cmdk port, MIT @pacocoursey attribution), base/hotkeys.ts (parse/match/bind + editable guard), base/typeahead.ts (TypeaheadElement + rankItems/nextActiveIndex). ADR-0007 records the vendoring decision. 28 unit tests.
