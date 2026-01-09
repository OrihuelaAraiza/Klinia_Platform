import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import { api } from "../services/apiClient";
import { useToast } from "../components/UI/Toast";

export default function ResetPassword() {
    const [params] = useSearchParams();
    const token = params.get("token");
    const navigate = useNavigate();
    const toast = useToast();

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/auth/reset-password", { token, password });
            toast.success("Contraseña actualizada correctamente");
            navigate("/login");
        } catch (error) {
            const message = error?.response?.data?.message || error.message || "Ocurrió un error inesperado";
            toast.error(message);
        }
        finally {
            setLoading(false);
        }
    };

    if (!token) {
        return <p>Enlace inválido</p>;
    }

    return (
        <div className="login-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <h1>Nueva contraseña</h1>

                <p className="auth-subtitle">
                    Ingresa tu nueva contraseña para continuar.
                </p>

                <InputField
                    label="Nueva contraseña"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="auth-actions">
                    <ButtonPrimary
                        size="sm"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Cancelar
                    </ButtonPrimary>

                    <ButtonPrimary
                        type="submit"
                        loading={loading}
                        size="sm"
                    >
                        Guardar
                    </ButtonPrimary>
                </div>
            </form>
        </div>
    );


}