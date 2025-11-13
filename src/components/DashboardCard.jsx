import { memo } from "react";
import { motion } from "framer-motion";

function Spinner() {
  return <span className="dashboard-module__spinner" aria-hidden="true" />;
}

function DashboardCardComponent({
  variant = "shortcut",
  icon: Icon,
  title,
  description,
  value,
  subtext,
  ctaLabel = "Ir ahora",
  onClick,
  loading = false,
  delay = 0,
  ariaLabel,
  dataTestId,
  onStatClick,
}) {
  if (variant === "stat") {
    const StatComponent = onStatClick ? motion.button : motion.article;
    return (
      <StatComponent
        type={onStatClick ? "button" : undefined}
        className={`stat-card${onStatClick ? " stat-card--clickable" : ""}`}
        data-testid={dataTestId}
        onClick={onStatClick}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay }}
      >
        {Icon ? (
          <div className="stat-icon">
            <Icon size={24} aria-hidden="true" />
          </div>
        ) : null}
        <div className="stat-content">
          <p className="stat-label">{title}</p>
          {value ? <p className="stat-value">{value}</p> : null}
          {subtext ? <p className="stat-subtext">{subtext}</p> : null}
        </div>
      </StatComponent>
    );
  }

  const MotionComponent = onClick ? motion.button : motion.article;
  const computedAriaLabel =
    ariaLabel || (ctaLabel ? `${ctaLabel} ${title}` : title || undefined);

  return (
    <MotionComponent
      type={onClick ? "button" : undefined}
      className="dashboard-module"
      onClick={onClick}
      aria-label={computedAriaLabel}
      data-testid={dataTestId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="dashboard-module__header">
        {Icon ? (
          <div className="dashboard-module__icon">
            <Icon aria-hidden="true" />
          </div>
        ) : null}
        <h2 className="dashboard-page__section-title">{title}</h2>
      </div>
      {description ? <p className="dashboard-page__body-text">{description}</p> : null}
      {ctaLabel ? (
        <span
          className={`dashboard-module__cta-button${loading ? " is-loading" : ""}`}
          aria-live="polite"
        >
          <span className="dashboard-module__cta-label">
            {loading ? "Abriendo..." : ctaLabel}
          </span>
          <span className="dashboard-module__cta-icon" aria-hidden="true">
            {loading ? <Spinner /> : "→"}
          </span>
        </span>
      ) : null}
    </MotionComponent>
  );
}

function cardPropsAreEqual(prev, next) {
  return (
    prev.variant === next.variant &&
    prev.icon === next.icon &&
    prev.title === next.title &&
    prev.description === next.description &&
    prev.value === next.value &&
    prev.subtext === next.subtext &&
    prev.loading === next.loading &&
    prev.delay === next.delay &&
    prev.ctaLabel === next.ctaLabel &&
    prev.onClick === next.onClick &&
    prev.ariaLabel === next.ariaLabel &&
    prev.dataTestId === next.dataTestId &&
    prev.onStatClick === next.onStatClick
  );
}

const DashboardCard = memo(DashboardCardComponent, cardPropsAreEqual);

export default DashboardCard;
