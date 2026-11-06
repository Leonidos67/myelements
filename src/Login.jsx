import { useState } from 'react';
import { api } from './api';

export default function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const me = await api.login(u, p);
      onLogin(me);
    } catch {
      setErr('неверный логин или пароль');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'h-9 px-2.5 text-xs bg-surface-2 text-ink border border-line-strong rounded-lg outline-none focus:border-brand w-full';

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-inset">
      <form onSubmit={submit} className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Личный кабинет</div>
          <div className="text-[10px] text-muted font-mono">for partners @RubUP</div>
        </div>
        <input className={inputCls} placeholder="username" value={u} onChange={e => setU(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="password" type="password" value={p} onChange={e => setP(e.target.value)} />
        {err && <div className="text-[11px] text-red-500">{err}</div>}
        <button disabled={busy} className="h-9 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
          {busy ? '…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}