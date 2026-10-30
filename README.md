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

Supabase is no longer used for login. Its configuration is only needed if the app adds
features that use the Supabase database.


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
