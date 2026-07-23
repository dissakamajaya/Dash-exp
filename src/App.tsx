import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { play } from "cuelume";
import AnimatedBackground from "@/components/AnimatedBackground";
import Asciify from "@/components/Asciify";
import ShapeGrid from "@/components/ShapeGrid";
import SoundToggle from "@/components/SoundToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useCuelume } from "@/hooks/useCuelume";
import { getSession, localLogin, SessionError, type Session } from "@/lib/session";
import {
  DESTINATIONS,
  STORAGE_KEY,
  USERS,
  type Destination,
} from "@/data/gateway";
import { EASE_OUT, DURATION } from "@/lib/motion";


const DEFAULT_ACCENT = "#6075eb";

function accentToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

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

export function persistSelection(selection: SavedSelection, session: Session | null): void {
  if (!session) return;
  try {
    if (!selection.appId && !selection.userId) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // The gateway still works when storage is unavailable.
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
  const [dark, setDark] = useState(false);
  const [selection, setSelection] = useState<SavedSelection>({ appId: null, userId: null });
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<SessionError | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(readRoute);

  const selectedApp = DESTINATIONS.find((item) => item.id === selection.appId) ?? null;
  const serverUser = session ? (USERS.find((item) => item.id === session.staffId) ?? null) : null;
  const selectedUser = serverUser ?? USERS.find((item) => item.id === selection.userId) ?? null;
  const loginUser = selectedUser ?? USERS[0];
  const routeApp = DESTINATIONS.find((item) => item.route === route) ?? null;
  const hoveredItem = DESTINATIONS.find((item) => item.shapeIndex === hoveredIndex);

  const activeAccent = hoveredItem?.accent ?? selectedApp?.accent ?? selectedUser?.accent ?? DEFAULT_ACCENT;
  const accentRgb = useMemo(() => accentToRgb(activeAccent), [activeAccent]);
  const selectedIndices = [selectedApp?.shapeIndex, selectedUser?.shapeIndex].filter(
    (value): value is string => value !== undefined,
  );
  const localLoginAvailable = shouldOfferLocalLogin(window.location.hostname, session, authError);
  const blockedByAuth = !authLoading && !session && authError && !localLoginAvailable;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    persistSelection(selection, session);
  }, [selection, session]);

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
        const saved = loadSelection();
        setSelection({ ...saved, userId: value.staffId });
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

  const selectItem = (item: Destination) => {
    play(item.cue);
    setAuthError((current) => (current?.code === "invalid_local_login" ? null : current));
    setSelection((current) => ({ ...current, appId: item.id }));
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
    window.open(app.url, "_blank");
    setLoading(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedApp || !loginUser || (!session && !password)) return;

    play("loading");
    setLoading(true);
    setAuthError(null);

    try {
      if (!session) {
        const value = await localLogin(loginUser.id, password);
        setSession(value);
        setSelection((current) => ({ ...current, userId: value.staffId }));
      }

      continueToDestination(selectedApp!);
    } catch (error: unknown) {
      setAuthError(sessionError(error));
      setLoading(false);
    }
  };

  if (authLoading || (blockedByAuth && !routeApp?.comingSoon)) {
    const visibleAuthError = authError ?? new SessionError(500, "session_request_failed", "Session request failed.");
    const accentStyle: AccentStyle = { "--accent": activeAccent };
    const title = authLoading ? "Memeriksa sesi" : visibleAuthError.status === 503 ? "Konfigurasi belum lengkap" : "Akses ditolak";
    const message = authLoading
      ? "Gateway sedang memvalidasi identitas."
      : visibleAuthError.message;

    return (
      <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh w-full transition-colors duration-500" style={accentStyle}>
        <AnimatedBackground accent={activeAccent} dark={dark} />
        <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
        <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 text-center">
          <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.medium, ease: EASE_OUT }}
          >
            <h1
              className="text-balance text-4xl font-medium sm:text-6xl"
              style={{ color: dark ? "#fff" : "#171717" }}
            >
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-pretty text-sm" style={{ color: dark ? "rgba(255,255,255,.52)" : "rgba(0,0,0,.52)" }}>
              {message}
            </p>
          </motion.div>
        </main>
      </div>
      </MotionConfig>
    );
  }

  if (routeApp && (session || routeApp.comingSoon)) {
    const accentStyle: AccentStyle = { "--accent": routeApp.accent };

    return (
      <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh w-full" style={accentStyle}>
        <AnimatedBackground accent={routeApp.accent} dark={dark} />
        <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
        <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          >
            <h1
              className="text-balance text-5xl font-medium sm:text-7xl"
              style={{ color: dark ? "#fff" : "#171717" }}
            >
              {routeApp.name}
            </h1>
            <p
              className="mt-3 text-pretty text-sm"
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
      </MotionConfig>
    );
  }

  const accentStyle: AccentStyle = { "--accent": activeAccent };

  return (
      <MotionConfig reducedMotion="user">
      <div
        className="relative min-h-dvh w-full transition-colors duration-500"
        style={accentStyle}
      onClick={clearSelection}
    >
      <AnimatedBackground accent={activeAccent} dark={dark} />
      <ThemeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} dark={dark} />

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.medium, ease: EASE_OUT }}
          className="w-full max-w-[470px] lg:max-w-[1200px]"
        >
          <Asciify
            radius={0.18}
            scale={3}
            spacing={1}
            charset="blocks"
            softness={0.7}
            followSpeed={4}
            background={accentRgb}
            style={{ borderRadius: 24, overflow: "hidden" }}
          >
            <ShapeGrid
              items={DESTINATIONS}
              hoveredIndex={hoveredIndex}
              selectedIndices={selectedIndices}
              onHover={setHoveredIndex}
              onSelect={selectItem}
              dark={dark}
            />
          </Asciify>


          <AnimatePresence mode="popLayout">
            {!(selectedApp && (selectedUser || localLoginAvailable)) && (
              <motion.p
                key={selectedApp ? "pending-user" : "pick-app"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DURATION.medium, ease: EASE_OUT }}
                className="mt-14 text-center text-pretty text-xs sm:mt-20"
                style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.42)" }}
              >
                {selectedApp ? "Sesi staf diperlukan untuk melanjutkan" : "Pilih aplikasi tujuan untuk masuk"}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {selectedApp && (selectedUser || localLoginAvailable) && (
              <motion.div
                key={`${selectedApp.id}-${loginUser.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: DURATION.medium, ease: EASE_OUT }}
                className="mt-14 sm:mt-20"
                onClick={(event) => event.stopPropagation()}
              >
                <form onSubmit={submit} className="mx-auto max-w-[320px] space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <h1
                      className="text-balance text-center text-base font-medium transition-colors duration-500 sm:text-lg"
                      style={{ color: dark ? "#ffffff" : "#171717" }}
                    >
                      {selectedApp.name}
                    </h1>
                    <motion.button
                      type="submit"
                      disabled={loading || (!session && !password)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      aria-label={loading ? "Memuat" : session ? `Buka ${selectedApp.name}` : "Masuk"}
                      className={
                        session
                          ? "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-60"
                          : "shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                      }
                      style={
                        session
                          ? {
                              borderColor: dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)",
                              backgroundColor: dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)",
                              color: dark ? "#fff" : "#171717",
                            }
                          : { backgroundColor: dark ? "#000" : "#111" }
                      }
                    >
                      {session ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M5 12h13M13 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : loading ? (
                        "Memuat..."
                      ) : (
                        "Masuk"
                      )}
                    </motion.button>
                  </div>
                  {!session && (
                    <label className="block text-left text-xs" style={{ color: dark ? "rgba(255,255,255,.58)" : "rgba(0,0,0,.55)" }}>
                      <span className="sr-only">Pilih staf</span>
                      <select
                        value={selectedUser?.id ?? loginUser.id}
                        onChange={(event) => setSelection((current) => ({ ...current, userId: matchingUserId(event.target.value) }))}
                        className="gateway-input w-full rounded-xl px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-colors duration-300"
                        style={{
                          border: `1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)"}`,
                          backgroundColor: dark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.34)",
                          color: dark ? "#fff" : "#171717",
                        }}
                      >
                        {USERS.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                      </select>
                    </label>
                  )}
                  {!session && (
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Kata sandi"
                      autoFocus
                      required
                      className="gateway-input w-full rounded-xl px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-colors duration-300"
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
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
    </MotionConfig>
  );
}