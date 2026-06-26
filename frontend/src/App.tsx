import { useState } from 'react';
import TicketForm from './components/TicketForm';
import AnalysisResult from './components/AnalysisResult';
import { TicketRequest, TicketResponse } from './types';
import './App.css';

export default function App() {
  const [result, setResult] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setHealthStatus(res.ok ? 'ok' : 'error');
    } catch {
      setHealthStatus('error');
    }
  };

  const handleSubmit = async (req: TicketRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setResult(null);
      } else {
        setResult(data as TicketResponse);
      }
    } catch (e) {
      setError((e as Error).message ?? 'Network error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <span className="logo">⚡</span>
          <div>
            <h1>QueueStorm Investigator</h1>
            <p>bKash · SUST CSE Carnival 2026 Hackathon</p>
          </div>
        </div>
        <div className="header-right">
          <span
            className={`health-dot ${healthStatus}`}
            onClick={checkHealth}
            title="Click to check /health"
          />
          <span className="health-label">
            {healthStatus === 'unknown' ? 'Check health' : healthStatus === 'ok' ? 'API online' : 'API offline'}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="app-body">
        <section className="panel">
          <h2 className="panel-title">Submit Ticket</h2>
          <TicketForm onSubmit={handleSubmit} loading={loading} />
        </section>

        <section className="panel result-panel">
          <h2 className="panel-title">Analysis Result</h2>
          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error}
            </div>
          )}
          {!result && !error && !loading && (
            <div className="empty-state">
              Submit a ticket to see the investigation result here.
            </div>
          )}
          {loading && (
            <div className="loading-box">
              <span className="spinner" /> Investigating…
            </div>
          )}
          {result && !loading && <AnalysisResult result={result} />}
        </section>
      </main>
    </div>
  );
}
