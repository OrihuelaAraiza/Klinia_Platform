/**
 * Componente Skeleton reutilizable para estados de carga
 */
export function Skeleton({ className = "", style = {}, ...props }) {
  return (
    <span
      className={`skeleton shimmer ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard({ children, className = "" }) {
  return (
    <div className={`skeleton-card shimmer ${className}`} aria-hidden="true">
      {children}
    </div>
  );
}

export function SkeletonLine({ width = "100%", className = "" }) {
  return (
    <Skeleton
      className={`skeleton--line ${className}`}
      style={{ width }}
    />
  );
}

export function SkeletonTitle({ className = "" }) {
  return <Skeleton className={`skeleton--title ${className}`} />;
}

export function SkeletonSubtitle({ className = "" }) {
  return <Skeleton className={`skeleton--subtitle ${className}`} />;
}

export function SkeletonAvatar({ size = 40, className = "" }) {
  return (
    <Skeleton
      className={`skeleton--avatar ${className}`}
      style={{ width: size, height: size, borderRadius: "50%" }}
    />
  );
}

export function SkeletonButton({ className = "" }) {
  return <Skeleton className={`skeleton--button ${className}`} style={{ height: "2.5rem" }} />;
}

/**
 * Skeleton para lista de cards
 */
export function SkeletonList({ count = 3, className = "" }) {
  return (
    <div className={`stack-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index}>
          <div className="stack-2">
            <div className="cluster" style={{ justifyContent: "space-between" }}>
              <SkeletonLine width="40%" />
              <SkeletonLine width="20%" />
            </div>
            <SkeletonLine width="80%" />
            <SkeletonLine width="60%" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/**
 * Skeleton para grid de cards
 */
export function SkeletonGrid({ count = 4, className = "" }) {
  return (
    <div className={`dashboard-grid ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index}>
          <div className="stack-3">
            <SkeletonLine width="30%" style={{ height: "1.5rem" }} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="70%" />
            <SkeletonLine width="50%" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/**
 * Skeleton para formulario
 */
export function SkeletonForm({ fields = 3, className = "" }) {
  return (
    <div className={`stack-4 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="stack-2">
          <SkeletonLine width="30%" style={{ height: "1rem" }} />
          <SkeletonLine width="100%" style={{ height: "2.5rem" }} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;

