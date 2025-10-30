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

export function Table({ className = "", children, density = "compact", ...props }) {
  return (
    <div className="ui-table__wrapper">
      <table className={cx("ui-table", `ui-table--${density}`, className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableEmpty({ icon, title, description, action }) {
  return (
    <div className="ui-table-empty" role="status">
      {icon ? <div className="ui-table-empty__icon" aria-hidden="true">{icon}</div> : null}
      <div className="stack-2">
        {title ? <h3>{title}</h3> : null}
        {description ? <p className="ui-table-empty__description">{description}</p> : null}
      </div>
      {action ? <div className="ui-table-empty__action">{action}</div> : null}
    </div>
  );
}

export default Table;
