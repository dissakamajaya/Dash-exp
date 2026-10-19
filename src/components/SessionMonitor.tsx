import type { Session } from "@/lib/session";

type Props = {
  session: Session | null;
  status: "checking" | "active" | "signed-out" | "unavailable";
  localAuth: boolean;
  onCheck: () => void;
  onLogout: () => void;
};

export default function SessionMonitor({ session, status, localAuth, onCheck, onLogout }: Props) {
  const label = status === "checking"
    ? "Memeriksa sesi"
    : status === "active" && session
      ? session.name
      : status === "unavailable"
        ? "Status tidak tersedia"
        : "Belum masuk";
  const dot = status === "active" ? "bg-emerald-500" : status === "unavailable" ? "bg-amber-500" : "bg-neutral-400";
  const signOut = (
    <>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      <span className="hidden sm:inline">Keluar</span>
    </>
  );

  return (
    <div className="ctl-group" aria-live="polite" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={onCheck}
        disabled={status === "checking"}
        className="ctl max-w-[9rem] sm:max-w-[13rem]"
        aria-label={`Status sesi: ${label}. Periksa sesi sekarang`}
        title="Periksa sesi sekarang"
      >
        <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
      {session && (localAuth ? (
        <button type="button" onClick={onLogout} className="ctl max-sm:ctl-icon" aria-label="Keluar" title="Keluar">
          {signOut}
        </button>
      ) : (
        <a href="/cdn-cgi/access/logout" className="ctl max-sm:ctl-icon" aria-label="Keluar dari semua aplikasi" title="Keluar dari semua aplikasi">
          {signOut}
        </a>
      ))}
    </div>
  );
}
