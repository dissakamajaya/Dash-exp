import type { Session } from "@/lib/session";

type Props = {
  session: Session | null;
  status: "checking" | "active" | "signed-out" | "unavailable";
  dark: boolean;
  localAuth: boolean;
  onCheck: () => void;
  onLogout: () => void;
};

export default function SessionMonitor({ session, status, dark, localAuth, onCheck, onLogout }: Props) {
  const color = dark ? "rgba(255,255,255,.72)" : "rgba(0,0,0,.66)";
  const border = dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.1)";
  const background = dark ? "rgba(20,20,20,.58)" : "rgba(255,255,255,.58)";
  const label = status === "checking"
    ? "Memeriksa sesi"
    : status === "active" && session
      ? `Aktif · ${session.name}`
      : status === "unavailable"
        ? "Status tidak tersedia"
        : "Belum masuk";

  return (
    <div
      className="fixed left-5 top-5 z-50 flex max-w-[calc(100vw-6rem)] items-center gap-1 rounded-full border px-2 py-1.5 text-[11px] shadow-sm backdrop-blur-lg sm:left-6"
      style={{ color, borderColor: border, backgroundColor: background }}
      aria-live="polite"
      aria-label={`Status sesi: ${label}`}
    >
      <span className={`mx-1 size-1.5 shrink-0 rounded-full ${status === "active" ? "bg-emerald-500" : status === "unavailable" ? "bg-amber-500" : "bg-neutral-400"}`} />
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onCheck(); }}
        disabled={status === "checking"}
        className="ml-1 rounded-full px-2 py-1 transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        aria-label="Periksa sesi sekarang"
        title="Periksa sesi sekarang"
      >
        ↻
      </button>
      {session && (localAuth ? (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onLogout(); }}
          className="rounded-full px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Keluar"
          title="Keluar"
        >
          Keluar
        </button>
      ) : (
        <a
          href="/cdn-cgi/access/logout"
          onClick={(event) => event.stopPropagation()}
          className="rounded-full px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Keluar dari semua aplikasi"
          title="Keluar dari semua aplikasi"
        >
          Keluar
        </a>
      ))}
    </div>
  );
}
