import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type AccessTokenProvider = () => Promise<string | null>;

export function createClient(accessToken: AccessTokenProvider) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error("Supabase URL and publishable key must be configured.");
	}

	return createSupabaseClient(
		supabaseUrl,
		supabasePublishableKey,
		{ accessToken },
	);
}
