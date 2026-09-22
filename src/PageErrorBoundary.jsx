import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    globalThis.console?.error?.('[xingmu-page-error]', error, info);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  retry = () => {
    if (import.meta.env.DEV && ['page-error', 'modal-error'].includes(new window.URLSearchParams(window.location.search).get('xingmuQa'))) {
      const url = new window.URL(window.location.href);
      url.searchParams.delete('xingmuQa');
      window.history.replaceState({}, '', url);
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="page-scroll page-error-boundary" role="alert" data-error-boundary="page">
      <section className="projects-empty">
        <AlertCircle size={32}/>
        <b>{this.props.label || '当前页面'}暂时无法显示</b>
        <p>页面发生运行错误，已保护当前项目数据。可以重试当前页面，或返回项目总览。</p>
        <div className="modal-actions">
          <button className="outline" onClick={() => this.props.onNavigate?.('overview')}>返回项目总览</button>
          <button className="primary" onClick={this.retry}><RefreshCw size={16}/>重试当前页面</button>
        </div>
      </section>
    </main>;
  }
}
