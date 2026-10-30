import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function AccountPage() {
  await auth.protect();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "Account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">College Advisor</p>
          <UserButton />
        </div>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">You are signed in</h1>
        <p className="mt-2 break-words text-sm text-slate-600">{email}</p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950">
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}