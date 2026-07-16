import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App, { shouldOfferLocalLogin } from "./App";
import { SessionError } from "./lib/session";

vi.mock("cuelume", () => ({ play: vi.fn() }));
vi.mock("@/hooks/useCuelume", () => ({
  useCuelume: () => ({ soundEnabled: true, toggleSound: vi.fn() }),
}));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => <div data-component="background" /> }));
vi.mock("@/components/ShapeGrid", () => ({ default: () => <div data-component="shape-grid" /> }));
vi.mock("@/components/SoundToggle", () => ({ default: () => <button type="button">sound</button> }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => <button type="button">theme</button> }));

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  vi.stubGlobal("window", {
    location: { hash: "#/rental", hostname: "localhost", assign: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout,
  });
});

describe("gateway route auth", () => {
  test("does not render hash-route app state before the server session resolves", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Memeriksa sesi");
    expect(html).not.toContain("Rental");
    expect(html).not.toContain("Segera hadir");
  });

  test("only local-session auth signals enable the local password form", () => {
    expect(shouldOfferLocalLogin("localhost", null, new SessionError(401, "local_session_required", "Local login is required."))).toBe(true);
    expect(shouldOfferLocalLogin("localhost", null, new SessionError(401, "invalid_local_login", "Invalid login."))).toBe(true);
    expect(shouldOfferLocalLogin("localhost", null, new SessionError(401, "missing_access_assertion", "Missing Access JWT."))).toBe(false);
    expect(shouldOfferLocalLogin("localhost", null, new SessionError(401, "invalid_access_assertion", "Invalid Access JWT."))).toBe(false);
    expect(shouldOfferLocalLogin("gateway.houseofexp.com", null, new SessionError(401, "local_session_required", "Local login is required."))).toBe(false);
  });
});
