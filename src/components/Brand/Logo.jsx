import { useTheme } from "../../hooks/useTheme";
import logoHorizontal from "../../assets/brand/logo-brevemente-horizontal.png";
import logoVertical from "../../assets/brand/logo-brevemente-vertical.png";
import logoHorizontalDark from "../../assets/brand/Logotipo-BreveMente_Fondo-Azul-horizontal-Transparente.png";
import logoVerticalOnBlue from "../../assets/brand/logo-brevemente-vertical-on-blue.png";

const VARIANT_ASSET = {
    horizontal: {
        light: logoHorizontal,
        dark: logoHorizontalDark,
    },
    vertical: {
        light: logoVertical,
        dark: logoVerticalOnBlue,
    },
};

const SIZE_WIDTH = {
    sm: 140,
    md: 180,
    lg: 220,
};

export default function Logo({
    variant = "horizontal",
    size = "md",
    theme = "auto",
    alt = "BreveMente",
    className = "",
}) {
    const { theme: systemTheme } = useTheme();
    const resolvedTheme = theme === "auto" ? systemTheme : theme;
    const asset = VARIANT_ASSET[variant]?.[resolvedTheme] || logoHorizontal;
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

