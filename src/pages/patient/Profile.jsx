import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import InputField from "../../components/InputField";
import Field from "../../components/UI/Field";
import Badge from "../../components/UI/Badge";
import { useToast } from "../../components/UI/Toast";
import { SkeletonCard, SkeletonTitle, SkeletonSubtitle, SkeletonForm } from "../../components/UI/Skeleton";
import { getMyProfile } from "../../services/patientsService";
import { api } from "../../services/apiClient";
import { formatDateISOToHuman } from "../../utils/formatters";
import { isValidEmail, isValidPassword } from "../../utils/validators";
import { Phone, ShieldCheck, AlertCircle } from "lucide-react";

export default function PatientProfile() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Estado para rastrear si el teléfono original cambió
  const [originalPhone, setOriginalPhone] = useState("");

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
        const profileData = await getMyProfile();
        if (!alive) return;
        
        setProfile(profileData);
        const phone = profileData.phone || "";
        setOriginalPhone(phone); // Guardamos el teléfono inicial

        setForm({
          firstName: profileData.firstName || user?.name?.split(" ")[0] || "",
          lastName: profileData.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
          email: profileData.email || user?.email || "",
          phone: phone,
          emergencyName: profileData.emergencyName || "",
          emergencyPhone: profileData.emergencyPhone || "",
          currentPassword: "",
          newPassword: "",
          newPasswordConfirm: "",
        });
      } catch (err) {
        if (!alive) return;
        toast.error("No pudimos cargar tu perfil.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user, toast]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const isPhoneChanged = form.phone !== originalPhone;

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        emergencyName: form.emergencyName.trim(),
        emergencyPhone: form.emergencyPhone.trim(),
      };

      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const response = await api.put("/patient/profile", payload, { auth: true });
      setProfile(response);
      setOriginalPhone(response.phone);
      
      if (isPhoneChanged) {
        toast.info("Número actualizado. Por seguridad, debe ser verificado nuevamente.");
        // Aquí podrías redirigir a una pantalla de validación OTP
        // window.location.href = "/verify-phone";
      } else {
        toast.success("Perfil actualizado correctamente");
      }

      setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "", newPasswordConfirm: "" }));
    } catch (err) {
      toast.error(err.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (form.email && !isValidEmail(form.email)) newErrors.email = "Email inválido.";
    if (form.phone && form.phone.length < 10) newErrors.phone = "El teléfono debe tener 10 dígitos.";
    
    if (form.newPassword) {
      if (!isValidPassword(form.newPassword)) newErrors.newPassword = "Mínimo 8 caracteres, letras y números.";
      if (form.newPassword !== form.newPasswordConfirm) newErrors.newPasswordConfirm = "No coinciden.";
      if (!form.currentPassword) newErrors.currentPassword = "Requerida para cambios.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (loading) return <SkeletonProfile />;

  return (
    <section className="page stack-5">
      <div className="page__header cluster" style={{ justifyContent: 'space-between' }}>
        <div className="stack-2">
          <h1>Mi Perfil</h1>
          <p className="helper-text">Gestiona tu identidad y seguridad en la plataforma.</p>
        </div>
        <Badge variant={profile?.phoneVerified ? "success" : "warning"}>
          {profile?.phoneVerified ? "Cuenta Verificada" : "Verificación Pendiente"}
        </Badge>
      </div>

      <Card hoverable={false}>
        <CardBody>
          <form onSubmit={handleSubmit} className="stack-5">
            <div className="stack-4">
              <h3 className="cluster gap-2"><Phone size={18} /> Datos de Contacto</h3>
              
              <div className="form-grid">
                <InputField
                  label="Nombre"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                />
                <InputField
                  label="Apellido"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <InputField
                  label="Correo electrónico"
                  type="email"
                  value={form.email}
                  disabled // Normalmente el email es el ID, no se cambia fácil
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                <div className="stack-1">
                  <InputField
                    label="Teléfono Móvil"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="10 dígitos"
                    maxLength={10}
                    error={errors.phone}
                  />
                  {form.phone === originalPhone && profile?.phoneVerified ? (
                    <span className="helper-text success cluster gap-1">
                      <ShieldCheck size={14} /> Número verificado
                    </span>
                  ) : form.phone !== originalPhone ? (
                    <span className="helper-text warning cluster gap-1">
                      <AlertCircle size={14} /> El nuevo número requerirá validación
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <hr />

            <div className="stack-4">
              <h3>Seguridad</h3>
              <div className="form-grid">
                <Field label="Contraseña Actual">
                  <input
                    type="password"
                    className="input-field__input"
                    value={form.currentPassword}
                    onChange={(e) => handleChange("currentPassword", e.target.value)}
                    placeholder="••••••••"
                  />
                  {errors.currentPassword && <span className="form-error">{errors.currentPassword}</span>}
                </Field>
                <div className="form-grid">
                  <Field label="Nueva Contraseña">
                    <input
                      type="password"
                      className="input-field__input"
                      value={form.newPassword}
                      onChange={(e) => handleChange("newPassword", e.target.value)}
                    />
                  </Field>
                  <Field label="Confirmar Nueva">
                    <input
                      type="password"
                      className="input-field__input"
                      value={form.newPasswordConfirm}
                      onChange={(e) => handleChange("newPasswordConfirm", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
              {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
            </div>

            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <Button type="submit" loading={saving}>
                Actualizar Perfil
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}

function SkeletonProfile() {
  return (
    <section className="page stack-5">
      <SkeletonTitle />
      <SkeletonCard><div style={{ padding: '2rem' }}><SkeletonForm fields={6} /></div></SkeletonCard>
    </section>
  );
}