import Link from "next/link";
import { signIn, signUp } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-input": "Enter a valid email address and password.",
  "sign-in-failed": "We could not sign you in. Check your details and try again.",
  "sign-up-failed": "We could not create your account. Check your details and try again.",
  "confirmation-failed": "That confirmation link is invalid or has expired. Try signing in or creating a new account.",
};

const statusMessages: Record<string, string> = {
  "check-email": "Check your email for a link to confirm your account.",
  "signed-out": "You have been signed out.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const statusMessage = params.message ? statusMessages[params.message] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Back to College Advisor
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-slate-950">Your account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in or create an account with your email.
        </p>

        {errorMessage ? (
          <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p role="status" className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {statusMessage}
          </p>
        ) : null}

        <form className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              formAction={signIn}
              className="min-h-11 flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
              Create account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}