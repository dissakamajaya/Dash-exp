import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import type * as ReactModule from "react";
import type { SelectorItem } from "./data/gateway";

const harness = vi.hoisted(() => ({
  play: vi.fn(),
  stateIndex: 0,
  stateValues: [] as unknown[],
  setters: [] as Array<(value: unknown) => void>,
  onSelect: undefined as ((item: SelectorItem) => void) | undefined,
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
  default: ({ onSelect }: { onSelect: (item: SelectorItem) => void }) => {
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

const [{ default: App }, { SELECTOR_ITEMS }] = await Promise.all([import("./App"), import("./data/gateway")]);

describe("authenticated selector behavior", () => {
  test("plays a user cue even when the server session blocks user reassignment", () => {
    renderToStaticMarkup(<App />);
    const dissa = SELECTOR_ITEMS.find((item) => item.id === "dissa");

    expect(dissa).toBeDefined();
    expect(harness.onSelect).toBeDefined();
    harness.onSelect?.(dissa as SelectorItem);

    expect(harness.play).toHaveBeenCalledWith("ready");
    expect(harness.setters[1]).not.toHaveBeenCalled();
  });
});
