"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await login(username, password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setUsername("");
    setPassword("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-fade-up w-full max-w-sm rounded-xl bg-elevated p-6 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Admin login"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Admin login
        </h2>
        <p className="mt-1 text-sm text-muted">
          Viewers can browse. Only admin can add or edit.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
              Username
            </span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-soft disabled:opacity-50"
            >
              {saving ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/20 px-5 py-2.5 text-sm font-bold text-muted transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
