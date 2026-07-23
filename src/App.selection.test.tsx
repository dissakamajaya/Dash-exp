import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import type * as ReactModule from "react";
import { SessionError } from "./lib/session";
import type { Destination } from "./data/gateway";

const harness = vi.hoisted(() => ({
  play: vi.fn(),
  stateIndex: 0,
  stateValues: [] as unknown[],
  setters: [] as Array<(value: unknown) => void>,
  onSelect: undefined as ((item: Destination) => void) | undefined,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof ReactModule>("react");
  return {
    ...actual,
    useEffect: () => undefined,
    useState: (initial: unknown) => {
      const index = harness.stateIndex;
      harness.stateIndex += 1;
      const value = index < harness.stateValues.length
        ? harness.stateValues[index]
        : typeof initial === "function"
          ? (initial as () => unknown)()
          : initial;
      const setter = vi.fn();
      harness.setters[index] = setter;
      return [value, setter];
    },
  };
});
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
}));
vi.mock("cuelume", () => ({ play: harness.play }));
vi.mock("@/hooks/useCuelume", () => ({
  useCuelume: () => ({ soundEnabled: true, toggleSound: vi.fn() }),
}));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => <div data-component="background" /> }));
vi.mock("@/components/ShapeGrid", () => ({
  default: ({ onSelect }: { onSelect: (item: Destination) => void }) => {
    harness.onSelect = onSelect;
    return <div data-component="shape-grid" />;
  },
}));
vi.mock("@/components/SoundToggle", () => ({ default: () => <button type="button">sound</button> }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => <button type="button">theme</button> }));

beforeEach(() => {
  harness.play.mockClear();
  harness.stateIndex = 0;
  harness.stateValues = [
    true,
    { appId: null, userId: "aldi" },
    { staffId: "aldi", name: "Pak Aldi" },
    null,
    false,
    null,
    "",
    false,
    "/",
  ];
  harness.setters = [];
  harness.onSelect = undefined;
  vi.stubGlobal("window", {
    location: { hash: "", hostname: "localhost", assign: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout,
  });
});

const [{ default: App }, { DESTINATIONS }] = await Promise.all([import("./App"), import("./data/gateway")]);

describe("authenticated selector behavior", () => {
  test("selecting a destination plays its cue and updates selection", () => {
    renderToStaticMarkup(<App />);
    const portal = DESTINATIONS.find((item) => item.id === "portal");

    expect(portal).toBeDefined();
    expect(harness.onSelect).toBeDefined();
    harness.onSelect?.(portal as Destination);

    expect(harness.play).toHaveBeenCalledWith("sparkle");
    expect(harness.setters[1]).toHaveBeenCalled();
  });

  test("renders coming-soon routes before authentication completes", () => {
    harness.stateValues[2] = null;
    harness.stateValues[8] = "/rental";

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Rental");
    expect(html).toContain("Segera hadir");
  });
  test("keeps active routes behind authentication", () => {
    harness.stateValues[2] = null;
    harness.stateValues[3] = new SessionError(401, "missing_access_assertion", "Missing Access assertion.");
    harness.stateValues[8] = "/portal";

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Akses ditolak");
    expect(html).not.toContain("Portal");
  });
});
