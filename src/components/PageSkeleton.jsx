export default function PageSkeleton() {
  return (
    <div className="page page-skeleton" aria-label="Cargando contenido">
      <div className="skeleton shimmer skeleton--title" />
      <div className="skeleton shimmer skeleton--subtitle" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-card shimmer">
            <div className="skeleton shimmer skeleton--icon" />
            <div className="skeleton shimmer skeleton--line" />
            <div className="skeleton shimmer skeleton--line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

