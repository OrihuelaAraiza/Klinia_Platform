import { Asterisk, Squiggle, Dots, Sparkle, StarBurst, Zigzag, Heart } from "./landing/doodles/Doodles";

/**
 * Esparce garabatos decorativos pseudo-aleatorios alrededor de una pantalla.
 * Posiciones fijas (deterministas) para evitar que salten entre renders.
 * Usar como hijo absoluto dentro de un contenedor `position: relative`.
 */
const DOODLES = [
  { Comp: Asterisk, color: "#5B8DEF", size: 30, top: "8%",  left: "4%" },
  { Comp: Squiggle, color: "#FFC93C", size: 60, top: "22%", right: "5%" },
  { Comp: Dots,     color: "#1A1A1A", size: 60, top: "44%", left: "3%",  opacity: 0.35 },
  { Comp: Sparkle,  color: "#1A1A1A", size: 26, top: "62%", right: "4%" },
  { Comp: StarBurst, color: "#FFAFCC", stroke: "#1A1A1A", size: 38, top: "78%", left: "5%" },
  { Comp: Zigzag,   color: "#5B8DEF", size: 56, top: "12%", right: "20%" },
  { Comp: Heart,    color: "#FFAFCC", stroke: "#1A1A1A", size: 28, top: "86%", right: "8%" },
];

export default function DoodleScatter({ density = "default" }) {
  const items = density === "sparse" ? DOODLES.slice(0, 4) : DOODLES;
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
    >
      {items.map(({ Comp, opacity = 1, top, left, right, ...rest }, i) => (
        <div
          key={i}
          style={{ position: "absolute", top, left, right, opacity }}
        >
          <Comp {...rest} />
        </div>
      ))}
    </div>
  );
}
