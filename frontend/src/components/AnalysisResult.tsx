import { TicketResponse } from '../types';

interface Props { result: TicketResponse }

const SEVERITY_COLOR: Record<string, string> = {
  low: 'var(--green)',
  medium: 'var(--yellow)',
  high: 'var(--orange)',
  critical: 'var(--red)',
};

const VERDICT_COLOR: Record<string, string> = {
  consistent: 'var(--green)',
  inconsistent: 'var(--orange)',
  insufficient_data: 'var(--muted)',
};

const DEPT_ICON: Record<string, string> = {
  customer_support: '🎧',
  dispute_resolution: '⚖️',
  payments_ops: '💳',
  merchant_operations: '🏪',
  agent_operations: '🤝',
  fraud_risk: '🚨',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      background: color + '22',
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function AnalysisResult({ result }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <Badge label={result.severity} color={SEVERITY_COLOR[result.severity]} />
        <Badge label={result.evidence_verdict} color={VERDICT_COLOR[result.evidence_verdict]} />
        <Badge label={result.case_type} color="var(--accent)" />
        {result.human_review_required && (
          <Badge label="Human Review" color="var(--red)" />
        )}
        {result.confidence != null && (
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <Field label="Ticket ID">
        <code style={{ color: 'var(--accent)' }}>{result.ticket_id}</code>
      </Field>

      <Field label="Department">
        {DEPT_ICON[result.department] ?? '📋'} {result.department.replace(/_/g, ' ')}
      </Field>

      {result.relevant_transaction_id && (
        <Field label="Linked Transaction">
          <code style={{ color: 'var(--green)' }}>{result.relevant_transaction_id}</code>
        </Field>
      )}

      <Field label="Agent Summary">
        {result.agent_summary}
      </Field>

      <Field label="Recommended Next Action">
        {result.recommended_next_action}
      </Field>

      <Field label="Customer Reply">
        <div style={{
          background: 'var(--surface2)',
          borderRadius: '8px',
          padding: '0.75rem',
          fontStyle: 'italic',
          color: 'var(--text)',
          borderLeft: '3px solid var(--accent)',
        }}>
          {result.customer_reply}
        </div>
      </Field>

      {result.reason_codes && result.reason_codes.length > 0 && (
        <Field label="Reason Codes">
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {result.reason_codes.map((code) => (
              <span key={code} style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.15rem 0.45rem',
                fontSize: '0.72rem',
                color: 'var(--muted)',
                fontFamily: 'monospace',
              }}>
                {code}
              </span>
            ))}
          </div>
        </Field>
      )}

      {/* Raw JSON toggle */}
      <details style={{ marginTop: '0.5rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted)', userSelect: 'none' }}>
          View raw JSON
        </summary>
        <pre style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.75rem',
          fontSize: '0.72rem',
          overflow: 'auto',
          marginTop: '0.5rem',
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}
