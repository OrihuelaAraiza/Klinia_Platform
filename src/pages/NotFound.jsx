import { Link } from "react-router-dom";
import { ROUTES } from "../utils/constants";

export default function NotFound() {
  return (
    <section className="page page--centered">
      <h1>404</h1>
      <p>No encontramos la ruta solicitada.</p>
      <Link to={ROUTES.login} className="btn btn-secondary">
        Regresar al inicio
      </Link>
    </section>
  );
}
