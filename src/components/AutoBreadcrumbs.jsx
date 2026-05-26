import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { useBreadcrumbContext } from "../context/breadcrumb-context";
import storage from "../services/storage";
import { ROLES } from "../utils/constants";

const STATIC_LABELS = {
  dashboard: "Inicio",
  patients: "Pacientes",
  patient: "Portal paciente",
  sessions: "Agenda",
  calendar: "Calendario",
  prescriptions: "Prescripciones",
  reports: "Reportes",
  notes: "Notas",
  history: "Historia clínica",
  "clinical-history": "Historia clínica",
  consents: "Consentimientos",
  documents: "Documentos",
  orders: "Órdenes",
  discharge: "Alta",
  profile: "Perfil",
  ProfileProfessional: "Perfil profesional",
  supervision: "Bitácora",
  new: "Nuevo",
  edit: "Editar",
  health: "Estado",
  auth: "Autenticación",
  debug: "Debug",
};

const CONTEXTUAL_NEW_LABELS = {
  prescriptions: "Nueva prescripción",
  reports: "Nuevo informe",
  orders: "Nueva orden",
  notes: "Nueva nota",
  sessions: "Nueva sesión",
};

const ID_PATTERNS = [
  /^[a-z]+_/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
];

const HIDDEN_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/register/patient",
  "/forgot-password",
  "/reset-password",
  "/health",
]);

function looksLikeId(segment) {
  if (!segment) return false;
  if (STATIC_LABELS[segment]) return false;
  if (ID_PATTERNS.some((re) => re.test(segment))) return true;
  if (segment.length >= 16 && /^[a-z0-9_-]+$/i.test(segment)) return true;
  return false;
}

function buildItems(pathname, labels, role) {
  const cleaned = pathname.split("?")[0];
  const segments = cleaned.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const isPatientPortal = segments[0] === "patient";
  const homeHref = isPatientPortal ? "/patient/dashboard" : "/dashboard";
  const items = [{ to: homeHref, label: "Inicio", isHome: true }];

  let accumulated = "";
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const isLast = index === segments.length - 1;

    if (segment === "dashboard" && index === 0) return;
    if (isPatientPortal && segment === "patient" && index === 0) return;

    let label = labels[segment] ?? null;

    if (!label && segment === "new") {
      const previous = segments[index - 1];
      label = CONTEXTUAL_NEW_LABELS[previous] || "Nuevo";
    }

    if (!label && STATIC_LABELS[segment]) {
      label = STATIC_LABELS[segment];
    }

    if (!label && looksLikeId(segment)) {
      if (isLast) {
        label = "Detalle";
      } else {
        return;
      }
    }

    if (!label) {
      label = segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    items.push({ to: isLast ? undefined : accumulated, label });
  });

  if (items.length === 1 && role === ROLES.PATIENT && !isPatientPortal) {
    return [];
  }

  return items;
}

export default function AutoBreadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { labels } = useBreadcrumbContext();
  const role = storage.getRole();

  const items = useMemo(() => {
    if (HIDDEN_ROUTES.has(location.pathname)) return [];
    return buildItems(location.pathname, labels, role);
  }, [location.pathname, labels, role]);

  if (items.length <= 1) return null;

  return (
    <div className="app-breadcrumbs">
      <div className="app-breadcrumbs__inner">
        <button
          type="button"
          className="app-breadcrumbs__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <nav className="app-breadcrumbs__nav" aria-label="Breadcrumb">
          <ol>
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="app-breadcrumbs__item">
                  {item.to && !isLast ? (
                    <Link to={item.to} className="app-breadcrumbs__link">
                      {item.isHome ? (
                        <Home size={14} aria-hidden="true" className="app-breadcrumbs__home-icon" />
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span className="app-breadcrumbs__current" aria-current="page">
                      {item.isHome ? (
                        <Home size={14} aria-hidden="true" className="app-breadcrumbs__home-icon" />
                      ) : null}
                      <span>{item.label}</span>
                    </span>
                  )}
                  {!isLast ? (
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="app-breadcrumbs__chevron"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
