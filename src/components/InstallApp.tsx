import { useEffect, useRef, useState } from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const sync = () => setInstalled(standalone.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    sync();
    standalone.addEventListener('change', sync);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      standalone.removeEventListener('change', sync);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  if (installed) return null;

  const install = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      // Native install prompts can only be used once, including after dismissal.
      setPrompt(null);
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={panel} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="ctl max-sm:ctl-icon" aria-expanded={open} aria-label="Pasang aplikasi" onClick={() => setOpen((value) => !value)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        <span className="hidden sm:inline">Pasang</span>
      </button>
      {open && (
        <div className="ctl-panel" role="dialog" aria-label="Cara pasang">
          {prompt && (
            <button type="button" className="ctl" onClick={install} disabled={busy}>
              {busy ? 'Membuka…' : 'Pasang aplikasi'}
            </button>
          )}
          <p>iPhone/iPad: buka di Safari, pilih Bagikan → Tambah ke Layar Utama.</p>
          <p>Android/desktop: buka menu browser, pilih Instal aplikasi atau Tambahkan ke layar utama.</p>
          <p>EXP membuka aplikasi lain di browser. Koneksi internet diperlukan.</p>
        </div>
      )}
    </div>
  );
}
