import LandingTopbar from "../../components/landing/LandingTopbar";
import LandingFooter from "../../components/landing/LandingFooter";

export default function TermsConditions() {
  return (
    <div className="legal-page-wrapper">
      <LandingTopbar />

      <main className="legal-page">
        <header className="legal-page__header">
          <span className="landing-eyebrow">Documento legal</span>
          <h1>Términos y Condiciones de Uso</h1>
          <p className="helper-text">
            Vigente desde el 1 de enero de 2026. Versión 1.0.
          </p>
        </header>

        <article className="legal-page__content">
          <section>
            <h2>1. Aceptación de los términos</h2>
            <p>
              Al crear una cuenta en <strong>ROMI Clínica</strong> (operada por Red de Optimización
              Médica Inteligente, S.A. de C.V., "Romi AI") usted acepta los presentes Términos y
              Condiciones, así como el Aviso de Privacidad. Si no está de acuerdo con alguno de
              estos términos, abstenerse de utilizar la plataforma.
            </p>
          </section>

          <section>
            <h2>2. Naturaleza del servicio</h2>
            <p>
              ROMI Clínica es una plataforma tecnológica que facilita la <strong>gestión clínica
              y administrativa</strong> entre profesionales de la salud mental y sus pacientes.
              Incluye expediente clínico electrónico, agenda, generación de reportes y un copiloto
              de IA (Romi Transcript).
            </p>
            <p>
              <strong>Romi AI no presta servicios médicos ni terapéuticos directamente</strong>.
              Los servicios clínicos son provistos por los profesionales independientes que se
              registran en la plataforma. La relación clínico-paciente es directa entre el usuario
              y el profesional con quien se vincule.
            </p>
          </section>

          <section>
            <h2>3. Perfiles de usuario y elegibilidad</h2>
            <ul>
              <li><strong>Profesional</strong>: debe contar con cédula profesional vigente en psiquiatría, psicología o psicoterapia, y declarar veraz su especialidad.</li>
              <li><strong>Asistente</strong>: persona autorizada por un profesional para apoyar en tareas administrativas, sin facultades clínicas.</li>
              <li><strong>Paciente</strong>: persona mayor de edad, o menor con consentimiento del tutor legal, que busca atención en salud mental.</li>
              <li><strong>Administrador</strong>: personal interno de Romi AI con funciones operativas.</li>
            </ul>
            <p>
              La declaración falsa de credenciales profesionales podrá derivar en la suspensión
              inmediata de la cuenta y, en su caso, en las acciones legales correspondientes.
            </p>
          </section>

          <section>
            <h2>4. Permisos clínicos por especialidad</h2>
            <p>
              La plataforma aplica controles automáticos según la especialidad declarada por el
              profesional:
            </p>
            <ul>
              <li><strong>Psiquiatra</strong>: puede prescribir psicofármacos y emitir reportes psiquiátricos.</li>
              <li><strong>Psicólogo</strong>: puede evaluar, diagnosticar mediante pruebas psicométricas y brindar psicoterapia. No puede emitir recetas.</li>
              <li><strong>Psicoterapeuta</strong>: puede aplicar técnicas terapéuticas conforme a su formación. No puede emitir recetas, salvo que también acredite ser médico psiquiatra.</li>
            </ul>
            <p>
              Estos controles son una capa de cumplimiento adicional pero no eximen al profesional
              de su responsabilidad personal y legal sobre las decisiones clínicas.
            </p>
          </section>

          <section>
            <h2>5. Responsabilidad sobre la información clínica</h2>
            <p>
              El profesional es el único responsable de la veracidad, integridad y oportunidad de
              la información clínica que registra. ROMI Clínica provee la infraestructura tecnológica
              (folios, sellos SHA-256, trazabilidad) para cumplir con NOM-004 y NOM-024, pero no
              valida el contenido clínico de notas, prescripciones o reportes.
            </p>
            <p>
              El paciente es responsable de proporcionar información verídica sobre su historial,
              identidad y datos de contacto.
            </p>
          </section>

          <section>
            <h2>6. Romi Transcript y limitaciones de la IA</h2>
            <p>
              Romi Transcript es un asistente de soporte. Sus sugerencias <strong>no constituyen
              recomendación médica vinculante</strong> y deben ser siempre validadas por el
              profesional antes de aplicarse en el expediente o comunicarse al paciente.
            </p>
            <p>
              Romi AI no garantiza que las sugerencias generadas por Romi Transcript sean libres de error.
              Tampoco se responsabiliza por decisiones clínicas tomadas con base exclusiva en
              dichas sugerencias sin la debida revisión profesional.
            </p>
          </section>

          <section>
            <h2>7. Propiedad intelectual</h2>
            <p>
              El software, marca, diseño, contenido editorial y código de la plataforma son
              propiedad de Romi AI o licenciados a su favor. Su uso autorizado se limita a la
              operación de la plataforma. No se otorga ninguna licencia para reproducir, modificar
              o distribuir contenido de la plataforma sin autorización escrita.
            </p>
            <p>
              La información clínica capturada (notas, reportes) pertenece al paciente, conforme
              a la NOM-004. El profesional la administra dentro de la plataforma en calidad de
              custodio.
            </p>
          </section>

          <section>
            <h2>8. Tarifas y pagos</h2>
            <p>
              El uso básico de la plataforma puede ser gratuito o sujeto a una suscripción
              profesional según los planes vigentes. Los honorarios clínicos se pactan
              directamente entre el paciente y el profesional, y son ajenos a la facturación de
              Romi AI salvo que se indique lo contrario.
            </p>
          </section>

          <section>
            <h2>9. Suspensión y terminación de la cuenta</h2>
            <p>
              Romi AI podrá suspender o cerrar una cuenta en los siguientes supuestos:
            </p>
            <ul>
              <li>Uso indebido o fraudulento de la plataforma.</li>
              <li>Declaración falsa de credenciales profesionales.</li>
              <li>Violación a la privacidad o secreto profesional respecto a terceros.</li>
              <li>Falta de pago de las cuotas aplicables.</li>
              <li>Por solicitud directa del usuario, conforme al procedimiento de baja.</li>
            </ul>
            <p>
              La terminación de la cuenta no exime al profesional de conservar los expedientes
              clínicos por los plazos exigidos por la normativa mexicana.
            </p>
          </section>

          <section>
            <h2>10. Limitación de responsabilidad</h2>
            <p>
              Romi AI no será responsable por daños indirectos, lucro cesante o pérdida de
              oportunidad derivados del uso o imposibilidad de uso de la plataforma. La
              responsabilidad total agregada de Romi AI por cualquier reclamación relacionada con
              el servicio no excederá el monto pagado por el usuario en los 12 meses previos al
              evento que dio origen al reclamo.
            </p>
          </section>

          <section>
            <h2>11. Modificaciones a los términos</h2>
            <p>
              Romi AI podrá actualizar estos términos en cualquier momento. Las modificaciones
              sustanciales serán notificadas con al menos 15 días naturales de anticipación a
              través del correo electrónico registrado. El uso continuado de la plataforma
              después de dicha notificación implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2>12. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
              controversia derivada de los mismos será sometida a los tribunales competentes de
              la ciudad de Puebla, Pue., renunciando las partes a cualquier otro fuero que les
              pudiera corresponder.
            </p>
          </section>

          <section>
            <h2>13. Contacto</h2>
            <p>
              Para dudas, sugerencias o reclamaciones relacionadas con estos términos, escríbanos
              a <a href="mailto:contacto@romiai.com.mx">contacto@romiai.com.mx</a> o llame al
              22 24 33 50 93 en horario de oficina (Lun – Vie 9:00 AM – 6:00 PM, Sáb 10:00 AM –
              2:00 PM, GMT-6).
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
