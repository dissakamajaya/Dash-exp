import type { ReactNode } from "react";

/** One row for every gateway control so they share placement, size and style. */
export default function TopBar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-start justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="min-w-0">{left}</div>
      <div className="ctl-group shrink-0">{right}</div>
    </div>
  );
}
