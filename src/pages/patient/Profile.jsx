import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import InputField from "../../components/InputField";
import Field from "../../components/UI/Field";
import Badge from "../../components/UI/Badge";
import { useToast } from "../../components/UI/Toast";
import { getMyProfile } from "../../services/patientsService";
import { api } from "../../services/apiClient";
import { formatDateISOToHuman, formatPhone } from "../../utils/formatters";
import { isValidEmail, isValidPassword } from "../../utils/validators";

/**
 * Página de Perfil del Paciente
 * Permite ver y editar información personal
 */
export default function PatientProfile() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    emergencyName: "",
    emergencyPhone: "",
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        // Intentar obtener perfil del paciente autenticado
        const profileData = await getMyProfile();
        if (!alive) return;
        setProfile(profileData);
        setForm({
          firstName: profileData.firstName || user?.name?.split(" ")[0] || "",
          lastName: profileData.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
          email: profileData.email || user?.email || "",
          phone: profileData.phone || "",
          emergencyName: profileData.emergencyName || "",
          emergencyPhone: profileData.emergencyPhone || "",
          currentPassword: "",
          newPassword: "",
          newPasswordConfirm: "",
        });
      } catch (err) {
        if (!alive) return;
        // Si el endpoint no existe, usar datos del usuario actual
        if (err.status === 404) {
          const nameParts = (user?.name || "").split(" ");
          setForm({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user?.email || "",
            phone: "",
            emergencyName: "",
            emergencyPhone: "",
            currentPassword: "",
            newPassword: "",
            newPasswordConfirm: "",
          });
        } else {
          toast.error(err.message || "No pudimos cargar tu perfil.");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [user, toast]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (form.newPassword) {
      if (!isValidPassword(form.newPassword)) {
        newErrors.newPassword =
          "La contraseña debe tener al menos 8 caracteres, con letras y números.";
      }
      if (form.newPassword !== form.newPasswordConfirm) {
        newErrors.newPasswordConfirm = "Las contraseñas no coinciden.";
      }
      if (!form.currentPassword) {
        newErrors.currentPassword = "Debes ingresar tu contraseña actual para cambiarla.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        emergencyName: form.emergencyName.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
      };

      // Si hay nueva contraseña, incluirla
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      // Intentar actualizar usando endpoint específico para pacientes
      try {
        const response = await api.put("/patient/profile", payload, { auth: true });
        setProfile(response);
        toast.success("Perfil actualizado correctamente");
        // Limpiar campos de contraseña
        setForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          newPasswordConfirm: "",
        }));
      } catch (err) {
        // Si el endpoint no existe, intentar con el método tradicional
        if (err.status === 404 && user?.id) {
          const { updatePatient } = await import("../../services/patientsService");
          await updatePatient(user.id, payload);
          toast.success("Perfil actualizado correctamente");
          setForm((prev) => ({
            ...prev,
            currentPassword: "",
            newPassword: "",
            newPasswordConfirm: "",
          }));
        } else {
          throw err;
        }
      }
    } catch (err) {
      const message = err.message || "No pudimos actualizar tu perfil.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mi Perfil</h1>
        </div>
        <p>Cargando tu información...</p>
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mi Perfil</h1>
          <p className="helper-text">
            Actualiza tu información personal y de contacto de emergencia.
          </p>
        </div>
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Información Personal</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="stack-4">
            <div className="form-grid">
              <InputField
                label="Nombre"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
                error={errors.firstName}
              />
              <InputField
                label="Apellido"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
                error={errors.lastName}
              />
            </div>

            <div className="form-grid">
              <InputField
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                error={errors.email}
              />
              <InputField
                label="Teléfono"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="10 dígitos"
                maxLength={10}
                error={errors.phone}
              />
            </div>

            {profile?.curp && (
              <div className="detail-grid">
                <div>
                  <strong>CURP</strong>
                  <span>{profile.curp}</span>
                </div>
                {profile.birthDate && (
                  <div>
                    <strong>Fecha de nacimiento</strong>
                    <span>{formatDateISOToHuman(profile.birthDate)}</span>
                  </div>
                )}
              </div>
            )}

            <hr />

            <div className="stack-3">
              <h3>Contacto de Emergencia</h3>
              <div className="form-grid">
                <InputField
                  label="Nombre del contacto"
                  value={form.emergencyName}
                  onChange={(e) => handleChange("emergencyName", e.target.value)}
                  placeholder="Nombre completo"
                  error={errors.emergencyName}
                />
                <InputField
                  label="Teléfono del contacto"
                  value={form.emergencyPhone}
                  onChange={(e) => handleChange("emergencyPhone", e.target.value)}
                  placeholder="10 dígitos"
                  maxLength={10}
                  error={errors.emergencyPhone}
                />
              </div>
            </div>

            <hr />

            <div className="stack-3">
              <h3>Cambiar Contraseña</h3>
              <p className="helper-text">
                Deja estos campos vacíos si no deseas cambiar tu contraseña.
              </p>
              <Field label="Contraseña actual">
                <input
                  type="password"
                  className="input-field__input"
                  value={form.currentPassword}
                  onChange={(e) => handleChange("currentPassword", e.target.value)}
                  placeholder="Solo necesario si cambias la contraseña"
                />
                {errors.currentPassword && (
                  <span className="form-error">{errors.currentPassword}</span>
                )}
              </Field>
              <div className="form-grid">
                <Field label="Nueva contraseña">
                  <input
                    type="password"
                    className="input-field__input"
                    value={form.newPassword}
                    onChange={(e) => handleChange("newPassword", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.newPassword && (
                    <span className="form-error">{errors.newPassword}</span>
                  )}
                </Field>
                <Field label="Confirmar nueva contraseña">
                  <input
                    type="password"
                    className="input-field__input"
                    value={form.newPasswordConfirm}
                    onChange={(e) => handleChange("newPasswordConfirm", e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                  {errors.newPasswordConfirm && (
                    <span className="form-error">{errors.newPasswordConfirm}</span>
                  )}
                </Field>
              </div>
            </div>

            <div className="cluster" style={{ justifyContent: "flex-end", gap: "var(--s-2)" }}>
              <Button type="submit" loading={saving} disabled={saving}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}

