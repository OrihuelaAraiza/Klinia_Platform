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
  neutral: "badge--neutral",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
};

export default function Badge({ variant = "neutral", className = "", children, ...props }) {
  return (
    <span className={cx("ui-badge", VARIANT_CLASS[variant], className)} {...props}>
      {children}
    </span>
  );
}
