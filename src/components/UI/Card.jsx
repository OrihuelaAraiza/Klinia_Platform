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

const Card = forwardRef(function Card(
  { className = "", hoverable = true, children, as: Component = "article", ...props },
  ref
) {
  return (
    <Component
      ref={ref}
      className={cx("ui-card", { "is-hoverable": hoverable }, className)}
      {...props}
    >
      {children}
    </Component>
  );
});

export function CardHeader({ className = "", children, ...props }) {
  return (
    <header className={cx("ui-card__header", className)} {...props}>
      {children}
    </header>
  );
}

export function CardBody({ className = "", children, ...props }) {
  return (
    <div className={cx("ui-card__body", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <footer className={cx("ui-card__footer", className)} {...props}>
      {children}
    </footer>
  );
}

export default Card;
