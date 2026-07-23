import { beforeEach, describe, expect, test, vi } from "vitest";
import { persistSelection } from "./App";
import type { Session } from "./lib/session";

const session: Session = { staffId: "aldi", name: "Pak Aldi" };

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

describe("selection persistence", () => {
  test("does not write unauthenticated selections", () => {
    persistSelection({ appId: "portal", userId: "aldi" }, null);

    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  test("writes authenticated selections", () => {
    persistSelection({ appId: "portal", userId: "aldi" }, session);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "hox-gateway-selection",
      JSON.stringify({ appId: "portal", userId: "aldi" }),
    );
  });

  test("removes the stored selection when an authenticated selection is cleared", () => {
    persistSelection({ appId: null, userId: null }, session);

    expect(localStorage.removeItem).toHaveBeenCalledWith("hox-gateway-selection");
  });
});
