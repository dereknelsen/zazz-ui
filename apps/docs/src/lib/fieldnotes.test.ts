import { describe, expect, it } from "vite-plus/test";
import { AVATAR_ROLES, avatarRole, spotters } from "./fieldnotes.ts";

describe("avatarRole", () => {
  it("gives the same person the same role every time", () => {
    expect(avatarRole("JA")).toBe(avatarRole("JA"));
  });

  it("spreads the spotters across all three accent roles", () => {
    const roles = new Set(spotters.map((s) => avatarRole(s.initials)));
    expect(roles).toEqual(new Set(AVATAR_ROLES));
  });
});
