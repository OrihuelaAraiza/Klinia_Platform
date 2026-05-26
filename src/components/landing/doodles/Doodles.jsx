/**
 * Doodles reutilizables — colección de garabatos vectoriales tipo hand-drawn /
 * corporate-memphis para esparcir por la landing. Cada componente recibe
 * `color`, `size` y `style` para posicionarse libremente.
 *
 * Todas las formas usan trazo de ~2.4-3px con linecap="round" y linejoin="round"
 * para sentirse dibujadas con marcador / crayón.
 */

export function Asterisk({ color = "#1A1A1A", size = 28, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M16 5v22M5.5 10.5l21 11M5.5 21.5l21-11"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Squiggle({ color = "#1A1A1A", size = 56, style }) {
  return (
    <svg
      width={size}
      height={size * 0.35}
      viewBox="0 0 80 28"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M3 14C8 4 13 24 18 14S28 4 33 14s10 10 15 0 10-10 15 0 10 10 14 0"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ color = "#1A1A1A", size = 32, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M16 3c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Dots({ color = "#1A1A1A", size = 60, style }) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 60 30"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <circle cx="5" cy="20" r="2.5" fill={color} />
      <circle cx="15" cy="10" r="2.5" fill={color} />
      <circle cx="26" cy="22" r="2.5" fill={color} />
      <circle cx="38" cy="8" r="2.5" fill={color} />
      <circle cx="50" cy="18" r="2.5" fill={color} />
    </svg>
  );
}

export function Zigzag({ color = "#1A1A1A", size = 60, style }) {
  return (
    <svg
      width={size}
      height={size * 0.35}
      viewBox="0 0 80 28"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M3 22 12 6l10 16 10-16 10 16 10-16 10 16 11-16"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heart({ color = "#FF5C7C", stroke = "#1A1A1A", size = 36, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M18 30s-12-7-12-15a7 7 0 0 1 12-5 7 7 0 0 1 12 5c0 8-12 15-12 15Z"
        fill={color}
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarBurst({ color = "#FFC93C", stroke = "#1A1A1A", size = 56, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M28 4 32 20l16-2-12 12 12 12-16-2-4 16-4-16-16 2 12-12L8 18l16 2Z"
        fill={color}
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Blob orgánico relleno — útil como mancha de fondo detrás de cards. */
export function Blob({ color = "#FFD972", size = 220, variant = "a", style }) {
  const path =
    variant === "b"
      ? "M167 33c20 22 30 53 16 81-13 27-49 51-78 49-30-1-53-26-65-58S26 38 51 22s96-11 116 11Z"
      : variant === "c"
      ? "M48 31c20-22 60-30 92-13 31 17 55 60 41 95-15 35-66 51-104 33-37-18-49-93-29-115Z"
      : "M37 53c4-28 41-49 75-44s73 31 76 64-25 71-65 73c-39 1-90-65-86-93Z";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path d={path} fill={color} />
    </svg>
  );
}

/** Nube tipo dibujo de niño: contorno hand-drawn, relleno blanco/pastel. */
export function Cloud({ fill = "#FFFFFF", stroke = "#1A1A1A", size = 80, style }) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 80 48"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M16 36c-7 0-13-5-13-12 0-8 8-13 15-11 1-9 11-13 18-10 4-7 16-7 20 0 9-2 16 4 16 12 0 7-7 12-15 12-3 3-7 4-12 4H22c-3 0-5-1-6-2v-1Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trozo de cinta / scribble suelto — útil como subrayado decorativo. */
export function Underline({ color = "#FFC93C", size = 140, style }) {
  return (
    <svg
      width={size}
      height={size * 0.18}
      viewBox="0 0 140 26"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M4 18C28 8 60 6 88 11s40 12 48 8"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Pequeñas plumas/lineas tipo "speed lines" para acentuar movimiento. */
export function Lines({ color = "#1A1A1A", size = 36, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path d="M4 10h12M4 18h16M4 26h10" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
