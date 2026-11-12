import { describe, expect, it } from "vite-plus/test";
import { CORNER_SHAPE, cornerShape, cornerShapeLabel } from "./corner-shape.ts";

describe("cornerShape", () => {
  it("writes a superellipse for values inside the finite range", () => {
    expect(cornerShape(1.3)).toBe("superellipse(1.3)");
    expect(cornerShape(-2)).toBe("superellipse(-2)");
    expect(cornerShape(3)).toBe("superellipse(3)");
  });

  it("writes infinity past either end of the finite range", () => {
    expect(cornerShape(3.1)).toBe("superellipse(infinity)");
    expect(cornerShape(-2.1)).toBe("superellipse(-infinity)");
  });

  it("puts the slider's ends one step past the finite range", () => {
    expect(CORNER_SHAPE.min).toBeLessThan(-2);
    expect(CORNER_SHAPE.max).toBeGreaterThan(3);
    expect(cornerShape(CORNER_SHAPE.min)).toBe("superellipse(-infinity)");
    expect(cornerShape(CORNER_SHAPE.max)).toBe("superellipse(infinity)");
  });
});

describe("cornerShapeLabel", () => {
  it("prints the number, or ∞ at the ends", () => {
    expect(cornerShapeLabel(1.3)).toBe("1.3");
    expect(cornerShapeLabel(3.1)).toBe("∞");
    expect(cornerShapeLabel(-2.1)).toBe("−∞");
  });
});
