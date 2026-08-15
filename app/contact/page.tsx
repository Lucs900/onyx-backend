'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdvisor } from '@/components/advisor/AdvisorProvider';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { contactGoals, site } from '@/content/site';

export default function ContactPage() {
  const router = useRouter();
  const { sendMessage } = useAdvisor();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(contactGoals[0]);
  const [message, setMessage] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const composed = [
      name.trim() ? `Hi, I'm ${name.trim()}.` : 'Hi.',
      `I'd like help with: ${goal}.`,
      message.trim(),
    ]
      .filter(Boolean)
      .join(' ');

    void sendMessage(composed);
    router.push(site.advisorPath);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-onyx text-cream-100">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <Container className="relative py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fox-300">
            Contact / Get started
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            Start with the fox. The application can follow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream-200 sm:text-lg">
            The fastest, most accurate way to reach ONYX Direct right now is
            the advisor we already built. Phone, email, and office lines will
            be published here after they are approved — we are not inventing
            them on this branch.
          </p>
        </Container>
      </section>

      <Container className="grid gap-8 py-14 sm:py-16 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-cream-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="font-display text-2xl">Tell the fox what you need</h2>
          <p className="mt-2 text-sm text-ink-muted">
            This form does not invent a ticket system. It opens a real
            conversation with the ONYX Advisor using your words.
          </p>

          <label className="mt-6 block text-sm font-semibold" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-fox-400 focus:ring-2 focus:ring-fox-400/30"
            autoComplete="name"
          />

          <label className="mt-4 block text-sm font-semibold" htmlFor="goal">
            Goal
          </label>
          <select
            id="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value as typeof goal)}
            className="mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-fox-400 focus:ring-2 focus:ring-fox-400/30"
          >
            {contactGoals.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm font-semibold" htmlFor="message">
            What should the fox know?
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            className="mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-fox-400 focus:ring-2 focus:ring-fox-400/30"
          />

          <Button type="submit" className="mt-6 w-full sm:w-auto">
            Continue with the fox
          </Button>
        </form>

        <div className="space-y-5">
          <article className="rounded-3xl bg-onyx p-6 text-cream-50 sm:p-8">
            <h2 className="font-display text-2xl">Talk now</h2>
            <p className="mt-3 text-sm leading-relaxed text-cream-200">
              Use the persistent fox widget on any page, or open the dedicated
              advisor room. Same `/api/chat` bot.
            </p>
            <div className="mt-5">
              <Button href={site.advisorPath} variant="primary">
                Open the advisor
              </Button>
            </div>
          </article>

          <article className="rounded-3xl border border-cream-200 bg-cream-100 p-6 sm:p-8">
            <h2 className="font-display text-2xl">Ready to apply</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              If you already have a quote path and want the application portal,
              use the existing Floify link. Use the same email the fox asked
              for if you were in a conversation.
            </p>
            <div className="mt-5">
              <Button
                href={site.floifyUrl}
                variant="secondary"
                target="_blank"
                rel="noreferrer"
              >
                Start an application
              </Button>
            </div>
          </article>

          <p className="text-xs leading-relaxed text-ink-muted">
            Placeholder contact details — pending approval. Direct phone,
            licensed email, and office address are intentionally omitted until
            they are confirmed. This preview does not replace live-site
            contact language.
          </p>
        </div>
      </Container>
    </>
  );
}
