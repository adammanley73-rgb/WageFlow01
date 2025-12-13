// C:\Users\adamm\Projects\wageflow01\components\ui\AICopilotTest.tsx
"use client";

import { useState } from "react";

type CopilotResponse = {
  ok: boolean;
  answer?: string | null;
  citations?: unknown[];
  debug?: unknown;
  error?: string;
  statusCode?: number;
};

export default function AICopilotTest() {
  const [question, setQuestion] = useState<string>(
    "Give me a short test response so I can confirm WageFlow AI is wired correctly."
  );
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function handleAsk() {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          context:
            "WageFlow UI test: basic connectivity check from AICopilotTest component.",
        }),
      });

      const data = (await res.json()) as CopilotResponse;

      if (!res.ok || !data.ok) {
        const message =
          data.error ||
          `Copilot returned an error (status ${data.statusCode ?? res.status}).`;
        setError(message);
        return;
      }

      setAnswer(data.answer ?? "(No answer text returned from Copilot.)");
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unknown error calling /api/ai/copilot.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h2 className="mb-2 text-lg font-semibold text-[#0f3c85]">
        WageFlow AI · Copilot test
      </h2>
      <p className="mb-4 text-xs text-slate-600">
        This panel sends your question to{" "}
        <code className="font-mono text-[11px]">/api/ai/copilot</code> so you
        can confirm the AI service is wired correctly.
      </p>

      <label className="mb-1 block text-xs font-medium text-slate-700">
        Question
      </label>
      <textarea
        className="mb-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f3c85] focus:ring-1 focus:ring-[#0f3c85] resize-none"
        rows={5}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#0f3c85] px-4 text-sm font-medium text-white hover:bg-[#0c326c] disabled:cursor-not-allowed disabled:opacity-60 transition"
        >
          {loading ? "Asking Copilot…" : "Ask Copilot"}
        </button>
        {loading && (
          <span className="text-xs text-slate-600">
            Waiting for response…
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {answer && !error && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="mb-1 text-xs font-semibold text-slate-700">
            Copilot answer
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}
