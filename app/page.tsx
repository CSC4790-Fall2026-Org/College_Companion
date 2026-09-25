"use client";

import { type FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tabs = ["Home", "College Chat", "Resources", "Deadlines", "Visualizations"] as const;

type Tab = (typeof tabs)[number];

const quickPrompts = [
  "How should I prioritize my college applications?",
  "What deadlines are coming up this month?",
  "Help me build a scholarship plan.",
  "What should I do after submitting my applications?",
];

type Citation = { title: string; uri: string };

type ChatMessage = {
  sender: "bot" | "user";
  text: string;
  citations?: Citation[];
};

const initialChatMessages: ChatMessage[] = [
  {
    sender: "bot",
    text: "Hi! I can help with college planning, application strategy, and deadline tracking.",
  },
  {
    sender: "bot",
    text: "Try asking about scholarships, essay timing, school lists, or upcoming dates.",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const sendMessage = async (message?: string) => {
    const prompt = (message ?? chatInput).trim();

    if (!prompt || isSending) {
      return;
    }

    setChatInput("");
    setChatError("");
    setChatMessages((current) => [...current, { sender: "user", text: prompt }]);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = (await response.json()) as { answer?: string; citations?: Citation[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "The AI helper could not respond.");
      }

      setChatMessages((current) => [
        ...current,
        { sender: "bot", text: data.answer ?? "I could not find an answer.", citations: data.citations },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The AI helper could not respond.");
    } finally {
      setIsSending(false);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const renderContent = () => {
    if (activeTab === "Home") {
      return (
        <section className="fade-in-up mt-8">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 p-[1px] shadow-[0_25px_80px_rgba(99,102,241,0.35)]">
            <div className="rounded-[calc(2rem-1px)] bg-slate-950/90 p-6 text-white md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
                    Your college orbit
                  </p>
                  <h2 className="mt-2 text-3xl font-black md:text-5xl">Good morning, Alex</h2>
                </div>
                <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:scale-[1.02]">
                  New task
                </button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Applications", value: "8", note: "+2 this month", tone: "bg-emerald-400/20 text-emerald-100" },
                  { label: "Upcoming deadlines", value: "3", note: "Due this week", tone: "bg-amber-400/20 text-amber-100" },
                  { label: "Saved resources", value: "14", note: "Updated recently", tone: "bg-sky-400/20 text-sky-100" },
                ].map((card) => (
                  <div key={card.label} className={`card-lift rounded-2xl border border-white/10 p-4 ${card.tone}`}>
                    <p className="text-sm text-white/70">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                    <p className="mt-1 text-sm text-white/80">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card-lift rounded-[2rem] bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 p-5 shadow-sm ring-1 ring-pink-200">
              <h3 className="text-xl font-bold text-slate-900">Upcoming deadlines</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                  <span>Common App essay review</span>
                  <span className="rounded-full bg-pink-500 px-2 py-1 text-xs font-bold text-white">Sep 20</span>
                </li>
                <li className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                  <span>Scholarship application</span>
                  <span className="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">Sep 24</span>
                </li>
                <li className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                  <span>Teacher recommendation follow-up</span>
                  <span className="rounded-full bg-sky-500 px-2 py-1 text-xs font-bold text-white">Sep 27</span>
                </li>
              </ul>
            </div>

            <div className="card-lift rounded-[2rem] bg-gradient-to-br from-cyan-100 via-sky-50 to-violet-100 p-5 shadow-sm ring-1 ring-cyan-200">
              <h3 className="text-xl font-bold text-slate-900">Helpful resources</h3>
              <div className="mt-4 space-y-3">
                {[
                  "College match checklist",
                  "Financial aid planning guide",
                  "Essay brainstorming worksheet",
                ].map((resource) => (
                  <div key={resource} className="rounded-2xl bg-white/80 px-3 py-3 text-sm font-medium text-slate-700 shadow-sm">
                    {resource}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "College Chat") {
      return (
        <section className="fade-in-up mt-8 rounded-[2rem] bg-gradient-to-br from-sky-100 via-white to-fuchsia-100 p-6 shadow-sm ring-1 ring-sky-200">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">College Chat</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Ask about applications, scholarships, and deadlines</h2>
            </div>
            <button className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-200">
              Start new chat
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-sky-200 bg-white/70 p-4 backdrop-blur">
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div key={`${message.sender}-${index}`} className={message.sender === "user" ? "ml-auto max-w-xl" : "max-w-xl"}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      message.sender === "bot"
                        ? "bg-gradient-to-r from-slate-100 to-sky-50 text-slate-700 ring-1 ring-slate-200"
                        : "bg-gradient-to-r from-sky-500 to-violet-500 text-white"
                    }`}
                  >
                    {message.sender === "bot" ? (
                      <div className="chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.citations.map((citation) => (
                        <a
                          key={citation.uri}
                          href={citation.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50"
                        >
                          {citation.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={isSending}
                  className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-400 hover:bg-violet-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-100 p-3 ring-1 ring-slate-200">
              <input
                type="text"
                placeholder="Ask College Advisor..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={isSending}
                className="flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !chatInput.trim()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Thinking..." : "Send"}
              </button>
            </form>
            {chatError && <p className="mt-3 text-sm font-medium text-rose-600">{chatError}</p>}
          </div>
        </section>
      );
    }

    if (activeTab === "Resources") {
      return (
        <section className="mt-8 rounded-[2rem] bg-gradient-to-br from-amber-50 via-yellow-50 to-rose-100 p-6 shadow-sm ring-1 ring-amber-200">
          <h2 className="text-2xl font-black text-slate-900">Resources</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "College match checklist",
              "Financial aid guide",
              "Essay planning worksheet",
              "Campus visit prep",
              "Scholarship tracker",
              "Application timeline",
            ].map((resource, index) => (
              <div
                key={resource}
                className={`rounded-[1.5rem] p-4 shadow-sm ring-1 ${
                  index % 3 === 0
                    ? "bg-gradient-to-br from-pink-200 to-orange-100 ring-pink-200"
                    : index % 3 === 1
                      ? "bg-gradient-to-br from-sky-200 to-cyan-100 ring-sky-200"
                      : "bg-gradient-to-br from-violet-200 to-fuchsia-100 ring-violet-200"
                }`}
              >
                <p className="text-sm font-semibold text-slate-700">{resource}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "Visualizations") {
      return (
        <section className="fade-in-up mt-8 rounded-[2rem] bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 p-6 shadow-sm ring-1 ring-violet-200">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Visualizations</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Fun ways to track your college journey</h2>
            </div>
            <button className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-200">
              Refresh insights
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-violet-50 p-5 shadow-sm ring-1 ring-violet-200">
              <h3 className="text-lg font-bold text-slate-900">School fit meter</h3>
              <div className="mt-5 flex items-center gap-5">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full text-xl font-black text-slate-900"
                  style={{
                    background: "conic-gradient(#8b5cf6 0 82%, #e2e8f0 82% 100%)",
                  }}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white">
                    82%
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>Best fit schools: 6</p>
                  <p>Reach schools: 2</p>
                  <p>Safety schools: 3</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-cyan-50 p-5 shadow-sm ring-1 ring-cyan-200">
              <h3 className="text-lg font-bold text-slate-900">Application progress</h3>
              <div className="mt-5 space-y-4">
                {[
                  ["Essays", 80],
                  ["Recommendations", 65],
                  ["Scholarships", 55],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm text-slate-600">
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-fuchsia-50 p-5 shadow-sm ring-1 ring-fuchsia-200 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-900">Deadline timeline</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  { month: "Sep", value: 40, label: "Essay review" },
                  { month: "Oct", value: 70, label: "Applications" },
                  { month: "Nov", value: 90, label: "Scholarships" },
                  { month: "Dec", value: 50, label: "Decisions" },
                ].map((item) => (
                  <div key={item.month} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <div className="flex h-24 items-end">
                      <div
                        className="w-full rounded-t-2xl bg-gradient-to-t from-violet-500 to-sky-400"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <p className="mt-3 text-center text-sm font-bold text-slate-700">{item.month}</p>
                    <p className="text-center text-xs text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400 p-5 text-white shadow-lg shadow-violet-200 md:col-span-2">
              <h3 className="text-lg font-bold">Mood board</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  { shape: "rounded-full", color: "bg-yellow-200", label: "Bright ideas" },
                  { shape: "rotate-12 rounded-2xl", color: "bg-pink-200", label: "Dream schools" },
                  { shape: "-rotate-6 rounded-xl", color: "bg-cyan-200", label: "Deadlines" },
                  { shape: "rounded-[2rem]", color: "bg-emerald-200", label: "Wins" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className={`h-16 w-full ${item.color} ${item.shape}`} />
                    <p className="mt-3 text-sm font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-sm ring-1 ring-slate-800">
              <h3 className="text-lg font-bold">Chaos meter</h3>
              <div className="mt-5 flex items-end gap-3">
                {[35, 55, 75, 95, 68, 82].map((value, index) => (
                  <div key={index} className="flex-1">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-pink-500 via-orange-400 to-yellow-300"
                      style={{ height: `${value}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-gradient-to-br from-white to-slate-100 p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Orbital planner</h3>
              <div className="mt-5 flex items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-dashed border-violet-300">
                  <div className="absolute h-24 w-24 rounded-full bg-gradient-to-br from-pink-300 to-violet-500" />
                  <div className="absolute left-3 top-5 h-4 w-4 rounded-full bg-yellow-300" />
                  <div className="absolute bottom-4 right-5 h-5 w-5 rounded-full bg-cyan-300" />
                  <div className="absolute right-1 top-1/2 h-3 w-3 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="mt-8 rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-sky-50 p-6 shadow-sm ring-1 ring-sky-200">
        <h2 className="text-2xl font-black text-slate-900">Deadlines</h2>
        <div className="mt-6 space-y-3">
          {[
            ["Common App essay review", "Sep 20"],
            ["Scholarship application", "Sep 24"],
            ["Teacher recommendation follow-up", "Sep 27"],
            ["Financial aid form review", "Oct 1"],
          ].map(([title, date], index) => (
            <div
              key={title}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm ring-1 ${
                index % 2 === 0
                  ? "bg-gradient-to-r from-rose-100 to-orange-50 ring-rose-200"
                  : "bg-gradient-to-r from-sky-100 to-violet-50 ring-sky-200"
              }`}
            >
              <span className="text-slate-700">{title}</span>
              <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">{date}</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_25%),linear-gradient(135deg,_#fef3c7,_#e0f2fe,_#f5d0fe)] px-6 py-8">
      <div className="float-slow absolute -left-10 top-20 h-56 w-56 rounded-full bg-pink-300/40 blur-3xl" />
      <div className="float-slower absolute right-0 top-40 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="float-slow absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/50 bg-white/70 px-6 py-4 shadow-[0_15px_50px_rgba(15,23,42,0.12)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            College Advisor
          </h1>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 transition-all ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-slate-900 via-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-200"
                    : "bg-white/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        {renderContent()}
      </div>
    </main>
  );
}
