import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const standaloneQuery = '(display-mode: standalone)';

function InstallControl() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const media = window.matchMedia(standaloneQuery);
    const updateStandalone = () => setStandalone(media.matches || Boolean((navigator as NavigatorWithStandalone).standalone));
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setShowIOSHelp(false);
      setStandalone(true);
    };

    updateStandalone();
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    media.addEventListener('change', updateStandalone);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      media.removeEventListener('change', updateStandalone);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (standalone || (!installPrompt && !isIOS)) return null;

  return <>
    <button className="install-button" onClick={installPrompt ? install : () => setShowIOSHelp(true)}>
      <Download aria-hidden="true"/><span>Install App</span>
    </button>
    {showIOSHelp && <div className="pwa-dialog-backdrop" role="presentation" onClick={() => setShowIOSHelp(false)}>
      <section className="pwa-dialog" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onClick={event => event.stopPropagation()}>
        <button className="pwa-close" aria-label="Close installation help" onClick={() => setShowIOSHelp(false)}><X/></button>
        <div className="pwa-dialog-icon"><Share/></div>
        <h2 id="ios-install-title">Install ECP172 Exam Prep</h2>
        <p>Open this site in Safari, tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</p>
        <button className="primary" onClick={() => setShowIOSHelp(false)}>Got it</button>
      </section>
    </div>}
  </>;
}

function UpdateNotice() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [snoozed, setSnoozed] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, currentRegistration) {
      registration.current = currentRegistration;
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    const checkForUpdate = () => registration.current?.update();
    const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
    const onVisibilityChange = () => document.visibilityState === 'visible' && checkForUpdate();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!snoozed) return;
    const reminder = window.setTimeout(() => setSnoozed(false), 30 * 60 * 1000);
    return () => window.clearTimeout(reminder);
  }, [snoozed]);

  if (!offlineReady && (!needRefresh || snoozed)) return null;

  return <aside className="pwa-notice" aria-live="polite">
    <div className="pwa-notice-mark"><RefreshCw/></div>
    <div>
      <b>{needRefresh ? 'New version available' : 'Ready for offline study'}</b>
      <p>{needRefresh ? 'Update when you have finished your current answer.' : 'This study app can now open without a connection.'}</p>
      {needRefresh
        ? <div className="pwa-notice-actions"><button className="primary" onClick={() => updateServiceWorker(true)}>Update now</button><button onClick={() => setSnoozed(true)}>Later</button></div>
        : <button onClick={() => setOfflineReady(false)}>Dismiss</button>}
    </div>
  </aside>;
}

export function PWAControls() {
  return <><InstallControl/><UpdateNotice/></>;
}
