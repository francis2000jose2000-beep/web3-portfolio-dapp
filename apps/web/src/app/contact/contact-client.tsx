"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, SendHorizonal } from "lucide-react";
import { Mounted } from "@/components/Mounted";
import { Title } from "@/components/Title";
import { getErrorMessage } from "@/lib/errors";
import { postContactMessage, type ContactMessageInput } from "@/lib/api";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactClient() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const input: ContactMessageInput | null = useMemo(() => {
    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!name || !email || !message) return null;
    if (!isValidEmail(email)) return null;
    return {
      name,
      email,
      subject: subject ? subject : undefined,
      message
    };
  }, [form]);

  const mutation = useMutation({
    mutationFn: (payload: ContactMessageInput) => postContactMessage(payload),
    onSuccess: (res) => {
      setSubmittedId(res.id);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success("Message sent.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-52 rounded bg-white/10" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-3xl border border-white/10 bg-white/5" />
        <div className="h-80 rounded-3xl border border-white/10 bg-white/5" />
      </div>
    </div>
  );

  return (
    <Mounted fallback={mountedFallback}>
      <div className="mx-auto max-w-5xl space-y-10">
        <Title
          eyebrow="Support"
          title="Contact"
          subtitle="Send a message. Replies are async—yet fast."
          right={
            <Link
              href="/about"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              About
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,43,214,0.12),transparent_55%)] blur-xl" />
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200">
              <Mail className="h-3.5 w-3.5 text-web3-cyan" />
              Messages
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-50">What happens next?</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-300">
              We store your message in our database and use it to prioritize product improvements, bug fixes, and partnership requests. If you
              provide a valid email address, we can reply.
            </p>
            <div className="mt-6 space-y-3 text-sm text-zinc-300">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                <div className="text-xs font-semibold text-zinc-200">Typical response time</div>
                <div className="mt-1 text-sm text-zinc-300">24–72 hours (demo)</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                <div className="text-xs font-semibold text-zinc-200">Recommended subject</div>
                <div className="mt-1 text-sm text-zinc-300">Bug report, partnership, or product feedback</div>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.14),transparent_55%)] blur-xl" />

            {submittedId ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Message received. Reference: {submittedId}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-zinc-950/30 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Email *</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-zinc-950/30 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
                    placeholder="you@domain.com"
                    inputMode="email"
                    autoComplete="email"
                  />
                  {form.email.trim() !== "" && !isValidEmail(form.email.trim()) ? (
                    <div className="mt-2 text-xs text-red-300">Invalid email address.</div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-zinc-950/30 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-web3-purple/60 focus:shadow-glow"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                  className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
                  placeholder="Tell us what you need…"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!input) {
                    toast.error("Please provide your name, a valid email, and a message.");
                    return;
                  }
                  mutation.mutate(input);
                }}
                disabled={mutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? "Sending…" : "Send message"}
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </Mounted>
  );
}
