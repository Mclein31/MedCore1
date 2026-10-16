import { Link } from 'react-router';

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="mt-2 text-xl font-semibold">This page does not exist</h1>
      <Link to="/" className="mt-6 text-sm font-medium text-brand-800 underline underline-offset-4">
        Go to the start page
      </Link>
    </main>
  );
}
