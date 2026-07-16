import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { play } from "cuelume";
import AnimatedBackground from "@/components/AnimatedBackground";
import ShapeGrid from "@/components/ShapeGrid";
import SoundToggle from "@/components/SoundToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useCuelume } from "@/hooks/useCuelume";
import {
  DESTINATIONS,
  SELECTOR_ITEMS,
  STORAGE_KEY,
  USERS,
  type SelectorItem,
} from "@/data/gateway";

const DEFAULT_ACCENT = "#818cf8";

type SavedSelection = {
  appId: string | null;
  userId: string | null;
};

function loadSelection(): SavedSelection {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { appId: null, userId: null };
    const saved = JSON.parse(value) as SavedSelection;
    return {
      appId: DESTINATIONS.some((item) => item.id === saved.appId) ? saved.appId : null,
      userId: USERS.some((item) => item.id === saved.userId) ? saved.userId : null,
    };
  } catch {
    return { appId: null, userId: null };
  }
}

function readRoute() {
  return window.location.hash.slice(1).split("?")[0] || "/";
}

export default function App() {
  const { soundEnabled, toggleSound } = useCuelume();
  const [dark, setDark] = useState(true);
  const [selection, setSelection] = useState<SavedSelection>(loadSelection);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(readRoute);

  const selectedApp = DESTINATIONS.find((item) => item.id === selection.appId) ?? null;
  const selectedUser = USERS.find((item) => item.id === selection.userId) ?? null;
  const routeApp = DESTINATIONS.find((item) => item.route === route) ?? null;
  const hoveredItem = SELECTOR_ITEMS.find((item) => item.shapeIndex === hoveredIndex);
  const activeAccent = hoveredItem?.accent ?? selectedApp?.accent ?? selectedUser?.accent ?? DEFAULT_ACCENT;
  const selectedIndices = [selectedApp?.shapeIndex, selectedUser?.shapeIndex].filter(
    (value): value is number => value !== undefined,
  );

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

  const selectItem = (item: SelectorItem) => {
    play(item.cue);
    setSelection((current) =>
      item.kind === "destination"
        ? { ...current, appId: item.id }
        : { ...current, userId: item.id },
    );
  };

  const clearSelection = () => {
    setSelection({ appId: null, userId: null });
    setHoveredIndex(null);
    setPassword("");
    setLoading(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedApp || !selectedUser || !password) return;

    play("loading");
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Redirect is not blocked if storage is unavailable.
    }

    window.setTimeout(() => {
      play("success");
      if (selectedApp.comingSoon) {
        window.location.hash = `${selectedApp.route}?user=${selectedUser.id}`;
        setLoading(false);
        setPassword("");
        return;
      }
      // TODO(auth): exchange password for a session token before redirecting,
      // so the target app skips its own login page.
      const target = new URL(selectedApp.url);
      target.searchParams.set("gateway_user", selectedUser.id);
      window.location.assign(target.toString());
    }, 650);
  };

  if (routeApp) {
    const query = window.location.hash.split("?")[1] ?? "";
    const routedUserId = new URLSearchParams(query).get("user");
    const routedUser = USERS.find((item) => item.id === routedUserId) ?? selectedUser;

    return (
      <div className="relative min-h-screen w-full" style={{ ["--accent" as string]: routeApp.accent }}>
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
              {routeApp.comingSoon ? "Segera hadir" : routedUser?.name}
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

  return (
    <div
      className="relative min-h-screen w-full transition-colors duration-500"
      style={{ ["--accent" as string]: activeAccent }}
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
            {!(selectedApp && selectedUser) && (
              <motion.p
                key={selectedApp ? "pick-user" : selectedUser ? "pick-app" : "pick-both"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="mt-5 text-center text-xs tracking-wide"
                style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.42)" }}
              >
                {selectedApp
                  ? "Sekarang pilih siapa kamu"
                  : selectedUser
                    ? "Sekarang pilih aplikasi tujuan"
                    : "Pilih aplikasi & siapa kamu untuk masuk"}
              </motion.p>
            )}
          </AnimatePresence>

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
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: dark ? "#000" : "#111" }}
                  >
                    {loading ? "Memuat..." : "Masuk"}
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