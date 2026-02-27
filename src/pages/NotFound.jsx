import { Link } from "react-router-dom";
import Button from "../components/UI/Button";
import { ROUTES } from "../utils/constants";

export default function NotFound() {
  return (
    <section className="page page--centered">
      <h1>404</h1>
      <p>No encontramos la ruta solicitada.</p>
      <Button as={Link} to={ROUTES.login} variant="secondary">
        Regresar al inicio
      </Button>
    </section>
  );
}
