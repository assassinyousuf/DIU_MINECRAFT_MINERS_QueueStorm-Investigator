import { useState } from 'react';
import { TicketRequest, Transaction } from '../types';

const SAMPLE_CASES: TicketRequest[] = [
  {
    ticket_id: 'TKT-001',
    complaint: 'I sent 5000 taka to a wrong number around 2pm today. Please help me get it back.',
    language: 'en',
    channel: 'in_app_chat',
    user_type: 'customer',
    transaction_history: [
      {
        transaction_id: 'TXN-9101',
        timestamp: new Date().toISOString().replace('T', 'T14:08:22').split('.')[0] + 'Z',
        type: 'transfer',
        amount: 5000,
        counterparty: '+8801719876543',
        status: 'completed',
      },
    ],
  },
  {
    ticket_id: 'TKT-002',
    complaint: 'I paid 1500 taka for a bill but the payment failed. My balance was deducted but merchant did not receive.',
    language: 'en',
    channel: 'call_center',
    user_type: 'customer',
    transaction_history: [
      {
        transaction_id: 'TXN-2201',
        timestamp: new Date().toISOString(),
        type: 'payment',
        amount: 1500,
        counterparty: 'MERCHANT-45',
        status: 'failed',
      },
    ],
  },
  {
    ticket_id: 'TKT-003',
    complaint: 'Someone called me pretending to be bKash agent and asked for my OTP. I think I was scammed.',
    language: 'en',
    channel: 'in_app_chat',
    user_type: 'customer',
    transaction_history: [],
  },
  {
    ticket_id: 'TKT-004',
    complaint: 'ভুল নম্বরে ২০০০ টাকা পাঠিয়েছি। টাকা ফেরত দিন।',
    language: 'bn',
    channel: 'in_app_chat',
    user_type: 'customer',
    transaction_history: [
      {
        transaction_id: 'TXN-3301',
        timestamp: new Date().toISOString(),
        type: 'transfer',
        amount: 2000,
        counterparty: '+8801812345678',
        status: 'completed',
      },
    ],
  },
];

interface Props {
  onSubmit: (req: TicketRequest) => void;
  loading: boolean;
}

const emptyTxn = (): Transaction => ({
  transaction_id: `TXN-${Date.now()}`,
  timestamp: new Date().toISOString().slice(0, 16),
  type: 'transfer',
  amount: 0,
  counterparty: '',
  status: 'completed',
});

export default function TicketForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<TicketRequest>({
    ticket_id: 'TKT-001',
    complaint: '',
    language: 'en',
    channel: 'in_app_chat',
    user_type: 'customer',
    transaction_history: [],
  });

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [newTxn, setNewTxn] = useState<Transaction>(emptyTxn());

  const loadSample = (idx: number) => {
    const s = SAMPLE_CASES[idx];
    setForm({ ...s, transaction_history: [] });
    setTxns(s.transaction_history ?? []);
  };

  const addTxn = () => {
    setTxns((prev) => [...prev, { ...newTxn, transaction_id: `TXN-${Date.now()}` }]);
    setNewTxn(emptyTxn());
    setShowTxnForm(false);
  };

  const removeTxn = (idx: number) => setTxns((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, transaction_history: txns });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sample loaders */}
      <div>
        <label>Load sample case</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {SAMPLE_CASES.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadSample(i)}
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
            >
              {s.ticket_id}
            </button>
          ))}
        </div>
      </div>

      {/* Core fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label>Ticket ID *</label>
          <input value={form.ticket_id} onChange={(e) => setForm({ ...form, ticket_id: e.target.value })} required />
        </div>
        <div>
          <label>Language</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as 'en' | 'bn' | 'mixed' })}>
            <option value="en">English</option>
            <option value="bn">Bangla (বাংলা)</option>
            <option value="mixed">Banglish</option>
          </select>
        </div>
        <div>
          <label>Channel</label>
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <option value="in_app_chat">In-app Chat</option>
            <option value="call_center">Call Center</option>
            <option value="email">Email</option>
            <option value="merchant_portal">Merchant Portal</option>
            <option value="field_agent">Field Agent</option>
          </select>
        </div>
        <div>
          <label>User Type</label>
          <select value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })}>
            <option value="customer">Customer</option>
            <option value="merchant">Merchant</option>
            <option value="agent">Agent</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div>
        <label>Complaint *</label>
        <textarea
          rows={4}
          value={form.complaint}
          onChange={(e) => setForm({ ...form, complaint: e.target.value })}
          placeholder="Describe the customer's complaint (English, Bangla, or Banglish)..."
          required
        />
      </div>

      {/* Transaction history */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ marginBottom: 0 }}>Transaction History ({txns.length})</label>
          <button
            type="button"
            onClick={() => setShowTxnForm(!showTxnForm)}
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
          >
            + Add
          </button>
        </div>

        {txns.map((t, i) => (
          <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.transaction_id}</span>
              {' · '}{t.type}{' · '}
              <span style={{ color: 'var(--green)' }}>{t.amount} BDT</span>
              {' · '}{t.status}
            </span>
            <button type="button" onClick={() => removeTxn(i)} style={{ background: 'transparent', color: 'var(--red)', padding: '0', fontSize: '1rem', lineHeight: 1 }}>×</button>
          </div>
        ))}

        {showTxnForm && (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div><label>Type</label>
                <select value={newTxn.type} onChange={(e) => setNewTxn({ ...newTxn, type: e.target.value as Transaction['type'] })}>
                  {['transfer','payment','cash_in','cash_out','settlement','refund'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><label>Amount (BDT)</label>
                <input type="number" value={newTxn.amount} onChange={(e) => setNewTxn({ ...newTxn, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div><label>Counterparty</label>
                <input value={newTxn.counterparty} onChange={(e) => setNewTxn({ ...newTxn, counterparty: e.target.value })} placeholder="+8801XXXXXXXXX or MERCHANT-ID" />
              </div>
              <div><label>Status</label>
                <select value={newTxn.status} onChange={(e) => setNewTxn({ ...newTxn, status: e.target.value as Transaction['status'] })}>
                  {['completed','failed','pending','reversed'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><label>Timestamp</label>
                <input type="datetime-local" value={newTxn.timestamp.slice(0, 16)} onChange={(e) => setNewTxn({ ...newTxn, timestamp: e.target.value + ':00Z' })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={addTxn} style={{ background: 'var(--green)', color: '#000' }}>Add Transaction</button>
              <button type="button" onClick={() => setShowTxnForm(false)} style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', padding: '0.65rem', fontSize: '0.95rem', marginTop: '0.25rem' }}>
        {loading ? 'Analyzing…' : 'Analyze Ticket →'}
      </button>
    </form>
  );
}
