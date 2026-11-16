# College Advisor

College Advisor helps students organize college applications, deadlines, and planning questions.


# How to Set Up

**Open up terminal and run:**

git clone https://github.com/CSC4790-Fall2026-Org/College_Companion.git  
cd college-advisor-app  
npm install  


**Add these lines to `.env.local`**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The Clerk CLI can provision temporary development keys with `npx -y clerk@latest init`.
Claim the development application with `npx -y clerk@latest auth login` before using it
outside local development. Keep `CLERK_SECRET_KEY` server-side.

Clerk handles sign-in. Neon Postgres stores each signed-in user's college checklist.
The browser never connects to Neon directly: authenticated Next.js route handlers use
Clerk's verified server-side `userId` and the server-only `DATABASE_URL` for each
query. The client cannot choose a `user_id`, and each database query is scoped to the
authenticated Clerk user. Do not prefix `DATABASE_URL` with `NEXT_PUBLIC_` or expose
it in browser code.

## College checklist database setup

1. Link the Neon project and pull its variables into `.env.local`:

   ```sh
   neon init --agent vscode --org-id your-org-id --project-id your-project-id --branch production
   neon env pull
   ```

   Ensure `DATABASE_URL` is present in `.env.local`; keep its value private and
   server-side.
2. In the Neon SQL Editor, run
   `neon/migrations/20261115000000_create_college_checklists.sql`.
3. Restart the Next.js development server, sign in, and add a college. Refresh the
   page to confirm the checklist, requirements, statuses, and pennant are restored.
   To verify isolation, sign in as another Clerk user and confirm their checklist is
   separate.

New users start with an empty checklist; the example schools are shown only in the
signed-out demo. Checklist access is authorized in the server route handlers rather
than database RLS because the app uses a private Neon connection. Keep that connection
string restricted to the server. Existing rows in a Supabase checklist are not copied
automatically; export/import them before switching if that table contains data.

The curated local pennant logos currently include Yale (from
[Simple Icons, CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md))
and MIT (from the [MIT 2023 logo on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:MIT_2023_red_logo.svg),
identified there as public-domain text art). These marks remain the respective
institutions' trademarks and are used only to identify schools; their inclusion does
not imply affiliation or endorsement.


**Open up terminal and run:**  
npm run dev  

## OpenRouter setup

1. Create an API key at [OpenRouter](https://openrouter.ai/keys).
2. Add the key to `.env.local` in the project root:

	```env
	OPENROUTER_API_KEY=your_openrouter_api_key
	OPENROUTER_MODEL=openai/gpt-4o-mini
	```

	The model is configurable; choose a model available to your OpenRouter account. Keep the key server-side and do not prefix it with `NEXT_PUBLIC_`.
3. Restart the development server, then open the College Chat tab. Non-casual questions use OpenRouter's web search plugin, which may add search charges to model usage.

Run the app with `npm run dev`.

## AI route tests

Run the route tests with:

```sh
npm test
```

The suite checks the two input validation messages shown by the chat route. It does not need API credentials or make network requests.

Example output (timings vary):

```text
✔ returns a helpful error for a blank entry
✔ returns a helpful error when the entry exceeds 1,000 characters
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
