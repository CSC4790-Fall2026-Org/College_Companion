# College Advisor

College Advisor helps students organize college applications, deadlines, and planning questions.

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
