import { ToastProvider } from "./components/UI/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./routes/AppRoutes";
import AppErrorBoundary from "./components/AppErrorBoundary";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
