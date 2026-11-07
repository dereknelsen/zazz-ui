# Animation plans

From the `/improve-animations` audit of the spring curve and default transitions.

| Order | Plan                                         | Severity | Depends on | Status                      |
| ----- | -------------------------------------------- | -------- | ---------- | --------------------------- |
| 1     | [001: Spring tokens](001-spring-tokens.md)   | HIGH     | none       | Applied, feel check pending |
| 2     | [002: Linear spinner](002-linear-spinner.md) | HIGH     | none       | Applied, feel check pending |

Both plans apply on top of the uncommitted working tree, because the `@supports` block in 001 does not exist at `46e11fe`.
