import type { Ability } from "../../shared/content";
import type { PlayerState, Projectile } from "../../shared/engine";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const smooth = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function invoice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.roundRect(-13, -17, 26, 34, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -9);
  ctx.lineTo(7, -9);
  ctx.moveTo(-7, -3);
  ctx.lineTo(7, -3);
  ctx.moveTo(-7, 3);
  ctx.lineTo(1, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(5, 9, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-7, -5);
  ctx.lineTo(1, 0);
  ctx.lineTo(-7, 5);
  ctx.stroke();
  ctx.restore();
}

/** Draws the two projectile-shaped founder specials in projectile-local space. */
export function drawFounderProjectile(
  ctx: CanvasRenderingContext2D,
  shot: Projectile,
): boolean {
  const age = Math.max(0, shot.age ?? 0);
  ctx.save();
  switch (shot.kind) {
    case "ledger":
      ctx.lineWidth = 2;
      ctx.rotate(Math.sin(age / 11) * 0.04);
      invoice(ctx, 0, 0, 1);
      ctx.beginPath();
      ctx.moveTo(-10, -17);
      ctx.lineTo(-6, -12);
      ctx.stroke();
      break;
    case "settlement": {
      const returning = age >= (shot.returnAfter ?? Infinity);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 13, Math.sin(age / 12) * 0.08, -2.5, 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 22, -Math.sin(age / 12) * 0.08, 0.65, 5.55);
      ctx.stroke();
      arrowHead(ctx, returning ? -17 : 17, -10, returning ? 2.6 : -0.55);
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      ctx.restore();
      return false;
  }
  ctx.restore();
  return true;
}

/** Draws compact, world-space cues for the five fictional founder specials. */
export function drawFounderSpecial(
  ctx: CanvasRenderingContext2D,
  ability: Ability,
  p: PlayerState,
  other: PlayerState,
  progress: number,
): void {
  const x = p.x;
  const y = p.y;
  const facing = p.facing || 1;
  const t = Number.isFinite(progress) ? progress : 0;
  ctx.save();

  if (ability === "ledger") {
    const launch = smooth((t + 8) / 11);
    ctx.globalAlpha *= 0.82 * (1 - smooth((t - 4) / 12));
    invoice(ctx, x + facing * (22 + launch * 19), y - 102 - launch * 8, 0.72);
    invoice(ctx, x + facing * (36 + launch * 19), y - 90 - launch * 8, 0.58);
  } else if (ability === "settlement") {
    const returning = t >= 10;
    const direction = returning ? -facing : facing;
    const phase = clamp(
      t < 0 ? (t + 8) / 8 : (t - (returning ? 10 : 0)) / 18,
      0,
      1,
    );
    const loopX = x + direction * (38 + phase * 58);
    ctx.globalAlpha *= 0.72 * (1 - smooth((t - 31) / 13));
    ctx.beginPath();
    ctx.ellipse(loopX, y - 86, 22, 13, direction * 0.18, -2.7, 2.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(loopX, y - 86, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (ability === "ignition") {
    const active = 1 - smooth((t - 11) / 6);
    ctx.globalAlpha *= 0.78 * active;
    ctx.lineWidth = 3;
    for (let streak = 0; streak < 3; streak++) {
      const back = x - facing * (24 + streak * 17);
      const height = y - 24 - streak * 6;
      ctx.beginPath();
      ctx.moveTo(back, height);
      ctx.lineTo(back - facing * (24 + (2 - streak) * 6), height + 3);
      ctx.stroke();
    }
    for (let tire = 0; tire < 2; tire++) {
      const mark = x - facing * (21 + tire * 16);
      ctx.beginPath();
      ctx.moveTo(mark - 7, y - 3);
      ctx.lineTo(mark + 7, y - 3);
      ctx.stroke();
    }
  } else if (ability === "slash") {
    const fade = 1 - smooth((t - 8) / 12);
    ctx.globalAlpha *= 0.9 * fade;
    ctx.strokeStyle = "#ff874d";
    ctx.lineWidth = 7;
    const swipeX = x + facing * 62;
    const swipeY = y - 91;
    ctx.beginPath();
    ctx.moveTo(swipeX - facing * 31, swipeY + 34);
    ctx.lineTo(swipeX + facing * 31, swipeY - 34);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(swipeX - facing * 18, swipeY + 36);
    ctx.lineTo(swipeX + facing * 44, swipeY - 32);
    ctx.moveTo(swipeX - facing * 43, swipeY + 18);
    ctx.lineTo(swipeX + facing * 14, swipeY - 43);
    ctx.stroke();
  } else if (ability === "grid") {
    const reach = clamp(Math.abs(other.x - x), 0, 270);
    const tiles = clamp(Math.floor((t + 20) / 8) + 1, 1, 4);
    ctx.globalAlpha *= 0.65 * (1 - smooth((t - 29) / 18));
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x + facing * 28, y - 4);
    ctx.lineTo(x + facing * (28 + reach), y - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let tile = 0; tile < tiles; tile++) {
      const along = ((tile + 1) / 5) * Math.max(40, reach);
      const tileX = x + facing * (28 + along);
      ctx.strokeRect(tileX - 9, y - 16, 18, 18);
      ctx.beginPath();
      ctx.arc(tileX, y - 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ability === "spin") {
    // Barrido Municipal y remolino urbano de La Muni
    const sweepProgress = Math.min(1, p.attackTick / 20);
    // Swirling municipal blue (#0284c7) and reflective safety orange (#f97316) vortex
    ctx.lineWidth = 4;
    for (let ring = 0; ring < 3; ring++) {
      ctx.strokeStyle = ring % 2 === 0 ? "#f97316" : "#38bdf8";
      ctx.globalAlpha = Math.max(0, 0.8 - ring * 0.22 - sweepProgress * 0.2);
      const angle = (p.attackTick * 0.25 + ring * 1.9) % (Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(
        x + facing * ring * 14,
        y - 45 + ring * 6,
        34 + ring * 16,
        14 + ring * 5,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    // Cono de advertencia municipal (orange safety cone)
    const coneX = x + facing * (45 + sweepProgress * 30);
    const coneY = y - 10;
    ctx.fillStyle = "#ea580c";
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(coneX, coneY - 30);
    ctx.lineTo(coneX + 12, coneY);
    ctx.lineTo(coneX - 12, coneY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Reflective white band on cone
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(coneX - 5, coneY - 14);
    ctx.lineTo(coneX + 5, coneY - 14);
    ctx.lineTo(coneX + 8, coneY - 8);
    ctx.lineTo(coneX - 8, coneY - 8);
    ctx.closePath();
    ctx.fill();
  } else if (ability === "command") {
    // Pozo en el Asfalto y Cuadrilla del COE (El Coe)
    const digProgress = Math.min(1, p.attackTick / 18);
    const pitX = x + facing * (45 + digProgress * 25);
    const pitY = y - 6;

    // Asphalt trench crack
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pitX - 35, pitY);
    ctx.lineTo(pitX - 10, pitY + 8);
    ctx.lineTo(pitX + 15, pitY - 2);
    ctx.lineTo(pitX + 40, pitY + 6);
    ctx.stroke();

    // Trench dark interior
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(pitX, pitY + 3, 32, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red COE safety hazard perimeter
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(pitX, pitY + 2, 42, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flying asphalt chunks and rubble
    ctx.fillStyle = "#475569";
    for (let chunk = 0; chunk < 6; chunk++) {
      const chunkAge = (p.attackTick * 3 + chunk * 7) % 30;
      const cx = pitX + (chunk % 2 === 0 ? 1 : -1) * (chunkAge * 1.8 + chunk * 5);
      const cy = pitY - 10 - Math.sin(chunk * 1.5 + p.attackTick * 0.25) * 28 + chunkAge * 0.4;
      const size = Math.max(2, 5.5 - chunkAge * 0.12);
      ctx.globalAlpha = Math.max(0, 0.9 - chunkAge / 30);
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ability === "courier") {
    // Despliegue Rápido de Gestión Municipal (Armandito)
    const speedProgress = Math.min(1, p.attackTick / 15);
    // Glowing municipal blue rush trails
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3.5;
    for (let streak = 0; streak < 4; streak++) {
      const back = x - facing * (18 + streak * 22);
      const height = y - 25 - streak * 8;
      ctx.globalAlpha = Math.max(0, 0.85 - streak * 0.18 - speedProgress * 0.2);
      ctx.beginPath();
      ctx.moveTo(back, height);
      ctx.lineTo(back + facing * 40, height);
      ctx.stroke();
    }
    // Route waypoints
    ctx.fillStyle = "#60a5fa";
    for (let dot = 0; dot < 3; dot++) {
      const dotX = x + facing * (30 + dot * 35);
      ctx.globalAlpha = 0.7 - dot * 0.15;
      ctx.beginPath();
      ctx.arc(dotX, y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ability === "broadcast") {
    // Moción de Orden y Campanazo de la Cámara (Martincito)
    const bellProgress = Math.min(1, p.attackTick / 18);
    const front = x + facing * 48;
    // Resonating purple & gold parliamentary soundwaves
    ctx.lineWidth = 3;
    for (let ring = 0; ring < 3; ring++) {
      ctx.strokeStyle = ring % 2 === 0 ? "#8b5cf6" : "#fbbf24";
      ctx.globalAlpha = Math.max(0, 0.85 - ring * 0.22 - bellProgress * 0.2);
      ctx.beginPath();
      ctx.arc(front + ring * 12, y - 50, 24 + ring * 16 + p.attackTick * 1.2, -1.1, 1.1);
      ctx.stroke();
    }
    // Bronze bell / parliamentary symbol outline
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = Math.max(0, 0.9 - bellProgress * 0.3);
    ctx.beginPath();
    ctx.arc(front, y - 55, 9, Math.PI, 0);
    ctx.lineTo(front + 12, y - 42);
    ctx.lineTo(front - 12, y - 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
