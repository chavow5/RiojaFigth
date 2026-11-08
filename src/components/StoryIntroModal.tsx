import { useRef, useState } from "react";
import { assetUrl } from "../asset-url";

interface StoryIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartStory?: () => void;
}

export function StoryIntroModal({
  isOpen,
  onClose,
  onStartStory,
}: StoryIntroModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Could not play video automatically:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  const handleStart = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (onStartStory) {
      onStartStory();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="story-intro-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-intro-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="story-intro-card">
        <header className="story-intro-header">
          <div className="story-intro-title-group">
            <span className="story-intro-kicker">PRÓLOGO OFICIAL</span>
            <h2 id="story-intro-title">El Camino del Caudillo</h2>
          </div>
          <button
            className="story-intro-close"
            onClick={handleClose}
            aria-label="Cerrar prólogo"
          >
            ×
          </button>
        </header>

        <div className="story-intro-body">
          {/* Video Player Section */}
          <div className="story-intro-video-wrapper">
            <video
              ref={videoRef}
              src={assetUrl("/assets/chacho-historia-intro.mp4")}
              controls={isPlaying}
              playsInline
              preload="metadata"
              className="story-intro-video"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
            />

            {!isPlaying && !hasError && (
              <div
                className="story-intro-video-overlay"
                onClick={handlePlayClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handlePlayClick();
                }}
                aria-label="Reproducir video de la historia"
              >
                <div className="story-intro-play-btn">
                  <svg
                    viewBox="0 0 24 24"
                    width="44"
                    height="44"
                    fill="currentColor"
                  >
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </div>
                <span className="story-intro-play-label">
                  Toca para reproducir el video con audio
                </span>
                <span className="story-intro-play-sub">
                  El prócer indiscutido de La Rioja: Ángel Vicente "El Chacho" Peñaloza
                </span>
              </div>
            )}

            {hasError && (
              <div className="story-intro-video-fallback">
                <span>No se pudo cargar el video de introducción.</span>
              </div>
            )}
          </div>

          {/* Story Narrative Section */}
          <div className="story-intro-narrative">
            <div className="story-intro-section">
              <h3>La Leyenda del Chacho Peñaloza</h3>
              <p>
                En las tierras de La Rioja no hay discusión: el prócer indiscutido y
                máximo símbolo del coraje federal es <strong>Ángel Vicente "El Chacho" Peñaloza</strong>,
                el caudillo inmortal que cabalga en la memoria de los llanos.
              </p>
            </div>

            <div className="story-intro-section highlight">
              <h3>La Misión de Armandito Molina</h3>
              <p>
                <strong>Armandito Molina</strong> inicia su desafío supremo: consagrarse
                como el nuevo gran caudillo riojano. Para ganarse el respeto del pueblo,
                debe subirse a la arena y enfrentarse uno por uno a los personajes más
                fuertes y emblemáticos de toda la provincia.
              </p>
            </div>

            <div className="story-intro-ladder-summary">
              <h4>El Camino hacia la Gloria (10 Niveles):</h4>
              <ol className="story-intro-ladder-steps">
                <li><span className="step-num">1</span> <strong>El COE</strong>: Pozos de asfalto y barricadas</li>
                <li><span className="step-num">2</span> <strong>Coché Coché</strong>: Humor pícaro y fintas</li>
                <li><span className="step-num">3</span> <strong>Josué Portugal</strong>: La cumbre del Famatina</li>
                <li><span className="step-num">4</span> <strong>La Muni</strong>: Barrido urbano y conos</li>
                <li><span className="step-num">5</span> <strong>El Gallo</strong>: Chaya, albahaca y coplas</li>
                <li><span className="step-num">6</span> <strong>Martín Menem</strong>: Campanazo parlamentario</li>
                <li><span className="step-num">7</span> <strong>La Teresita</strong>: La voz carismática del pueblo</li>
                <li><span className="step-num">8</span> <strong>Felipe Álvarez</strong>: Táctica y oposición</li>
                <li><span className="step-num">9</span> <strong>Bigote</strong>: Picardía y vieja escuela</li>
                <li className="final-step"><span className="step-num">★</span> <strong>El Chacho</strong>: ¡La batalla final por el caudillismo!</li>
              </ol>
            </div>
          </div>
        </div>

        <footer className="story-intro-footer">
          <button className="secondary-button" onClick={handleClose}>
            Omitir e ir al menú
          </button>
          <button className="primary-button story-intro-start-btn" onClick={handleStart}>
            ¡Comenzar Historia con Armandito! →
          </button>
        </footer>
      </div>
    </div>
  );
}
