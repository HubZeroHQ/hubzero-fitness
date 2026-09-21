import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Last line of defence: if a screen crashes, show a way out instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center" style={{ background: '#0a0a0c' }}>
        <div className="max-w-sm">
          <div className="text-3xl font-bold uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Something went wrong
          </div>
          <p className="text-sm mb-5" style={{ color: '#888899' }}>
            Your saved workouts are safe. Reload the page to carry on.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-6 font-semibold uppercase tracking-wide"
            style={{ minHeight: 48, background: '#e63946', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17 }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
