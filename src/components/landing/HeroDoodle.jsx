import { motion as Motion } from "framer-motion";
import { Asterisk, Squiggle, Heart, Sparkle, StarBurst, Dots, Zigzag, Underline } from "./doodles/Doodles";

/**
 * Ilustración del hero en estilo blob / hand-drawn / corporate-memphis.
 * Un "blob character" amarillo amorfo sostiene un corazón mientras flota
 * rodeado de garabatos pastel — vibe Headspace/Calm/Buck.
 */
export default function HeroDoodle() {
  return (
    <div className="hero-doodle" aria-hidden="true">
      {/* Manchas de fondo blob */}
      <svg className="hero-doodle__bg" viewBox="0 0 480 480" fill="none" aria-hidden="true">
        <path
          d="M395 195c25 38 22 96-12 130-34 35-100 44-150 24-50-21-83-71-77-119 5-48 50-89 102-100s112 27 137 65Z"
          fill="#C8B6FF"
          opacity="0.55"
        />
        <path
          d="M120 110c30-25 86-30 124-9 38 22 58 70 50 113-9 43-46 81-90 86-44 5-95-25-114-67-19-43 0-99 30-123Z"
          fill="#FFAFCC"
          opacity="0.45"
        />
      </svg>

      {/* Personaje blob */}
      <Motion.svg
        className="hero-doodle__character"
        viewBox="0 0 320 360"
        fill="none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        aria-hidden="true"
      >
        {/* Sombra elíptica suave */}
        <ellipse cx="160" cy="335" rx="90" ry="10" fill="#1A1A1A" opacity="0.08" />

        {/* Cuerpo principal - blob amarillo asimétrico */}
        <Motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M70 175c-5-55 35-110 95-115 58-5 110 30 120 85 11 55-20 130-75 145-55 14-115-15-130-65-3-12-8-37-10-50Z"
            fill="#FFD972"
            stroke="#1A1A1A"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Brazitos */}
          <path
            d="M80 195c-12-2-24 4-30 16-5 12 0 26 12 30"
            stroke="#1A1A1A"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M252 200c14 0 26 8 30 22 3 12-5 24-18 26"
            stroke="#1A1A1A"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Manitas (puntitos) */}
          <circle cx="62" cy="241" r="6" fill="#1A1A1A" />
          <circle cx="264" cy="248" r="6" fill="#1A1A1A" />

          {/* Cachetitos rosados */}
          <ellipse cx="115" cy="178" rx="13" ry="8" fill="#FFAFCC" opacity="0.75" />
          <ellipse cx="215" cy="178" rx="13" ry="8" fill="#FFAFCC" opacity="0.75" />

          {/* Ojos cerraditos (felices) */}
          <path
            d="M105 158c4 5 12 5 16 0"
            stroke="#1A1A1A"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M199 158c4 5 12 5 16 0"
            stroke="#1A1A1A"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Sonrisa */}
          <path
            d="M148 195c4 9 20 9 24 0"
            stroke="#1A1A1A"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </Motion.g>

        {/* Corazón flotante encima (que el blob "sostiene") */}
        <Motion.g
          animate={{ y: [-6, 4, -6], rotate: [-4, 4, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "160px 70px" }}
        >
          <path
            d="M160 110s-22-12-22-28a12 12 0 0 1 22-7 12 12 0 0 1 22 7c0 16-22 28-22 28Z"
            fill="#FF5C7C"
            stroke="#1A1A1A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </Motion.g>
      </Motion.svg>

      {/* Garabatos flotantes */}
      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--asterisk-1"
        animate={{ rotate: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Asterisk color="#5B8DEF" size={32} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--asterisk-2"
        animate={{ rotate: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <Asterisk color="#FFC93C" size={26} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--squiggle"
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Squiggle color="#5B8DEF" size={70} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--sparkle"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkle color="#1A1A1A" size={28} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--dots"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <Dots color="#1A1A1A" size={55} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--heart"
        animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart color="#FFAFCC" stroke="#1A1A1A" size={32} />
      </Motion.div>

      <Motion.div
        className="hero-doodle__deco hero-doodle__deco--star"
        animate={{ rotate: [0, 25, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <StarBurst color="#FFC93C" stroke="#1A1A1A" size={42} />
      </Motion.div>

      <div className="hero-doodle__deco hero-doodle__deco--zigzag">
        <Zigzag color="#5B8DEF" size={65} />
      </div>

      <div className="hero-doodle__deco hero-doodle__deco--underline">
        <Underline color="#FFC93C" size={120} />
      </div>
    </div>
  );
}
