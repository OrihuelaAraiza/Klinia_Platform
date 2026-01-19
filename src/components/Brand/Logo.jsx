import logoHorizontal from "../../assets/brand/logo-brevemente-horizontal.png";
import logoVertical from "../../assets/brand/logo-brevemente-vertical.png";
import logoHorizontalOnBlue from "../../assets/brand/logo-brevemente-horizontal-on-blue.png";
import logoVerticalOnBlue from "../../assets/brand/logo-brevemente-vertical-on-blue.png";

const VARIANT_ASSET = {
  horizontal: {
    light: logoHorizontal,
    dark: logoHorizontalOnBlue,
  },
  vertical: {
    light: logoVertical,
    dark: logoVerticalOnBlue,
  },
};

const SIZE_WIDTH = {
  sm: 120,
  md: 160,
  lg: 200,
};

export default function Logo({
  variant = "horizontal",
  size = "md",
  theme = "light",
  alt = "BreveMente",
  className = "",
}) {
  const asset = VARIANT_ASSET[variant]?.[theme] || logoHorizontal;
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

