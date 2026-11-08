import { useState, useEffect } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(Boolean(deferredPrompt));
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const check = () => {
      setCanPrompt(Boolean(deferredPrompt));
      const standalone =
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches;
      setIsStandalone(standalone);
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    };
    check();
    listeners.add(check);
    return () => {
      listeners.delete(check);
    };
  }, []);

  const triggerPrompt = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        setCanPrompt(false);
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  };

  return { canPrompt, isStandalone, isIOS, triggerPrompt };
}
