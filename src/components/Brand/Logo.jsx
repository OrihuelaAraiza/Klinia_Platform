import { useTheme } from "../../hooks/useTheme";
import logoBlack from "../../assets/brand/romi_lrgblack.png";
import logoPink from "../../assets/brand/romi_lrgpink.png";
import logoFace from "../../assets/brand/romiface.png";
import heroRomi from "../../assets/brand/heroromi.png";

// Variantes disponibles:
//   horizontal — logo tipográfico (ROMI). Color depende del tema.
//   vertical   — versión vertical (ROMI con cara).
//   hero       — la mascota (axolote) en grande, usada como ilustración hero.
const VARIANT_ASSET = {
    horizontal: {
        light: logoBlack,
        dark: logoPink,
    },
    vertical: {
        light: logoFace,
        dark: logoFace,
    },
    hero: {
        light: heroRomi,
        dark: heroRomi,
    },
};

const SIZE_WIDTH = {
    sm: 140,
    md: 180,
    lg: 220,
    xl: 320,
};

export default function Logo({
    variant = "horizontal",
    size = "md",
    theme = "auto",
    alt = "ROMI TBE",
    className = "",
}) {
    const { theme: systemTheme } = useTheme();
    const resolvedTheme = theme === "auto" ? systemTheme : theme;
    const asset = VARIANT_ASSET[variant]?.[resolvedTheme] || logoBlack;
    const width = SIZE_WIDTH[size] ?? SIZE_WIDTH.md;

    return (
        <img
            src={asset}
            alt={alt}
            className={className}
            style={{ width, height: "auto" }}
            loading="lazy"
        />
    );
}
