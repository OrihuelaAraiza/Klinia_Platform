import { useState } from "react";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import { useToast } from "../components/UI/Toast";
import { api } from "../services/apiClient";
import { useNavigate } from "react-router-dom";


export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/auth/forgot-password", { email });
            toast.success(
                "Si el correo existe, te enviamos instrucciones para restablecer tu contraseña."
            );
        } catch {
            toast.success(
                "Si el correo existe, te enviamos instrucciones para restablecer tu contraseña."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <h1>Restablecer contraseña</h1>
                <p className="auth-subtitle">
                    Ingresa tu correo y te enviaremos un enlace.
                </p>

                <InputField
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="auth-actions">
                    <ButtonPrimary
                        size="sm"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Volver
                    </ButtonPrimary>

                    <ButtonPrimary type="submit" loading={loading} size="sm">
                        Enviar
                    </ButtonPrimary>
                </div>
            </form>
        </div>
    );
}