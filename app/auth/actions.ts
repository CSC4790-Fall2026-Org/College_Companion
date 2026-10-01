"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    redirect("/login?error=invalid-input");
  }

  return { email: email.trim(), password };
}

export async function signIn(formData: FormData) {
  const { email, password } = getCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=sign-in-failed");
  }

  redirect("/account");
}

export async function signUp(formData: FormData) {
  const { email, password } = getCredentials(formData);
  const origin = (await headers()).get("origin");

  if (!origin) {
    redirect("/login?error=sign-up-failed");
  }

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", "/account");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    redirect("/login?error=sign-up-failed");
  }

  if (data.session) {
    redirect("/account");
  }

  redirect("/login?message=check-email");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/account?error=sign-out-failed");
  }

  redirect("/login?message=signed-out");
}