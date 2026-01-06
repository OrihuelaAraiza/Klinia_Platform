/**
 * Componente para estados vacíos con mensajes empáticos
 */
export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = "",
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <div className="empty-state__icon">
          <Icon size={64} />
        </div>
      )}
      {title && <h3 className="empty-state__title">{title}</h3>}
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div style={{ marginTop: "var(--s-4)" }}>{action}</div>}
    </div>
  );
}

