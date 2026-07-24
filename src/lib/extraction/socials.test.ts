import { describe, expect, it } from "vitest";
import { isOrganiserAccount } from "./socials";

const EVENT = "Hello! Dance Fest 2026";
const ig = (handle: string) => `https://www.instagram.com/${handle}`;

describe("isOrganiserAccount", () => {
  it("drops the account named after the event", () => {
    expect(isOrganiserAccount(EVENT, ig("hellodancefest"))).toBe(true);
  });

  it("drops the per-style sibling accounts the same organizers run", () => {
    // The bug this guards: matching the event name alone let @hellokizombafest
    // through onto three artists' cards, one as their "Joint account".
    for (const handle of ["hellokizombafest", "hellobachata", "hellokizomba", "hellozoukfest"]) {
      expect(isOrganiserAccount(EVENT, ig(handle))).toBe(true);
    }
  });

  it("keeps an artist handle that merely names a style", () => {
    for (const handle of ["bachatasensualorlando", "alanycristina.bachata", "dj_sink", "zoukchata"]) {
      expect(isOrganiserAccount(EVENT, ig(handle))).toBe(false);
    }
  });

  it("keeps a handle that starts with the brand word but isn't a festival account", () => {
    expect(isOrganiserAccount(EVENT, ig("hellokitty"))).toBe(false);
  });

  it("tolerates a trailing slash and an empty handle", () => {
    expect(isOrganiserAccount(EVENT, ig("hellobachata/"))).toBe(true);
    expect(isOrganiserAccount(EVENT, "https://www.instagram.com/")).toBe(false);
  });
});
