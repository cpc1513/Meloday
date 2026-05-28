import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: 40, textAlign: 'center', color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            出错了
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            应用遇到了意外问题，请尝试刷新页面
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', background: 'var(--accent-dark)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer'
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
