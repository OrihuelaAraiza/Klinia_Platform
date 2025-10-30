import { Component } from "react";

export default class ErrorBoundary extends Component {
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
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="ui-card stack-2" style={{ padding: "16px" }}>
          <strong>Hubo un problema al renderizar esta sección.</strong>
          <p className="helper-text">{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
