import { ToastProvider } from "./components/UI/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import { BreadcrumbProvider } from "./context/BreadcrumbContext";
import AppRoutes from "./routes/AppRoutes";
import AppErrorBoundary from "./components/AppErrorBoundary";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BreadcrumbProvider>
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </BreadcrumbProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
