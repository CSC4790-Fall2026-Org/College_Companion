import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type AccountPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const params = await searchParams;
  const email = typeof data.claims.email === "string" ? data.claims.email : "Account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-600">College Advisor</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">You are signed in</h1>
        <p className="mt-2 break-words text-sm text-slate-600">{email}</p>

        {params.error === "sign-out-failed" ? (
          <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            Sign out did not complete. Please try again.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <form action={signOut}>
            <button className="min-h-11 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Sign out
            </button>
          </form>
          <Link href="/" className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950">
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}