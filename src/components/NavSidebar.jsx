import { useEffect, useRef, useState } from "react";
import Logo from "./Brand/Logo";
import Modal from "./UI/Modal";
import Button from "./UI/Button";
import { ROLES, ROUTES } from "../utils/constants";
import SidebarLink from "./SidebarLink";
import linkageRequestsService from "../services/linkageRequestsService";
import appointmentRequestsService from "../services/appointmentRequestsService";
import { useToast } from "./UI/Toast";
import storage from "../services/storage";

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Inicio", icon: DashboardIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.patients, label: "Pacientes", icon: UsersIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.sessions, label: "Agenda", icon: CalendarIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.prescriptions, label: "Sesiones", icon: ClipboardIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { id: "romi-transcript", label: "Romi Transcript", icon: SparkleIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT], comingSoon: true },
  { to: ROUTES.solicitudes, label: "Solicitudes", icon: InboxIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT], badgeSource: "requests" },
  { to: ROUTES.reports, label: "Reportes", icon: ChartIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL] },
  { to: ROUTES.expedientes, label: "Buscar expediente", icon: SearchIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL] },
  { to: ROUTES.supervision, label: "Bitácora", icon: ShieldIcon, roles: [ROLES.ADMIN] },
];

const LAST_SEEN_KEY_PREFIX = "romimente.requests.lastSeen.";

function lastSeenKey() {
  const u = storage.getUser?.();
  const id = u?.id || "anon";
  return `${LAST_SEEN_KEY_PREFIX}${id}`;
}

function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18Zm-10 0h8v-6H3v6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3 4 6v6c0 5 3.8 9.4 8 10 4.2-.6 8-5 8-10V6l-8-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 3h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1Z" />
      <path d="M9 3a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2" strokeLinecap="round" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 19V5M12 19V9M20 19v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InboxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" strokeLinejoin="round" />
      <path d="M19 14v4M17 16h4M5 19v2M4 20h2" strokeLinecap="round" />
    </svg>
  );
}

function usePendingRequestsCount(role) {
  const [counts, setCounts] = useState({ linkage: 0, appointment: 0 });
  useEffect(() => {
    const allowed = [ROLES.PROFESSIONAL, ROLES.ADMIN, ROLES.ASSISTANT];
    if (!allowed.includes(role)) return undefined;
    let alive = true;
    const fetchCounts = async () => {
      const [linkage, appointment] = await Promise.all([
        linkageRequestsService.countPendingForProfessional().catch(() => 0),
        appointmentRequestsService.countPendingForProfessional().catch(() => 0),
      ]);
      if (alive) setCounts({ linkage, appointment });
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [role]);
  return counts;
}

/**
 * Dispara un toast una sola vez por sesión cuando el usuario inicia con
 * solicitudes pendientes (vinculación o cita) mayores a las que dejó la
 * última vez. Usa localStorage para recordar el último vistazo.
 */
function useRequestsArrivalToast(role, counts) {
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    const allowed = [ROLES.PROFESSIONAL, ROLES.ADMIN, ROLES.ASSISTANT];
    if (!allowed.includes(role)) return;
    if (firedRef.current) return;

    const total = (counts?.linkage || 0) + (counts?.appointment || 0);
    if (total === 0) return;

    let lastSeen = { linkage: 0, appointment: 0 };
    try {
      const raw = window.localStorage.getItem(lastSeenKey());
      if (raw) lastSeen = { ...lastSeen, ...JSON.parse(raw) };
    } catch {
      // ignore
    }

    const newLinkage = Math.max(0, (counts.linkage || 0) - (lastSeen.linkage || 0));
    const newAppointment = Math.max(0, (counts.appointment || 0) - (lastSeen.appointment || 0));
    const anyNew = newLinkage + newAppointment > 0;

    if (anyNew && toast?.info) {
      const parts = [];
      if (newAppointment > 0) {
        parts.push(`${newAppointment} ${newAppointment === 1 ? "solicitud de cita" : "solicitudes de cita"}`);
      }
      if (newLinkage > 0) {
        parts.push(`${newLinkage} ${newLinkage === 1 ? "solicitud de vinculación" : "solicitudes de vinculación"}`);
      }
      toast.info(`Tienes ${parts.join(" y ")} pendientes.`);
    }

    try {
      window.localStorage.setItem(
        lastSeenKey(),
        JSON.stringify({ linkage: counts.linkage || 0, appointment: counts.appointment || 0 })
      );
    } catch {
      // ignore
    }
    firedRef.current = true;
  }, [role, counts, toast]);
}

export default function NavSidebar({
  role,
  collapsed,
  id = "app-sidebar",
}) {
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const pendingCounts = usePendingRequestsCount(role);
  const totalPending = (pendingCounts.linkage || 0) + (pendingCounts.appointment || 0);
  useRequestsArrivalToast(role, pendingCounts);
  const [romiTranscriptModalOpen, setRomiTranscriptModalOpen] = useState(false);

  return (
    <nav
      id={id}
      className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}
      aria-label="Navegación principal"
    >
      <div className="sidebar__brand">
        <Logo
          variant="horizontal"
          size="md"
          theme="dark"
          alt="ROMI TBE"
          className="sidebar__logo"
        />
      </div>
      <ul className="sidebar__list">
        {filteredItems.map((item) => {
          if (item.comingSoon && item.id === "romi-transcript") {
            const Icon = item.icon;
            return (
              <li key="romi-transcript" className="sidebar__item">
                <button
                  type="button"
                  className="sidebar__link sidebar__link--coming-soon"
                  onClick={() => setRomiTranscriptModalOpen(true)}
                  data-tooltip={collapsed ? `${item.label} (Próximamente)` : undefined}
                  title={collapsed ? `${item.label} (Próximamente)` : undefined}
                  aria-label={`${item.label} — Próximamente`}
                >
                  {Icon ? <Icon className="sidebar__icon" aria-hidden="true" /> : null}
                  <span className="sidebar__label">{item.label}</span>
                  <span className="sidebar__soon-chip" aria-hidden="true">Pronto</span>
                </button>
              </li>
            );
          }

          let badge;
          if (item.badgeSource === "requests" && totalPending > 0) {
            badge = totalPending;
          }
          return (
            <li key={item.to} className="sidebar__item">
              <SidebarLink
                to={item.to}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                badge={badge}
              />
            </li>
          );
        })}
      </ul>

      <Modal
        open={romiTranscriptModalOpen}
        onClose={() => setRomiTranscriptModalOpen(false)}
        title={
          <span className="cluster gap-2 align-center">
            <SparkleIcon style={{ width: 20, height: 20, color: "var(--primary)" }} aria-hidden="true" />
            Romi Transcript · Copiloto clínico de IA
          </span>
        }
        footer={
          <div className="cluster justify-end">
            <Button variant="primary" onClick={() => setRomiTranscriptModalOpen(false)}>Entendido</Button>
          </div>
        }
      >
        <div className="stack-3">
          <p>
            <strong>Romi Transcript</strong> es el copiloto clínico de ROMI TBE. Próximamente podrás:
          </p>
          <ul className="stack-1" style={{ paddingLeft: "1.1rem", margin: 0 }}>
            <li>Transcribir y resumir sesiones desde audio.</li>
            <li>Sugerir autollenado de notas, reportes y planes de tratamiento.</li>
            <li>Detectar fórmulas TBE (DX, VC/VG, RST) y proponer dimensiones SPR.</li>
            <li>Buscar dentro del corpus cerrado (CIE-11, DSM-5-TR, protocolos institucionales).</li>
          </ul>
          <div className="romi-transcript-callout" style={{ marginTop: "0.5rem" }}>
            <div className="romi-transcript-callout__icon" aria-hidden="true">✦</div>
            <div className="romi-transcript-callout__content">
              <strong>La IA nunca decide sola.</strong>
              <p className="helper-text" style={{ margin: "0.25rem 0 0" }}>
                Toda sugerencia tendrá que ser validada por ti antes de quedar en el expediente o
                firmarse. Romi Transcript no genera diagnósticos vinculantes ni puede cerrar documentos por
                sí mismo.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </nav>
  );
}
