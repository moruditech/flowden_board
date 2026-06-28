import { Component } from 'react';
import { Button } from '../ui/Button.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-64 p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 6v4M9 12.5v.5" stroke="#dc2626" strokeWidth="1.75" strokeLinecap="round"/>
            <path d="M7.3 2.5l-5.5 9.5A2 2 0 003.5 15h11a2 2 0 001.7-3L10.7 2.5a2 2 0 00-3.4 0z"
              stroke="#dc2626" strokeWidth="1.5"/>
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Something went wrong</h2>
        <p className="text-xs text-zinc-500 mb-4 max-w-xs">
          An unexpected error occurred. Reload the page or try again.
        </p>
        <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    );
  }
}
