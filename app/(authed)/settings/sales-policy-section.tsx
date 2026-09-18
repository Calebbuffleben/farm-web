'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface SalesPolicy {
  discountAuthorityPct?: number | null;
  notes?: string | null;
}

/**
 * Política comercial — a alçada que o Next Best Action pode citar
 * ("ofereça até 5%"). OWNER/ADMIN editam; a IA passa a respeitar na próxima análise.
 */
export function SalesPolicySection() {
  const [pct, setPct] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ salesPolicy: SalesPolicy | null }>('/tenancy/sales-policy')
      .then((r) => {
        setPct(
          r.salesPolicy?.discountAuthorityPct != null
            ? String(r.salesPolicy.discountAuthorityPct)
            : '',
        );
        setNotes(r.salesPolicy?.notes ?? '');
      })
      .catch(() => undefined);
  }, []);

  async function onSave() {
    setSaving(true);
    setNote(null);
    setError(null);
    try {
      await api('/tenancy/sales-policy', {
        method: 'PATCH',
        body: JSON.stringify({
          discountAuthorityPct: pct.trim() === '' ? null : Number(pct),
          notes: notes.trim() || null,
        }),
      });
      setNote('Salvo. A IA usa a alçada na próxima análise.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2 className="mb-1 text-[17px] font-semibold">Política comercial</h2>
      <p className="muted mb-3 text-sm">
        O que a IA pode sugerir ao RTV no “próximo passo”. Sem alçada, ela não cita desconto.
      </p>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="grid gap-1">
          <span className="label !mb-0">Alçada de desconto (%)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="ex.: 5"
          />
        </label>
        <label className="grid gap-1">
          <span className="label !mb-0">Regras e observações</span>
          <textarea
            className="input resize-y"
            rows={2}
            maxLength={600}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex.: prazo safra até 180 dias; frete grátis acima de 20 galões"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn" disabled={saving} onClick={() => void onSave()}>
          Salvar
        </button>
        {note && <span className="text-[13px] text-accent">{note}</span>}
        {error && <span className="error text-[13px]">{error}</span>}
      </div>
    </section>
  );
}
