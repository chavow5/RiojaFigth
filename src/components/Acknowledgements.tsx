import {
  ArrowUpRight,
  Heart,
  Instagram,
  Linkedin,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { assetUrl } from "../asset-url";
import "../acknowledgements.css";

export function Acknowledgements() {
  return (
    <div className="acknowledgements-page">
      <header className="acknowledgements-header">
        <a
          className="acknowledgements-brand"
          href="/"
          aria-label="Caudillo Fight, inicio"
        >
          <img
            src={assetUrl("/assets/arena-icon.svg")}
            width="32"
            height="32"
            alt=""
          />
          <span>
            CAUDILLO <span>FIGHT</span>
          </span>
        </a>
        <a href="/" className="acknowledgements-back-btn">← Volver al juego</a>
      </header>

      <main className="acknowledgements-content">
        <div className="acknowledgements-event-badge">
          <Trophy size={18} aria-hidden="true" />
          <span>VIRTUAL JAM · LA RIOJA</span>
        </div>

        <h1>Agradecimientos y Créditos</h1>

        <p className="acknowledgements-intro">
          <strong>Caudillo Fight</strong> fue creado y diseñado especialmente
          para participar de la <strong>Virtual Jam en La Rioja</strong>.
          Diseñado por <strong>David Ramirez</strong> junto a{" "}
          <strong>Facundo Neira</strong> como parte del proyecto, este juego
          busca homenajear la cultura, la historia federal y los personajes más
          emblemáticos de nuestra querida provincia.
        </p>

        {/* Creador / Diseñador Section */}
        <section
          className="acknowledgements-creator-card"
          aria-labelledby="creator-heading"
        >
          <div className="acknowledgements-creator-header">
            <span className="creator-tag">DISEÑADOR & DESARROLLADOR</span>
            <h2 id="creator-heading">David Ramirez</h2>
            <p>
              Full Stack Web Developer & Creador de Caudillo Fight. La Rioja,
              Argentina.
            </p>
          </div>

          <a
            href="https://www.linkedin.com/in/david-ramirez-031015253/"
            target="_blank"
            rel="noopener noreferrer"
            className="acknowledgements-linkedin-preview"
            title="Ver perfil de David Ramirez en LinkedIn"
          >
            <img
              src={assetUrl("/assets/david-ramirez-linkedin.jpg")}
              alt="Perfil de LinkedIn de David Ramirez - Full Stack Web Developer"
              className="linkedin-banner-img"
            />
            <span className="linkedin-click-hint">
              <Linkedin size={16} /> Abrir perfil de LinkedIn{" "}
              <ArrowUpRight size={14} />
            </span>
          </a>

          <div className="acknowledgements-links-grid">
            <a
              href="https://www.linkedin.com/in/david-ramirez-031015253/"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-contact-pill linkedin-pill"
            >
              <Linkedin size={18} />
              <span>LinkedIn</span>
              <ArrowUpRight size={14} className="pill-arrow" />
            </a>

            <a
              href="https://www.instagram.com/davidramirez_651"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-contact-pill instagram-pill"
            >
              <Instagram size={18} />
              <span>@davidramirez_651</span>
              <ArrowUpRight size={14} className="pill-arrow" />
            </a>

            <a
              href="https://wa.me/5493804201334"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-contact-pill whatsapp-pill"
            >
              <MessageCircle size={18} />
              <span>WhatsApp: 3804201334</span>
              <ArrowUpRight size={14} className="pill-arrow" />
            </a>
          </div>
        </section>

        {/* Facundo Neira Section */}
        <section
          className="acknowledgements-collaborator-card"
          aria-labelledby="facundo-heading"
        >
          <div className="acknowledgements-creator-header">
            <span className="creator-tag">PARTE DEL PROYECTO</span>
            <h2 id="facundo-heading">Facundo Neira</h2>
            <p>
              Colaborador y parte del proyecto Caudillo Fight.
            </p>
          </div>

          <div className="acknowledgements-links-grid">
            <a
              href="https://www.linkedin.com/in/neira-facundo-dami%C3%A1n-003639243/"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-contact-pill linkedin-pill"
            >
              <Linkedin size={18} />
              <span>LinkedIn</span>
              <ArrowUpRight size={14} className="pill-arrow" />
            </a>
          </div>
        </section>

        {/* Kevin Bravo Section */}
        <section
          className="acknowledgements-kevin-card"
          aria-labelledby="kevin-heading"
        >
          <h2 id="kevin-heading">Kevin Bravo</h2>
          <p>
            Y al último, un agradecimiento muy especial a <strong>Kevin Bravo</strong> por
            su valioso desarrollo en pequeño y aporte técnico a la construcción
            del juego.
          </p>
        </section>

        <p className="acknowledgements-closing">
          <Heart size={19} aria-hidden="true" />
          Gracias a todos por apoyar y formar parte de Caudillo Fight.
        </p>
      </main>

      <footer className="acknowledgements-footer">
        Diseñado y desarrollado por{" "}
        <a
          href="https://www.linkedin.com/in/david-ramirez-031015253/"
          target="_blank"
          rel="noopener noreferrer"
        >
          David Ramirez
        </a>{" "}
        y{" "}
        <a
          href="https://www.linkedin.com/in/neira-facundo-dami%C3%A1n-003639243/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facu Neira
        </a>{" "}
        · La Rioja, Argentina
      </footer>
    </div>
  );
}
