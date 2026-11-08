import { useState } from "react";
import { Modal } from "./Modal";
import { usePwaInstall } from "../game/pwa-install";
import { Smartphone, Download, Share, PlusSquare, Check, Sparkles } from "lucide-react";
import "../install-modal.css";

export function InstallModal({ onClose }: { onClose: () => void }) {
  const { canPrompt, isStandalone, isIOS, triggerPrompt } = usePwaInstall();
  const [platform, setPlatform] = useState<"android" | "ios">(() =>
    isIOS ? "ios" : "android",
  );
  const [installedNotice, setInstalledNotice] = useState(false);

  const handleInstallClick = async () => {
    if (canPrompt) {
      const accepted = await triggerPrompt();
      if (accepted) {
        setInstalledNotice(true);
        setTimeout(onClose, 2500);
      }
    }
  };

  return (
    <Modal
      title="Acceso directo en celular"
      className="install-modal content-modal"
      onClose={onClose}
    >
      <div className="dialog-content install-content">
        <div className="install-hero">
          <div className="install-logo-wrapper">
            <img
              src="/assets/arena-icon-192.png"
              width="80"
              height="80"
              alt="Caudillo Fight Logo"
              className="install-logo"
            />
          </div>
          <div className="install-hero-text">
            <h3>CAUDILLO FIGHT</h3>
            <p>Juego de Pelea Criollo · La Rioja</p>
            <span className="install-badge">
              <Sparkles size={12} /> Acceso directo en pantalla de inicio
            </span>
          </div>
        </div>

        {installedNotice || isStandalone ? (
          <div className="install-success-banner" role="status">
            <Check size={20} />
            <div>
              <strong>¡Aplicación lista!</strong>
              <p>Ya tienes Caudillo Fight en la pantalla de inicio de tu celular.</p>
            </div>
          </div>
        ) : (
          <>
            {canPrompt && (
              <div className="install-action-block">
                <button
                  type="button"
                  className="install-primary-button"
                  onClick={handleInstallClick}
                >
                  <Download size={18} />
                  <span>Guardar en la pantalla de inicio</span>
                </button>
              </div>
            )}

            <div className="install-tabs" role="tablist" aria-label="Sistema operativo">
              <button
                type="button"
                role="tab"
                aria-selected={platform === "android"}
                className={platform === "android" ? "active" : ""}
                onClick={() => setPlatform("android")}
              >
                <Smartphone size={16} /> Android (Chrome / Edge)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={platform === "ios"}
                className={platform === "ios" ? "active" : ""}
                onClick={() => setPlatform("ios")}
              >
                <Share size={16} /> iPhone / iPad (Safari)
              </button>
            </div>

            <div className="install-steps">
              {platform === "android" ? (
                <ol className="install-instructions">
                  <li>
                    <span className="step-num">1</span>
                    <div>
                      <strong>Abre el menú del navegador</strong>
                      <p>Toca los tres puntos verticales <b>⋮</b> en la esquina superior o inferior derecha de Chrome o Edge.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <div>
                      <strong>Selecciona guardar o instalar</strong>
                      <p>Toca en <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <div>
                      <strong>¡Listo!</strong>
                      <p>Aparecerá el logo de Caudillo Fight en la pantalla de tu celular para jugar a pantalla completa cuando quieras.</p>
                    </div>
                  </li>
                </ol>
              ) : (
                <ol className="install-instructions">
                  <li>
                    <span className="step-num">1</span>
                    <div>
                      <strong>Toca el botón Compartir</strong>
                      <p>En Safari, toca el botón de compartir <Share size={14} className="inline-icon" /> (cuadrado con flecha hacia arriba en la barra inferior).</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <div>
                      <strong>Agregar a pantalla de inicio</strong>
                      <p>Desliza hacia abajo en las opciones y toca en <b><PlusSquare size={14} className="inline-icon" /> "Agregar a pantalla de inicio"</b>.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <div>
                      <strong>Confirmar</strong>
                      <p>Toca <b>"Agregar"</b> arriba a la derecha. ¡Listo! Se creará el acceso directo con el icono del juego.</p>
                    </div>
                  </li>
                </ol>
              )}
            </div>

            <div className="install-benefits">
              <h4>Ventajas del acceso directo:</h4>
              <ul>
                <li>⚡ <b>Pantalla completa:</b> Se ocultan las barras del navegador para más espacio de juego.</li>
                <li>🎮 <b>Acceso instantáneo:</b> Entra con un solo toque desde tu celular.</li>
                <li>🚀 <b>Rendimiento fluido:</b> Sin demoras ni descargas de tiendas de apps.</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="dialog-footer">
        <button type="button" className="dialog-done" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
