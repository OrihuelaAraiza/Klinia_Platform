import LandingTopbar from "../../components/landing/LandingTopbar";
import LandingFooter from "../../components/landing/LandingFooter";

export default function PrivacyPolicy() {
  return (
    <div className="legal-page-wrapper">
      <LandingTopbar />

      <main className="legal-page">
        <header className="legal-page__header">
          <span className="landing-eyebrow">Documento legal</span>
          <h1>Aviso de Privacidad</h1>
          <p className="helper-text">
            Vigente desde el 1 de enero de 2026. Versión 1.0.
          </p>
        </header>

        <article className="legal-page__content">
          <section>
            <h2>1. Identidad y domicilio del responsable</h2>
            <p>
              <strong>Red de Optimización Médica Inteligente, S.A. de C.V.</strong> (en adelante,
              "Romi AI" o "el Responsable"), con domicilio en Hospital Ángeles Puebla, Av. Kepler
              No. 2143, Torre de Especialidades IV, Consultorio 3800, CP 72820, Reserva Territorial
              Atlixcáyotl, Puebla, Pue., es la entidad responsable del tratamiento de sus datos
              personales recabados a través de la plataforma <strong>ROMI TBE</strong>.
            </p>
          </section>

          <section>
            <h2>2. Datos personales que se recaban</h2>
            <p>Recabamos las siguientes categorías de datos personales:</p>
            <ul>
              <li><strong>Datos de identificación</strong>: nombre completo, CURP, fecha de nacimiento, sexo, fotografía de perfil.</li>
              <li><strong>Datos de contacto</strong>: correo electrónico, teléfono, domicilio.</li>
              <li><strong>Datos sensibles (clínicos)</strong>: historia clínica, diagnósticos, antecedentes patológicos, prescripciones, notas de evolución, escalas psicométricas y otros datos derivados del proceso terapéutico.</li>
              <li><strong>Datos del profesional</strong> (cuando aplica): cédulas profesionales, especialidad, domicilio del consultorio.</li>
              <li><strong>Datos de uso</strong>: registros de acceso, dispositivos, navegación dentro de la plataforma.</li>
            </ul>
            <p>
              Los <strong>datos sensibles</strong> serán tratados con las medidas reforzadas de
              seguridad y confidencialidad que exige el artículo 9 de la Ley Federal de Protección
              de Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>
          </section>

          <section>
            <h2>3. Finalidades del tratamiento</h2>
            <p><strong>Finalidades primarias</strong> (necesarias para la prestación del servicio):</p>
            <ul>
              <li>Crear y mantener su expediente clínico electrónico conforme a la NOM-004-SSA3-2012 y NOM-024-SSA3-2012.</li>
              <li>Permitir la vinculación con profesionales de la salud mental certificados.</li>
              <li>Generar reportes, constancias, prescripciones y demás documentos clínicos firmables y auditables.</li>
              <li>Operar la agenda de sesiones, recordatorios y comunicación funcional con su terapeuta.</li>
              <li>Mantener trazabilidad de auditoría para cumplimiento normativo.</li>
            </ul>
            <p><strong>Finalidades secundarias</strong> (no necesarias; puede oponerse):</p>
            <ul>
              <li>Envío de comunicaciones informativas sobre nuevas funcionalidades.</li>
              <li>Análisis estadístico agregado y anonimizado para mejorar la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2>4. Brifi (asistente de inteligencia artificial)</h2>
            <p>
              ROMI TBE incluye un copiloto clínico de IA llamado <strong>Brifi</strong>. Es
              importante que conozca cómo opera respecto a sus datos personales:
            </p>
            <ul>
              <li>Brifi <strong>NO entrena modelos abiertos</strong> con sus datos clínicos ni de identificación.</li>
              <li>Brifi opera sobre un <strong>corpus cerrado</strong> de literatura clínica oficial (CIE-11, DSM-5-TR y protocolos institucionales).</li>
              <li>Toda sugerencia generada por Brifi debe ser <strong>validada y aprobada por el profesional</strong> antes de almacenarse en el expediente. La IA nunca cierra un expediente ni firma documentos por sí misma.</li>
              <li>El audio de las sesiones, si decide grabarlo, se procesa para transcripción y propuesta de autollenado. Puede solicitar su eliminación en cualquier momento.</li>
            </ul>
          </section>

          <section>
            <h2>5. Transferencias de datos</h2>
            <p>
              Sus datos pueden ser transferidos exclusivamente en los siguientes casos:
            </p>
            <ul>
              <li>Al profesional de la salud con quien usted se vincule mediante la plataforma.</li>
              <li>A proveedores tecnológicos que apoyan la operación (almacenamiento en la nube, autenticación), bajo contratos de confidencialidad alineados a la LFPDPPP.</li>
              <li>A autoridades competentes cuando exista mandato legal expreso.</li>
            </ul>
            <p>
              <strong>No comercializamos sus datos</strong>. No transferimos sus datos clínicos a
              terceros con fines publicitarios.
            </p>
          </section>

          <section>
            <h2>6. Medidas de seguridad</h2>
            <p>
              Implementamos medidas administrativas, físicas y técnicas para proteger sus datos:
              cifrado en tránsito (TLS), cifrado en reposo, control de acceso por roles,
              arquitectura multi-tenant (cada profesional accede únicamente a sus propios
              pacientes), sello digital SHA-256 sobre documentos clínicos y registro de auditoría.
            </p>
          </section>

          <section>
            <h2>7. Ejercicio de derechos ARCO</h2>
            <p>
              Como titular tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong>
              al tratamiento de sus datos personales, así como a revocar su consentimiento. Para
              ejercer estos derechos, envíe su solicitud al correo{" "}
              <a href="mailto:contacto@romiai.com.mx">contacto@romiai.com.mx</a> con el asunto
              "Derechos ARCO" e incluya:
            </p>
            <ul>
              <li>Nombre completo y medio para recibir respuesta.</li>
              <li>Documento que acredite su identidad (INE o pasaporte).</li>
              <li>Descripción clara del derecho que desea ejercer y los datos personales involucrados.</li>
            </ul>
            <p>Responderemos en un plazo no mayor a 20 días hábiles.</p>
          </section>

          <section>
            <h2>8. Uso de cookies y tecnologías similares</h2>
            <p>
              Utilizamos cookies esenciales para mantener su sesión iniciada y recordar preferencias
              (tema visual, terapeutas pre-seleccionados). No usamos cookies publicitarias de
              terceros. Puede desactivar las cookies en su navegador, pero algunas funcionalidades
              podrían dejar de operar correctamente.
            </p>
          </section>

          <section>
            <h2>9. Cambios al aviso</h2>
            <p>
              Cualquier modificación al presente aviso será publicada en esta misma página con la
              fecha de actualización correspondiente. Le notificaremos por correo electrónico cuando
              los cambios sean sustanciales.
            </p>
          </section>

          <section>
            <h2>10. Autoridad reguladora</h2>
            <p>
              Si considera que su derecho a la protección de datos personales ha sido vulnerado,
              puede acudir al <strong>Instituto Nacional de Transparencia, Acceso a la Información
              y Protección de Datos Personales (INAI)</strong>{" "}
              (<a href="https://home.inai.org.mx" target="_blank" rel="noopener noreferrer">home.inai.org.mx</a>).
            </p>
          </section>

          <p className="legal-page__footer-note">
            Última actualización: 1 de enero de 2026.
          </p>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
