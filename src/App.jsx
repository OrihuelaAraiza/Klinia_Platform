import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/UI/Toast";

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
