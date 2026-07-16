import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { play } from "cuelume";
import AnimatedBackground from "@/components/AnimatedBackground";
import ShapeGrid from "@/components/ShapeGrid";
import SoundToggle from "@/components/SoundToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useCuelume } from "@/hooks/useCuelume";
import { getSession, localLogin, SessionError, type Session } from "@/lib/session";
import {
  DESTINATIONS,
  SELECTOR_ITEMS,
  STORAGE_KEY,
  USERS,
  type SelectorItem,
} from "@/data/gateway";

const DEFAULT_ACCENT = "#818cf8";

type AccentStyle = CSSProperties & { "--accent": string };

type SavedSelection = {
  appId: string | null;
  userId: Session["staffId"] | null;
};

function matchingUserId(value: unknown): Session["staffId"] | null {
  return USERS.find((item) => item.id === value)?.id ?? null;
}

function matchingAppId(value: unknown): string | null {
  return DESTINATIONS.find((item) => item.id === value)?.id ?? null;
}

function loadSelection(): SavedSelection {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { appId: null, userId: null };
    const saved = JSON.parse(value);
    const savedAppId = saved && typeof saved === "object" && "appId" in saved ? saved.appId : null;
    const savedUserId = saved && typeof saved === "object" && "userId" in saved ? saved.userId : null;
    return {
      appId: matchingAppId(savedAppId),
      userId: matchingUserId(savedUserId),
    };
  } catch {
    return { appId: null, userId: null };
  }
}

function readRoute() {
  return window.location.hash.slice(1).split("?")[0] || "/";
}

export function shouldOfferLocalLogin(hostname: string, session: Session | null, authError: SessionError | null): boolean {
  const localhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  return (
    localhost &&
    !session &&
    (authError?.code === "local_session_required" || authError?.code === "invalid_local_login")
  );
}

function sessionError(error: unknown): SessionError {
  if (error instanceof SessionError) return error;
  return new SessionError(500, "session_request_failed", "Session request failed.");
}

export default function App() {
  const { soundEnabled, toggleSound } = useCuelume();
  const [dark, setDark] = useState(true);
  const [selection, setSelection] = useState<SavedSelection>(loadSelection);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<SessionError | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(readRoute);

  const selectedApp = DESTINATIONS.find((item) => item.id === selection.appId) ?? null;
  const serverUser = session ? (USERS.find((item) => item.id === session.staffId) ?? null) : null;
  const selectedUser = serverUser ?? USERS.find((item) => item.id === selection.userId) ?? null;
  const routeApp = DESTINATIONS.find((item) => item.route === route) ?? null;
  const hoveredItem = SELECTOR_ITEMS.find((item) => item.shapeIndex === hoveredIndex);
  const activeAccent = hoveredItem?.accent ?? selectedApp?.accent ?? selectedUser?.accent ?? DEFAULT_ACCENT;
  const selectedIndices = [selectedApp?.shapeIndex, selectedUser?.shapeIndex].filter(
    (value): value is number => value !== undefined,
  );
  const localLoginAvailable = shouldOfferLocalLogin(window.location.hostname, session, authError);
  const blockedByAuth = !authLoading && !session && authError && !localLoginAvailable;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    try {
      if (!selection.appId && !selection.userId) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // The gateway still works when storage is unavailable.
    }
  }, [selection]);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((value) => {
        if (cancelled) return;
        setSession(value);
        setAuthError(null);
        setSelection((current) => ({ ...current, userId: value.staffId }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAuthError(sessionError(error));
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectItem = (item: SelectorItem) => {
    play(item.cue);
    if (item.kind === "user" && session) return;
    setAuthError((current) => (current?.code === "invalid_local_login" ? null : current));
    setSelection((current) => {
      if (item.kind === "destination") return { ...current, appId: item.id };
      const userId = matchingUserId(item.id);
      return { ...current, userId: userId ?? current.userId };
    });
  };

  const clearSelection = () => {
    setSelection({ appId: null, userId: session?.staffId ?? null });
    setHoveredIndex(null);
    setPassword("");
    setLoading(false);
  };

  const continueToDestination = (app: NonNullable<typeof selectedApp>) => {
    play("success");
    if (app.comingSoon) {
      window.location.hash = app.route;
      setLoading(false);
      setPassword("");
      return;
    }
    window.location.assign(app.url);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedApp || !selectedUser || (!session && !password)) return;

    play("loading");
    setLoading(true);
    setAuthError(null);

    try {
      if (!session) {
        const value = await localLogin(selectedUser.id, password);
        setSession(value);
        setSelection((current) => ({ ...current, userId: value.staffId }));
      }

      window.setTimeout(() => continueToDestination(selectedApp), 650);
    } catch (error: unknown) {
      setAuthError(sessionError(error));
      setLoading(false);
    }
  };

  if (authLoading || blockedByAuth) {
    const visibleAuthError = authError ?? new SessionError(500, "session_request_failed", "Session request failed.");
    const accentStyle: AccentStyle = { "--accent": activeAccent };
    const title = authLoading ? "Memeriksa sesi" : visibleAuthError.status === 503 ? "Konfigurasi belum lengkap" : "Akses ditolak";
    const message = authLoading
      ? "Gateway sedang memvalidasi identitas."
      : visibleAuthError.message;

    return (
      <div className="relative min-h-screen w-full transition-colors duration-500" style={accentStyle}>
        <AnimatedBackground accent={activeAccent} dark={dark} />
        <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-4xl font-medium tracking-[-0.04em] sm:text-6xl"
              style={{ color: dark ? "#fff" : "#171717" }}
            >
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-sm" style={{ color: dark ? "rgba(255,255,255,.52)" : "rgba(0,0,0,.52)" }}>
              {message}
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  if (routeApp && session) {
    const accentStyle: AccentStyle = { "--accent": routeApp.accent };

    return (
      <div className="relative min-h-screen w-full" style={accentStyle}>
        <AnimatedBackground accent={routeApp.accent} dark={dark} />
        <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-5xl font-medium tracking-[-0.05em] sm:text-7xl"
              style={{ color: dark ? "#fff" : "#171717" }}
            >
              {routeApp.name}
            </h1>
            <p
              className="mt-3 text-sm"
              style={{ color: dark ? "rgba(255,255,255,.48)" : "rgba(0,0,0,.48)" }}
            >
              {routeApp.comingSoon ? "Segera hadir" : selectedUser?.name}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "";
                setRoute("/");
              }}
              className="mt-10 rounded-full border px-5 py-2 text-xs transition-colors"
              style={{
                color: dark ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.7)",
                borderColor: dark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.12)",
                background: dark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.24)",
              }}
            >
              Kembali
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  const accentStyle: AccentStyle = { "--accent": activeAccent };

  return (
    <div
      className="relative min-h-screen w-full transition-colors duration-500"
      style={accentStyle}
      onClick={clearSelection}
    >
      <AnimatedBackground accent={activeAccent} dark={dark} />
      <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} dark={dark} />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[470px]"
        >
          <ShapeGrid
            items={SELECTOR_ITEMS}
            hoveredIndex={hoveredIndex}
            selectedIndices={selectedIndices}
            onHover={setHoveredIndex}
            onSelect={selectItem}
            dark={dark}
          />

          <AnimatePresence mode="wait">
            {selectedApp && selectedUser && (
              <motion.div
                key={`${selectedApp.id}-${selectedUser.id}`}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 18 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <h1
                  className="text-center text-base font-medium tracking-tight transition-colors duration-500 sm:text-lg"
                  style={{ color: dark ? "#ffffff" : "#171717" }}
                >
                  {selectedUser.name},{" "}
                  <span style={{ color: dark ? "rgba(255,255,255,.42)" : "rgba(0,0,0,.4)" }}>
                    selamat datang
                  </span>
                </h1>

                <form onSubmit={submit} className="mx-auto mt-5 max-w-[240px] space-y-3">
                  {!session && (
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      autoFocus
                      required
                      className="gateway-input w-full rounded-xl px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-300"
                      style={{
                        border: `1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)"}`,
                        backgroundColor: dark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.34)",
                        color: dark ? "#fff" : "#171717",
                      }}
                    />
                  )}
                  {authError && localLoginAvailable && (
                    <p className="text-center text-xs" style={{ color: dark ? "rgba(255,255,255,.58)" : "rgba(0,0,0,.55)" }}>
                      {authError.message}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={loading || (!session && !password)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: dark ? "#000" : "#111" }}
                  >
                    {loading ? "Memuat..." : session ? "Buka" : "Masuk"}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}