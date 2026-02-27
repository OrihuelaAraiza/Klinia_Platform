import { forwardRef } from "react";

function cx(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === "string") return value.split(" ");
      if (Array.isArray(value)) return value;
      return Object.entries(value)
        .filter(([, truthy]) => Boolean(truthy))
        .map(([key]) => key);
    })
    .filter(Boolean)
    .join(" ");
}

const VARIANT_CLASS = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  ghost: "btn--ghost",
  accent: "btn--accent",
  success: "btn--success",
  danger: "btn--danger",
};

const SIZE_CLASS = {
  sm: "btn--sm",
  md: "btn--md",
  lg: "btn--lg",
};

function Spinner() {
  return <span className="btn__spinner" aria-hidden="true" />;
}

const Button = forwardRef(
  (
    {
      as: Component = "button",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Component
        ref={ref}
        className={cx(
          "ui-btn",
          VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
          SIZE_CLASS[size] || SIZE_CLASS.md,
          {
            "is-loading": loading,
            "is-disabled": isDisabled,
            "is-full": fullWidth,
          },
          className
        )}
        disabled={Component === "button" ? isDisabled : undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner /> : null}
        <span className="ui-btn__label">{children}</span>
      </Component>
    );
  }
);

Button.displayName = "Button";

export function ButtonPrimary(props) {
    return <Button variant="primary" {...props} />;
}

export default Button;
