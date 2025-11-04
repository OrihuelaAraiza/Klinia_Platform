

import Button from "./UI/Button";

export default function ButtonPrimary({
  children,
  type = "button",
  onClick,
  disabled = false,
  fullWidth = false,
  variant = "primary",
  className = "",
  loading = false,
  size = "md",
  ...props
}) {
  const allowedVariants = new Set(["primary", "secondary", "ghost", "danger", "accent"]);
  const resolvedVariant = allowedVariants.has(variant) ? variant : "primary";

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      fullWidth={fullWidth}
      variant={resolvedVariant}
      size={size}
      loading={loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
