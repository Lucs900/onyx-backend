import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-600">
        404
      </p>
      <h1 className="mt-3 font-display text-4xl">This trail is empty.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">
        That page is not part of the marketing foundation. Head home or talk
        to the fox.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/" variant="secondary">
          Home
        </Button>
        <Button href="/advisor">Talk to the fox</Button>
      </div>
    </Container>
  );
}
