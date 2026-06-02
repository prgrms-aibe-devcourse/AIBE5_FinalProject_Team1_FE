import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CodeDock render error", error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        className="grid h-full min-h-[320px] place-items-center rounded-[30px] px-6 py-10 text-center"
        style={{
          background: "rgba(11, 22, 40, 0.84)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.34)",
          color: "var(--white)",
        }}
      >
        <div className="max-w-[520px]">
          <p className="m-0 text-base font-black tracking-tight" style={{ color: "var(--neon-cyan)" }}>
            {this.props.fallbackTitle ?? "화면을 불러오지 못했습니다"}
          </p>
          <p className="m-0 mt-3 text-sm font-bold leading-6 tracking-tight" style={{ color: "var(--muted)" }}>
            {this.props.fallbackMessage ?? "페이지 렌더링 중 오류가 발생했습니다. 다시 선택하거나 새로고침해 주세요."}
          </p>
        </div>
      </div>
    );
  }
}
