"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Status =
  | "init"
  | "processing"
  | "needs_password"
  | "updating_password"
  | "done"
  | "error";

export default function AuthCallbackPage() {
  const router = useRouter();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnon) return null;
    return createBrowserClient(supabaseUrl, supabaseAnon);
  }, [supabaseUrl, supabaseAnon]);

  const [status, setStatus] = useState<Status>("init");
  const [message, setMessage] = useState<string>("Working...");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const showPasswordForm =
    status === "needs_password" || status === "updating_password";
  const isUpdating = status === "updating_password";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!supabase) {
          setStatus("error");
          setMessage(
            "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
          return;
        }

        setStatus("processing");
        setMessage("Signing you in...");

        const search = new URLSearchParams(window.location.search);
        const hashRaw = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hash = new URLSearchParams(hashRaw);

        const code = search.get("code");

        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");

        const typeFromSearch = search.get("type");
        const typeFromHash = hash.get("type");
        const isRecovery =
          typeFromSearch === "recovery" || typeFromHash === "recovery";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw new Error(error.message);
        }

        if (!cancelled) {
          try {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search
            );
          } catch {}
        }

        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw new Error(sessionErr.message);

        if (!data?.session) {
          setStatus("error");
          setMessage(
            "No session detected from the link. This usually means the redirect URL is wrong in Supabase Auth settings, or the link expired."
          );
          return;
        }

        if (isRecovery) {
          setStatus("needs_password");
          setMessage("Set a new password to finish recovery.");
          return;
        }

        setStatus("done");
        setMessage("Signed in. Redirecting...");
        router.replace("/dashboard");
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message ?? "Auth callback failed.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function onSetPassword(event: FormEvent) {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase client not available.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setStatus("updating_password");
      setMessage("Updating password...");

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw new Error(error.message);

      setStatus("done");
      setMessage("Password updated. Redirecting...");
      router.replace("/dashboard");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "Failed to update password.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/40 p-8">
        <h1 className="text-xl font-semibold text-gray-900 text-center">
          WageFlow
        </h1>

        <p className="text-sm text-gray-600 text-center mt-2">{message}</p>

        {showPasswordForm && (
          <form onSubmit={onSetPassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat the password"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-medium transition-colors disabled:opacity-60"
            >
              {isUpdating ? "Saving..." : "Set password"}
            </button>
          </form>
        )}

        {status === "error" && (
          <div className="mt-6">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              If you opened a recovery link and landed on the demo page, your app
              was missing an auth callback handler. This page is the handler.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
