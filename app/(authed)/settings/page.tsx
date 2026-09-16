'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addWabaNumber,
  addVoiceNumber,
  assignWabaNumber,
  assignVoiceNumber,
  addEmailAddress,
  assignEmailAddress,
  createWabaAccount,
  createVoiceAccount,
  patchVoiceAccount,
  createEmailAccount,
  importCarteira,
  listMembers,
  createInvite,
  changeMemberRole,
  removeMember,
  listInvites,
  revokeInvite,
  listProducers,
  listUnknowns,
  listWabaAccounts,
  listVoiceAccounts,
  listEmailAccounts,
  resolveUnknown,
  fetchBilling,
  grantConsent,
  listConsents,
  openBillingPortal,
  revokeConsent,
  type BillingSnapshot,
  type ConsentRow,
  type ImportSummary,
  type Member,
  type ProducerRow,
  type UnknownItem,
  type WabaAccountInfo,
  type VoiceAccountInfo,
  type EmailAccountInfo,
} from '@/lib/inbox-api';
import { fetchMe, type Me } from '@/lib/api';
import { WhatsappImportSection } from './whatsapp-import-section';
import { MyWhatsappSection } from './my-whatsapp-section';
import { TeamWhatsappSection } from './team-whatsapp-section';
import { SalesPolicySection } from './sales-policy-section';
import { Icon } from '@/components/ui';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';

function webhookOrigin(account: { publicOrigin?: string | null }): string {
  return account.publicOrigin || BACKEND_URL;
}

function memberUserId(m: Member): string {
  return m.user?.id ?? m.userId ?? '';
}

function memberLabel(m: Member): string {
  return m.user?.name ?? m.user?.email ?? m.name ?? m.email ?? m.id;
}

function memberPhone(m: Member): string | null {
  return m.phone ?? m.user?.phone ?? null;
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<WabaAccountInfo[]>([]);
  const [voiceAccounts, setVoiceAccounts] = useState<VoiceAccountInfo[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountInfo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetchMe().then(setMe).catch(() => undefined);
  }, []);

  const refresh = useCallback(() => {
    listWabaAccounts()
      .then((rows) => {
        setAccounts(rows);
        setForbidden(false);
      })
      .catch((err) => {
        if (err?.status === 403) setForbidden(true);
      });
    listVoiceAccounts()
      .then(setVoiceAccounts)
      .catch(() => undefined);
    listEmailAccounts()
      .then(setEmailAccounts)
      .catch(() => undefined);
    listMembers()
      .then(setMembers)
      .catch(() => undefined);
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <div className="mx-auto grid max-w-[1120px] gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Administração</div>
          <h1 className="page-title">Configurações</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {forbidden
            ? 'Gerencie sua conexão, importações e vínculos pendentes.'
            : 'Equipe, regras comerciais, canais e governança da sua operação.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted">
          <span className="size-2 rounded-full bg-accent" />
          Ambiente da revenda
        </div>
      </header>

      {forbidden ? (
        <div className="settings-grid grid gap-5">
          <MyWhatsappSection />
          <WhatsappImportSection myName={me?.user.name} />
          <div id="unknown" className="scroll-mt-8"><UnknownsSection /></div>
        </div>
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="sticky top-8 hidden rounded-card border border-border bg-surface p-2 shadow-sm lg:block">
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Nesta página</p>
            <SettingsLink href="#equipe" label="Equipe e estratégia" />
            <SettingsLink href="#canais" label="Canais de contato" />
            <SettingsLink href="#dados" label="Dados e governança" />
          </aside>
          <div className="settings-grid grid gap-8">
            <SettingsGroup
              id="equipe"
              eyebrow="Pessoas e operação"
              title="Equipe e estratégia"
              description="Defina acessos, política comercial e acompanhe as conexões do time."
            >
              <TeamSection members={members} onChanged={refresh} />
              <SalesPolicySection />
              <TeamWhatsappSection />
              <MyWhatsappSection />
              <BillingSection />
            </SettingsGroup>
            <SettingsGroup
              id="canais"
              eyebrow="Integrações"
              title="Canais de contato"
              description="Conecte os pontos de entrada usados no relacionamento com produtores."
            >
              <WabaSection accounts={accounts} members={members} onChanged={refresh} />
              <VoiceSection accounts={voiceAccounts} members={members} onChanged={refresh} />
              <EmailSection accounts={emailAccounts} members={members} onChanged={refresh} />
              <WhatsappImportSection myName={me?.user.name} />
            </SettingsGroup>
            <SettingsGroup
              id="dados"
              eyebrow="Controle"
              title="Dados e governança"
              description="Mantenha carteira, consentimentos e vínculos humanos sob controle."
            >
              <CarteiraSection />
              <ConsentSection />
              <div id="unknown" className="scroll-mt-8"><UnknownsSection /></div>
            </SettingsGroup>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-control px-3 py-2.5 text-[13px] font-medium text-muted transition hover:bg-surface-2 hover:text-text">
      {label}
      <Icon name="chevron" className="size-3.5" />
    </a>
  );
}

function SettingsGroup({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-4">
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function TeamSection({
  members,
  onChanged,
}: {
  members: Member[];
  onChanged: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: string; status: string }>>([]);

  const loadInvites = useCallback(() => {
    listInvites().then(setInvites).catch(() => undefined);
  }, []);
  useEffect(loadInvites, [loadInvites]);

  async function onInvite() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    try {
      const created = await createInvite(email.trim(), 'MEMBER');
      setInviteUrl(
        created.inviteUrl ||
          `${window.location.origin}/accept-invite?token=${encodeURIComponent(created.token)}`,
      );
      setEmail('');
      loadInvites();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao convidar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Time da revenda</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Convide o RTV (MEMBER). Ele abre o link do convite (só aparece uma vez).
      </p>
      {members.map((m) => (
        <div
          key={m.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <span style={{ flex: 1 }}>{memberLabel(m)}</span>
          <select
            className="input"
            style={{ maxWidth: 140 }}
            value={m.role}
            disabled={m.role === 'OWNER'}
            onChange={(e) => {
              void changeMemberRole(m.id, e.target.value).then(onChanged).catch(() => onChanged());
            }}
          >
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="MEMBER">MEMBER</option>
          </select>
          {m.role !== 'OWNER' && (
            <button
              type="button"
              onClick={() => {
                void removeMember(m.id).then(onChanged).catch(() => onChanged());
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
              }}
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="input"
          type="email"
          placeholder="rtv@revenda.test"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn" disabled={busy || !email.trim()} onClick={() => void onInvite()}>
          Convidar RTV
        </button>
      </div>
      {error && <p className="error" style={{ fontSize: 13, marginTop: 8 }}>{error}</p>}
      {inviteUrl && (
        <p style={{ fontSize: 13, marginTop: 8, wordBreak: 'break-all' }}>
          Envie este link agora: <code>{inviteUrl}</code>{' '}
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(inviteUrl)}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13 }}
          >
            Copiar
          </button>
        </p>
      )}
      {invites.length > 0 && (
        <ul className="muted" style={{ fontSize: 13, marginTop: 12, paddingLeft: 18 }}>
          {invites.map((i) => (
            <li key={i.id}>
              {i.email} · {i.role} · {i.status}{' '}
              {i.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    void revokeInvite(i.id).then(loadInvites);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  revogar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WabaSection({
  accounts,
  members,
  onChanged,
}: {
  accounts: WabaAccountInfo[];
  members: Member[];
  onChanged: () => void;
}) {
  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [provider, setProvider] = useState<'BSP_360DIALOG' | 'META_DIRECT'>(
    'BSP_360DIALOG',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreateAccount() {
    if (!apiToken.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createWabaAccount({
        apiToken: apiToken.trim(),
        provider,
        ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
      });
      setApiToken('');
      setWebhookSecret('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar conta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>Canal WhatsApp (WABA)</h2>

      {accounts.map((account) => (
        <div key={account.id} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14 }}>
            Conta <code>{account.id.slice(0, 8)}…</code> · {account.provider} ·{' '}
            {account.status}
          </p>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>
            Webhook ({account.provider === 'META_DIRECT' ? 'Meta App Dashboard' : '360dialog'}):{' '}
            <code>
              {webhookOrigin(account)}
              {account.webhookPath}
            </code>
          </p>
          <NumbersTable account={account} members={members} onChanged={onChanged} />
        </div>
      ))}

      <div style={{ borderTop: accounts.length ? '1px solid var(--border)' : 'none', paddingTop: accounts.length ? 16 : 0 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          {accounts.length ? 'Adicionar outra conta' : 'Conectar conta WABA'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            className="input"
            value={provider}
            onChange={(e) =>
              setProvider(e.target.value as 'BSP_360DIALOG' | 'META_DIRECT')
            }
          >
            <option value="BSP_360DIALOG">360dialog (BSP)</option>
            <option value="META_DIRECT">Meta Cloud API</option>
          </select>
          <input
            className="input"
            type="password"
            placeholder={
              provider === 'META_DIRECT'
                ? 'System user token (Bearer)'
                : 'D360-API-KEY'
            }
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
          <input
            className="input"
            placeholder="Webhook secret (opcional)"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
          />
          {error && <p className="error" style={{ fontSize: 13 }}>{error}</p>}
          <button className="btn" onClick={onCreateAccount} disabled={busy || !apiToken.trim()}>
            Conectar
          </button>
        </div>
      </div>
    </section>
  );
}

function NumbersTable({
  account,
  members,
  onChanged,
}: {
  account: WabaAccountInfo;
  members: Member[];
  onChanged: () => void;
}) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayNumber, setDisplayNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    if (!phoneNumberId.trim() || !displayNumber.trim()) return;
    setError(null);
    try {
      await addWabaNumber(account.id, {
        phoneNumberId: phoneNumberId.trim(),
        displayNumber: displayNumber.trim(),
      });
      setPhoneNumberId('');
      setDisplayNumber('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar número');
    }
  }

  async function onAssign(numberId: string, userId: string) {
    try {
      await assignWabaNumber(numberId, userId || null);
      onChanged();
    } catch {
      // erro de atribuição não é crítico; recarrega estado real
      onChanged();
    }
  }

  return (
    <div>
      {account.numbers.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <span style={{ minWidth: 150 }}>{n.displayNumber}</span>
          <span className="muted" style={{ fontSize: 12 }}>{n.phoneNumberId}</span>
          <select
            className="input"
            style={{ maxWidth: 260, marginLeft: 'auto' }}
            value={n.assignedUser?.id ?? ''}
            onChange={(e) => onAssign(n.id, e.target.value)}
          >
            <option value="">— sem RTV designado —</option>
            {members.map((m) => (
              <option key={memberUserId(m)} value={memberUserId(m)}>
                {memberLabel(m)} ({m.role})
              </option>
            ))}
          </select>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          className="input"
          placeholder="phone_number_id"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
        />
        <input
          className="input"
          placeholder="+55 66 9999-0000"
          value={displayNumber}
          onChange={(e) => setDisplayNumber(e.target.value)}
        />
        <button className="btn" onClick={onAdd} disabled={!phoneNumberId.trim() || !displayNumber.trim()}>
          Adicionar
        </button>
      </div>
      {error && <p className="error" style={{ fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function VoiceSection({
  accounts,
  members,
  onChanged,
}: {
  accounts: VoiceAccountInfo[];
  members: Member[];
  onChanged: () => void;
}) {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [apiKeySid, setApiKeySid] = useState('');
  const [apiKeySecret, setApiKeySecret] = useState('');
  const [twimlAppSid, setTwimlAppSid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!accountSid.trim() || !authToken.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createVoiceAccount({
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
        ...(apiKeySid.trim() ? { apiKeySid: apiKeySid.trim() } : {}),
        ...(apiKeySecret.trim() ? { apiKeySecret: apiKeySecret.trim() } : {}),
        ...(twimlAppSid.trim() ? { twimlAppSid: twimlAppSid.trim() } : {}),
      });
      setAccountSid('');
      setAuthToken('');
      setApiKeySid('');
      setApiKeySecret('');
      setTwimlAppSid('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao conectar Twilio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>Telefonia (Twilio Voice)</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Ponte PSTN e softphone no inbox (Twilio Voice JS). No console Twilio,
        Voice URL e recording callback são os caminhos abaixo. Softphone
        precisa de API Key (SK) e, para ligar do navegador, um TwiML App com
        a mesma Voice URL. A URL pública precisa bater com <code>FARM_PUBLIC_URL</code>.
      </p>
      {accounts.map((account) => (
        <div key={account.id} style={{ marginBottom: 20 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Voice URL:{' '}
            <code>
              {webhookOrigin(account)}
              {account.webhookPath}
            </code>
            <br />
            Recording callback:{' '}
            <code>
              {webhookOrigin(account)}
              {account.recordingPath}
            </code>
            {account.softphone && (
              <>
                <br />
                Softphone:{' '}
                {account.softphone.apiKey ? 'API Key ok' : 'sem API Key'}
                {account.softphone.twimlApp ? ' · TwiML App ok' : ''}
              </>
            )}
          </p>
          <SoftphoneKeysForm account={account} onChanged={onChanged} />
          <VoiceNumbersTable account={account} members={members} onChanged={onChanged} />
        </div>
      ))}
      <div style={{ borderTop: accounts.length ? '1px solid var(--border)' : 'none', paddingTop: accounts.length ? 16 : 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="input"
            placeholder="Account SID (ACxx…)"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Auth Token"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
          <input
            className="input"
            placeholder="API Key SID (SKxx…) — softphone, opcional"
            value={apiKeySid}
            onChange={(e) => setApiKeySid(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="API Key Secret — softphone, opcional"
            value={apiKeySecret}
            onChange={(e) => setApiKeySecret(e.target.value)}
          />
          <input
            className="input"
            placeholder="TwiML App SID (APxx…) — ligar do navegador"
            value={twimlAppSid}
            onChange={(e) => setTwimlAppSid(e.target.value)}
          />
          {error && <p className="error" style={{ fontSize: 13 }}>{error}</p>}
          <button
            className="btn"
            onClick={onCreate}
            disabled={busy || !accountSid.trim() || !authToken.trim()}
          >
            Conectar Twilio
          </button>
        </div>
      </div>
    </section>
  );
}

function SoftphoneKeysForm({
  account,
  onChanged,
}: {
  account: VoiceAccountInfo;
  onChanged: () => void;
}) {
  const [apiKeySid, setApiKeySid] = useState('');
  const [apiKeySecret, setApiKeySecret] = useState('');
  const [twimlAppSid, setTwimlAppSid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!apiKeySid.trim() && !apiKeySecret.trim() && !twimlAppSid.trim()) return;
    if (Boolean(apiKeySid.trim()) !== Boolean(apiKeySecret.trim())) {
      setError('SID e Secret da API Key precisam ir juntos');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchVoiceAccount(account.id, {
        ...(apiKeySid.trim() ? { apiKeySid: apiKeySid.trim() } : {}),
        ...(apiKeySecret.trim() ? { apiKeySecret: apiKeySecret.trim() } : {}),
        ...(twimlAppSid.trim() ? { twimlAppSid: twimlAppSid.trim() } : {}),
      });
      setApiKeySid('');
      setApiKeySecret('');
      setTwimlAppSid('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gravar API Key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <input
        className="input"
        placeholder="API Key SID (SKxx…)"
        value={apiKeySid}
        onChange={(e) => setApiKeySid(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="API Key Secret"
        value={apiKeySecret}
        onChange={(e) => setApiKeySecret(e.target.value)}
      />
      <input
        className="input"
        placeholder="TwiML App SID (APxx…)"
        value={twimlAppSid}
        onChange={(e) => setTwimlAppSid(e.target.value)}
      />
      {error && <p className="error" style={{ fontSize: 13 }}>{error}</p>}
      <button
        className="btn"
        onClick={() => void onSave()}
        disabled={busy || (!apiKeySid.trim() && !apiKeySecret.trim() && !twimlAppSid.trim())}
      >
        Gravar chaves do softphone
      </button>
    </div>
  );
}

function VoiceNumbersTable({
  account,
  members,
  onChanged,
}: {
  account: VoiceAccountInfo;
  members: Member[];
  onChanged: () => void;
}) {
  const [address, setAddress] = useState('');
  const [rtvPhone, setRtvPhone] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    if (!address.trim()) return;
    setError(null);
    try {
      await addVoiceNumber(account.id, {
        address: address.trim(),
        ...(assignedUserId ? { assignedUserId } : {}),
        ...(rtvPhone.trim() ? { rtvPhone: rtvPhone.trim() } : {}),
      });
      setAddress('');
      setRtvPhone('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar número');
    }
  }

  return (
    <div>
      {account.endpoints.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <span style={{ minWidth: 150 }}>{n.displayAddress}</span>
          <span className="muted" style={{ fontSize: 12 }}>
            RTV {n.assignedUser?.phone ?? 'sem celular'}
          </span>
          <select
            className="input"
            style={{ maxWidth: 260, marginLeft: 'auto' }}
            value={n.assignedUser?.id ?? ''}
            onChange={(e) => {
              const assignedUserId = e.target.value || null;
              const member = members.find((m) => memberUserId(m) === assignedUserId);
              const phone = member ? memberPhone(member) : null;
              void assignVoiceNumber(n.id, {
                assignedUserId,
                ...(phone ? { rtvPhone: phone } : {}),
              })
                .then(onChanged)
                .catch(onChanged);
            }}
          >
            <option value="">— sem RTV designado —</option>
            {members.map((m) => (
              <option key={memberUserId(m)} value={memberUserId(m)}>
                {memberLabel(m)} ({m.role})
              </option>
            ))}
          </select>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <input
          className="input"
          placeholder="Número Farm E.164"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 220 }}
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value)}
        >
          <option value="">RTV</option>
          {members.map((m) => (
            <option key={memberUserId(m)} value={memberUserId(m)}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Celular do RTV E.164"
          value={rtvPhone}
          onChange={(e) => setRtvPhone(e.target.value)}
        />
        <button className="btn" onClick={onAdd} disabled={!address.trim()}>
          Adicionar
        </button>
      </div>
      {error && <p className="error" style={{ fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function EmailSection({
  accounts,
  members,
  onChanged,
}: {
  accounts: EmailAccountInfo[];
  members: Member[];
  onChanged: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [domain, setDomain] = useState('');
  const [signingKey, setSigningKey] = useState('');
  const [region, setRegion] = useState<'us' | 'eu'>('us');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!apiKey.trim() || !domain.trim() || !signingKey.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createEmailAccount({
        apiKey: apiKey.trim(),
        domain: domain.trim(),
        signingKey: signingKey.trim(),
        region,
      });
      setApiKey('');
      setDomain('');
      setSigningKey('');
      setRegion('us');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao conectar Mailgun');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>E-mail (Mailgun)</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Inbound HTTP (não IMAP). No Mailgun, a rota <code>match_recipient</code>{' '}
        aponta para o webhook abaixo. Resposta do RTV usa a Messages API com
        In-Reply-To.
      </p>
      {accounts.map((account) => (
        <div key={account.id} style={{ marginBottom: 20 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Inbound URL:{' '}
            <code>
              {webhookOrigin(account)}
              {account.webhookPath}
            </code>
          </p>
          <EmailAddressesTable account={account} members={members} onChanged={onChanged} />
        </div>
      ))}
      <div style={{ borderTop: accounts.length ? '1px solid var(--border)' : 'none', paddingTop: accounts.length ? 16 : 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="input"
            placeholder="Mailgun domain (mg.exemplo.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Webhook signing key (HTTP webhook, não a API key)"
            value={signingKey}
            onChange={(e) => setSigningKey(e.target.value)}
          />
          <select
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value as 'us' | 'eu')}
          >
            <option value="us">Mailgun EUA (api.mailgun.net)</option>
            <option value="eu">Mailgun Europa (api.eu.mailgun.net)</option>
          </select>
          {error && <p className="error" style={{ fontSize: 13 }}>{error}</p>}
          <button
            className="btn"
            onClick={onCreate}
            disabled={busy || !apiKey.trim() || !domain.trim() || !signingKey.trim()}
          >
            Conectar Mailgun
          </button>
        </div>
      </div>
    </section>
  );
}

function EmailAddressesTable({
  account,
  members,
  onChanged,
}: {
  account: EmailAccountInfo;
  members: Member[];
  onChanged: () => void;
}) {
  const [address, setAddress] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    if (!address.trim()) return;
    setError(null);
    try {
      await addEmailAddress(account.id, {
        address: address.trim(),
        ...(assignedUserId ? { assignedUserId } : {}),
      });
      setAddress('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar endereço');
    }
  }

  return (
    <div>
      {account.endpoints.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <span style={{ minWidth: 180 }}>{n.displayAddress}</span>
          <select
            className="input"
            style={{ maxWidth: 260, marginLeft: 'auto' }}
            value={n.assignedUser?.id ?? ''}
            onChange={(e) => {
              void assignEmailAddress(n.id, e.target.value || null)
                .then(onChanged)
                .catch(onChanged);
            }}
          >
            <option value="">— sem RTV designado —</option>
            {members.map((m) => (
              <option key={memberUserId(m)} value={memberUserId(m)}>
                {memberLabel(m)} ({m.role})
              </option>
            ))}
          </select>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <input
          className="input"
          placeholder="revenda-slug@inbound.exemplo.com"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 220 }}
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value)}
        >
          <option value="">RTV</option>
          {members.map((m) => (
            <option key={memberUserId(m)} value={memberUserId(m)}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
        <button className="btn" onClick={onAdd} disabled={!address.trim()}>
          Adicionar
        </button>
      </div>
      {error && <p className="error" style={{ fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function CarteiraSection() {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await importCarteira(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no import');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Carteira de produtores</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        CSV com colunas: <code>produtor, telefone, email, fazenda, regiao, area_ha, cultura, safra</code>{' '}
        (delimitador vírgula ou ponto-e-vírgula). O import é repetível — linhas já
        existentes são atualizadas, nunca duplicadas.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {busy && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Importando…</p>}
      {error && <p className="error" style={{ fontSize: 13, marginTop: 8 }}>{error}</p>}
      {summary && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <p>
            {summary.rows} linhas · {summary.producers} produtores novos ·{' '}
            {summary.phones} telefones · {summary.emails ?? 0} e-mails · {summary.farms} fazendas novas ·{' '}
            {summary.cropSeasons} safras
          </p>
          {summary.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="error" style={{ cursor: 'pointer', fontSize: 13 }}>
                {summary.errors.length} linhas com erro
              </summary>
              <ul className="muted" style={{ fontSize: 13, marginTop: 6, paddingLeft: 18 }}>
                {summary.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function UnknownsSection() {
  const [items, setItems] = useState<UnknownItem[]>([]);
  const [producers, setProducers] = useState<ProducerRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listUnknowns().then(setItems).catch(() => undefined);
    listProducers().then(setProducers).catch(() => undefined);
  }, []);

  useEffect(refresh, [refresh]);

  const farms = producers.flatMap((p) =>
    p.farms.map((f) => ({ id: f.id, label: `${p.name} · ${f.name}` })),
  );

  async function resolve(id: string, farmId: string | null) {
    setBusyId(id);
    try {
      await resolveUnknown(id, farmId);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Fila unknown</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Mensagens em que o extrator não vinculou a fazenda com confiança.
        Um toque confirma o vínculo humano — o LLM não sobrescreve.
      </p>
      {items.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>Nenhum item pendente.</p>
      )}
      {items.map((item) => {
        const candidates = Array.isArray(item.candidates) ? item.candidates : [];
        const farmName = (id: string) =>
          farms.find((f) => f.id === id)?.label ?? id.slice(0, 8);
        return (
          <div
            key={item.id}
            style={{
              borderTop: '1px solid var(--border)',
              padding: '12px 0',
              fontSize: 14,
            }}
          >
            <p>
              <strong>
                {item.message.conversation.producer?.name ??
                  item.message.conversation.producerPhone}
              </strong>
              <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                {new Date(item.message.sentAt).toLocaleString('pt-BR')}
              </span>
            </p>
            <p style={{ margin: '6px 0', fontStyle: 'italic' }}>
              {item.spanText || item.message.transcript || item.message.body || '—'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {candidates.map((c) => (
                <button
                  key={c.farmId}
                  className="btn"
                  disabled={busyId === item.id}
                  onClick={() => resolve(item.id, c.farmId)}
                >
                  {farmName(c.farmId)} ({Math.round(c.confidence * 100)}%)
                </button>
              ))}
              <select
                className="input"
                style={{ maxWidth: 280 }}
                defaultValue=""
                disabled={busyId === item.id}
                onChange={(e) => {
                  if (e.target.value) void resolve(item.id, e.target.value);
                }}
              >
                <option value="">Outra fazenda…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                disabled={busyId === item.id}
                onClick={() => resolve(item.id, null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  borderRadius: 10,
                  padding: '10px 18px',
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function BillingSection() {
  const [snap, setSnap] = useState<BillingSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchBilling().then(setSnap).catch(() => undefined);
  }, []);

  if (!snap) return null;

  async function onPortal() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal indisponível (Stripe)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Plano e assentos</h2>
      <p style={{ fontSize: 14 }}>
        {snap.plan} · {snap.status} · {snap.memberCount}/{snap.maxUsers} assentos
        {snap.seatsRemaining >= 0 ? ` · ${snap.seatsRemaining} livres` : ''}
      </p>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={busy}
        onClick={() => void onPortal()}
      >
        Portal de cobrança
      </button>
    </section>
  );
}

function ConsentSection() {
  const [items, setItems] = useState<ConsentRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listConsents().then(setItems).catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);

  async function toggle(row: ConsentRow) {
    setBusyId(row.id);
    try {
      if (row.revokedAt) await grantConsent(row.producer.id, row.purpose);
      else await revokeConsent(row.producer.id, row.purpose);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Consentimento (LGPD)</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        No primeiro contato no canal corporativo gravamos o grant. Revogar
        análise bloqueia o extrator; revogar retenção agenda o expurgo da mídia.
      </p>
      {items.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>Nenhum registro ainda.</p>
      )}
      {items.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 0',
            borderTop: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <div>
            <strong>{row.producer.name}</strong>
            <span className="muted" style={{ marginLeft: 8 }}>
              {row.purpose === 'CONVERSATION_ANALYSIS' ? 'análise' : 'mídia'} ·{' '}
              {row.revokedAt ? 'revogado' : 'ativo'}
            </span>
          </div>
          <button
            disabled={busyId === row.id}
            onClick={() => void toggle(row)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            {row.revokedAt ? 'Reativar' : 'Revogar'}
          </button>
        </div>
      ))}
    </section>
  );
}
