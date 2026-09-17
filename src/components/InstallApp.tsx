import { useEffect, useRef, useState } from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);

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

  if (installed) return null;

  const install = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      if (details.current) details.current.open = true;
    } finally {
      // Native install prompts can only be used once, including after dismissal.
      setPrompt(null);
      setBusy(false);
    }
  };

  return (
    <aside className="install-app" aria-label="Pasang aplikasi" onClick={(event) => event.stopPropagation()}>
      {prompt && <button type="button" onClick={install} disabled={busy}>
        {busy ? 'Membuka…' : 'Pasang aplikasi'}
      </button>}
      <details ref={details}>
        <summary>{prompt ? 'Cara pasang' : 'Pasang aplikasi'}</summary>
        <div className="install-help">
          <p>iPhone/iPad: buka di Safari, pilih Bagikan → Tambah ke Layar Utama.</p>
          <p>Android/desktop: buka menu browser, pilih Instal aplikasi atau Tambahkan ke layar utama jika tersedia.</p>
          <p>EXP membuka aplikasi lain di browser. Koneksi internet diperlukan.</p>
        </div>
      </details>
    </aside>
  );
}
