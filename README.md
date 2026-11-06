# 🥊 Rioja Fight

> *Juego de pelea arcade en 2D ambientado en los lugares más emblemáticos y la cultura de La Rioja, Argentina.*  
> Presentación oficial para la **Game Jam**.

---

## 🌟 Características

- 🎬 **Apertura cinemática:** Video de presentación animado de *"Coche Coche"* con reproducción automática.
- 🏛️ **Escenarios emblemáticos de La Rioja:**
  - 🏛️ **Catedral San Nicolás de Bari** (*Plaza 25 de Mayo*) — Noche iluminada en el corazón de la capital riojana.
  - 🏟️ **El Superdomo** (*Parque de la Ciudad*) — Combate bajo la majestuosa cúpula geodésica.
  - 🐎 **Monumento a Facundo Quiroga** (*Parque de las Juventudes*) — Frente a la estatua del *Tigre de los Llanos* y las montañas.
  - 🏫 **Escuela Normal / Calle Pelagio B. Luna** (*Centro Histórico*) — Atardecer tradicional por las veredas céntricas.
- 🇦🇷 **Detalles y regionalización:** Música, estética regional, modismos y el Sol de Mayo en las pantallas de victoria.
- 👥 **Múltiples formas de jugar:**
  - **Contra la CPU:** Ajustá la dificultad y entrená tus combos.
  - **2 Jugadores Local:** Compartí teclado con un amigo en la misma pantalla.
  - **Multijugador Online:** Creá salas públicas o privadas con enlace para invitar a tus rivales a distancia en tiempo real.
- 📱 **Soporte multiplataforma:** Controles para teclado, joystick/gamepad y pantalla táctil para dispositivos móviles.

---

## 🕹️ Controles

### Jugador 1 (Teclado)
- **Moverse:** `A` / `D`
- **Saltar / Doble salto:** `W`
- **Agacharse / Bajar plataforma:** `S`
- **Golpe Ligero:** `J`
- **Golpe Fuerte:** `K`
- **Ataque Especial:** `L`
- **Bloqueo:** `U`
- **Esquivar / Rodar:** `Shift Izq`
- **Técnica Definitiva:** `I` *(mantener 0.3s con barra cargada)*

---

## 🚀 Instalación y Ejecución Local

### Requisitos previos
- **Node.js 20+** o **Node.js 22+**
- **npm**

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/chavow5/RiojaFigth.git
   cd RiojaFigth
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Jugar:**
   Abrí tu navegador en [http://localhost:5173](http://localhost:5173).  
   *(Podés ingresar también desde tu celular conectándote a la IP local de tu computadora en el puerto 5173).*

---

## 🛠️ Tecnologías

- **Frontend:** React 19, TypeScript, HTML5 Canvas 2D para renderizado a 60 FPS, CSS animado.
- **Backend & Red:** Node.js, Express, WebSockets (`ws`) para sincronización determinista de estados y física entre jugadores.
- **Bundler & Tooling:** Vite, Sharp para compresión de texturas y fondos, TSX.

---

## 📜 Licencia y Créditos

- Adaptación, escenarios riojanos y producción artística desarrollada para la Game Jam por **chavow5**.
- Código base bajo licencia [GPL-3.0](LICENSE).
