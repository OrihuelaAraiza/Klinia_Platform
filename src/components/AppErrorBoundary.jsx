import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Ocurrió un error inesperado.",
    };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary]", error, info);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error" role="alert">
          <h1>Algo salió mal</h1>
          <p>{this.state.message}</p>
          <button type="button" onClick={this.handleReload}>
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
