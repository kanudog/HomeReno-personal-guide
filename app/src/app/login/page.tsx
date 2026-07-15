"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/projects";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = supabaseBrowser();

  const signIn = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      // first run: no account yet — offer to create it
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setMessage('No account with those credentials. Use "Create account" the first time.');
      } else {
        setMessage(error.message);
      }
      return;
    }
    router.push(next);
    router.refresh();
  };

  const signUp = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      "Account created. If email confirmation is on, check your inbox — then sign in. (Tip: disable new sign-ups in the Supabase dashboard once you're in.)",
    );
  };

  const magicLink = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}${next}` },
    });
    setBusy(false);
    setMessage(error ? error.message : `Magic link sent to ${email} — open it on this device.`);
  };

  const inputCls =
    "bp-dim h-12 w-full rounded-sm border border-bp-line-faint bg-bp-paper-deep px-3 text-bp-line outline-none focus:border-bp-accent";

  return (
    <main className="mx-auto flex w-full max-w-sm grow flex-col justify-center px-6 py-10">
      <div className="bp-panel p-6">
        <h1 className="bp-panel-title mb-1 text-2xl">HomeReno</h1>
        <p className="mb-5 text-sm text-bp-line-soft">Sign in to your workshop.</p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
          </label>
          <button
            onClick={signIn}
            disabled={busy || !email || !password}
            className="bp-dim h-12 rounded-sm bg-bp-accent text-[12px] uppercase tracking-widest text-bp-paper-deep transition-opacity disabled:opacity-40"
          >
            Sign in
          </button>
          <div className="flex gap-2">
            <button
              onClick={signUp}
              disabled={busy || !email || !password}
              className="bp-dim h-10 flex-1 rounded-sm border border-bp-line-faint text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors enabled:hover:border-bp-accent enabled:hover:text-bp-accent disabled:opacity-40"
            >
              Create account
            </button>
            <button
              onClick={magicLink}
              disabled={busy || !email}
              className="bp-dim h-10 flex-1 rounded-sm border border-bp-line-faint text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors enabled:hover:border-bp-accent enabled:hover:text-bp-accent disabled:opacity-40"
            >
              Email magic link
            </button>
          </div>
          {message && <p className="text-sm text-bp-warn">{message}</p>}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
