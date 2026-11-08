import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "../asset-url";
import "../arena-entrance.css";

export function ArenaEntrance({
  ready,
  fontsReady,
  displayFontReady = true,
  onComplete,
  onRetry,
}: {
  ready: boolean;
  fontsReady: boolean;
  displayFontReady?: boolean;
  onComplete: (restoreFocus: boolean) => void;
  onRetry?: () => void;
}) {
  const entrance = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [introPlayed, setIntroPlayed] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const playing = fontsReady && (artReady || reducedMotion);
  const leaving = ready && fontsReady && introPlayed;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Mobile Safari & Chrome require DOM property muting before play()
    v.defaultMuted = true;
    v.muted = true;
    v.setAttribute("playsinline", "true");
    v.setAttribute("webkit-playsinline", "true");

    const startPlayback = () => {
      v.play()
        .then(() => {
          setArtReady(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          // Mobile browser low-power mode or autoplay policy blocked playback
          setAutoplayBlocked(true);
        });
    };

    startPlayback();

    const handleFirstTouch = () => {
      if (v.paused) {
        v.play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => {});
      }
    };

    window.addEventListener("touchstart", handleFirstTouch, { once: true, passive: true });
    window.addEventListener("click", handleFirstTouch, { once: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", handleFirstTouch);
      window.removeEventListener("click", handleFirstTouch);
    };
  }, []);

  useEffect(() => {
    if (artReady) return;
    // A slow or missing illustration must never hold the loading screen open.
    const timer = window.setTimeout(() => setArtReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [artReady]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    update();
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setIntroPlayed(true),
      reducedMotion ? 0 : 9500,
    );
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion]);

  useEffect(() => {
    const skip = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !ready || !fontsReady || leaving) return;
      event.preventDefault();
      setIntroPlayed(true);
    };
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [ready, fontsReady, leaving]);

  useEffect(() => {
    if (!leaving) return;
    // Completion cannot depend on CSS events: reduced motion disables animations.
    const timer = window.setTimeout(
      () => {
        onComplete(Boolean(entrance.current?.contains(document.activeElement)));
      },
      reducedMotion ? 0 : 360,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, onComplete, reducedMotion]);

  return (
    <div
      ref={entrance}
      className={`arena-entrance ${playing ? "is-playing" : "is-preparing"}${fontsReady ? "" : " is-loading-fonts"}${displayFontReady ? "" : " has-fallback-display"}${leaving ? " is-leaving" : ""}`}
    >
      <div
        className="rioja-entrance-stage"
        aria-hidden="true"
        onClick={() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setAutoplayBlocked(false);
          }
        }}
      >
        <video
          ref={videoRef}
          src={assetUrl("/assets/rioja-fight-intro.mp4")}
          poster={assetUrl("/assets/coche-entrance-poster.webp")}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="rioja-entrance-poster"
          onPlay={() => {
            setArtReady(true);
            setAutoplayBlocked(false);
          }}
          onLoadedData={() => setArtReady(true)}
          onEnded={() => setIntroPlayed(true)}
        />
        {autoplayBlocked && !introPlayed && (
          <div className="rioja-entrance-play-prompt">
            <span className="rioja-entrance-play-icon">▶</span>
            <span>Toca para ver la entrada de Coché Coché</span>
          </div>
        )}
      </div>
      <div className="arena-entrance-exit-slash" aria-hidden="true" />
      <div className="arena-entrance-footer">
        <p className="arena-entrance-status" role="status">
          {onRetry
            ? "No pudimos abrir la arena."
            : ready
              ? "Entrando a la arena…"
              : "Abriendo la arena…"}
        </p>
        <button
          type="button"
          className="arena-entrance-skip"
          disabled={!fontsReady || (!ready && !onRetry)}
          aria-disabled={leaving || undefined}
          onClick={() => {
            if (onRetry) {
              onRetry();
              return;
            }
            if (!leaving) setIntroPlayed(true);
          }}
        >
          {onRetry ? "Reintentar" : "Saltar intro"}{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
