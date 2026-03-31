import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  website: string;
  category?: string;
}

type PopupState = 'loading' | 'no-host' | 'locked' | 'ready';

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>('loading');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [origin, setOrigin] = useState('');
  const [hostname, setHostname] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // ── Save form state ──────────────────────────────────────────────────────────
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveUsername, setSaveUsername] = useState('');
  const [savePassword, setSavePassword] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    // Get vault + host status
    chrome.runtime.sendMessage({ type: 'VAULT_STATUS_REQUEST' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        setState('no-host');
        return;
      }
      if (res.hostAvailable === false) {
        setState('no-host');
        return;
      }
      if (res.locked) {
        setState('locked');
        return;
      }
      setState('ready');
    });

    // Get current tab origin
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          setOrigin(url.origin);
          setHostname(url.hostname);
          setSaveTitle(url.hostname);

          chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS', origin: url.origin }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res?.credentials) setCredentials(res.credentials);
          });
        } catch { /* ignore non-HTTP urls */ }
      }
    });
  }, []);

  const autofill = (credential: Credential) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'FILL_CREDENTIAL', credential });
        window.close();
      }
    });
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savePassword.trim()) return;
    setSaveStatus('saving');
    chrome.runtime.sendMessage(
      { type: 'SAVE_CREDENTIAL', title: saveTitle.trim() || hostname, username: saveUsername.trim(), password: savePassword.trim(), origin },
      (res) => {
        if (chrome.runtime.lastError || res?.type === 'error') {
          setSaveStatus('error');
        } else {
          setSaveStatus('saved');
          setSavePassword('');
          setTimeout(() => { setSaveStatus('idle'); setShowSaveForm(false); }, 2000);
        }
      }
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="w-[340px] flex items-center justify-center py-10 bg-[#0f0a1e] text-slate-400 text-sm gap-2">
        <span className="material-symbols-outlined text-primary animate-spin text-xl">progress_activity</span>
        <span>Loading…</span>
      </div>
    );
  }

  // ── No native host ────────────────────────────────────────────────────────────
  if (state === 'no-host') {
    return (
      <div className="w-[340px] bg-[#0f0a1e] text-slate-100 font-sans">
        <header className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <h1 className="text-sm font-bold">Password Manager</h1>
        </header>
        <div className="p-5 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mt-1">
            <span className="material-symbols-outlined text-amber-400 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              link_off
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">Desktop app not connected</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Open the Password Manager desktop app, then click the extension icon again.
            </p>
          </div>
          <div className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 text-left space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Setup required (first time)</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Open the desktop app</li>
              <li>Go to <span className="text-primary">Settings → Extension</span></li>
              <li>Click <span className="text-primary">Register Native Host</span></li>
              <li>Reload this extension</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ── Vault locked ─────────────────────────────────────────────────────────────
  if (state === 'locked') {
    return (
      <div className="w-[340px] bg-[#0f0a1e] text-slate-100 font-sans">
        <header className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <h1 className="text-sm font-bold">Password Manager</h1>
        </header>
        <div className="p-5 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mt-1">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_lock
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">Vault is locked</p>
            <p className="text-xs text-slate-400 mt-1">Open the desktop app and enter your master password to unlock.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-[340px] bg-[#0f0a1e] text-slate-100 font-sans">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold">Password Manager</h1>
          {hostname && (
            <p className="text-[10px] text-slate-500 truncate">{hostname}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Vault unlocked" />
          <span className="text-[10px] text-emerald-400 font-medium">Unlocked</span>
        </div>
      </header>

      {/* Credential list */}
      <div className="p-2.5 space-y-1.5 max-h-[380px] overflow-y-auto">
        {credentials.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-7 text-center">
            <span className="material-symbols-outlined text-slate-600 text-4xl">search_off</span>
            <p className="text-xs text-slate-500">
              No saved passwords for<br />
              <span className="text-slate-400 font-medium">{hostname || 'this page'}</span>
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider px-1 pt-1">
              {credentials.length} saved login{credentials.length > 1 ? 's' : ''}
            </p>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer group border border-transparent hover:border-slate-700"
              >
                {/* Favicon / icon */}
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300 uppercase">
                  {cred.title.charAt(0)}
                </div>

                <div className="flex-1 min-w-0" onClick={() => autofill(cred)}>
                  <p className="text-sm font-semibold truncate">{cred.title}</p>
                  <p className="text-xs text-slate-400 truncate">{cred.username}</p>
                  {cred.category && (
                    <span className="inline-block text-[9px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5">
                      {cred.category}
                    </span>
                  )}
                </div>

                {/* Action buttons — visible on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => copyText(cred.username, `u-${cred.id}`)}
                    title="Copy username"
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {copied === `u-${cred.id}` ? 'check' : 'person'}
                    </span>
                  </button>
                  <button
                    onClick={() => copyText(cred.password, `p-${cred.id}`)}
                    title="Copy password"
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {copied === `p-${cred.id}` ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  <button
                    onClick={() => autofill(cred)}
                    title="Autofill"
                    className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base leading-none">login</span>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Save to vault form / toggle */}
      {showSaveForm ? (
        <form onSubmit={handleSaveCredential} className="border-t border-slate-800 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Save new credential</p>
          <input
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="Title (e.g. GitHub)"
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none focus:border-primary placeholder:text-slate-600"
          />
          <input
            value={saveUsername}
            onChange={(e) => setSaveUsername(e.target.value)}
            placeholder="Username / email"
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none focus:border-primary placeholder:text-slate-600"
          />
          <input
            type="password"
            value={savePassword}
            onChange={(e) => setSavePassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none focus:border-primary placeholder:text-slate-600"
          />
          {saveStatus === 'error' && (
            <p className="text-[11px] text-red-400">Failed to send — make sure the desktop app is open.</p>
          )}
          {saveStatus === 'saved' && (
            <p className="text-[11px] text-emerald-400">✓ Awaiting confirmation in the desktop app.</p>
          )}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => { setShowSaveForm(false); setSaveStatus('idle'); }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className="flex-1 text-xs py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-60"
            >
              {saveStatus === 'saving' ? 'Sending…' : saveStatus === 'saved' ? '✓ Sent' : 'Save to vault'}
            </button>
          </div>
        </form>
      ) : (
        <footer className="px-4 py-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">Manage passwords in the desktop app</span>
          <button
            onClick={() => { setShowSaveForm(true); setSaveStatus('idle'); }}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            title="Save a new credential for this site"
          >
            <span className="material-symbols-outlined text-sm leading-none">add_circle</span>
            Save
          </button>
        </footer>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
