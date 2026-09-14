"use client";

import { useState } from "react";

const tabs = ["Home", "College Chat", "Resources", "Deadlines"] as const;

type Tab = (typeof tabs)[number];

const quickPrompts = [
  "How should I prioritize my college applications?",
  "What deadlines are coming up this month?",
  "Help me build a scholarship plan.",
  "What should I do after submitting my applications?",
];

const chatMessages = [
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

  const renderContent = () => {
    if (activeTab === "Home") {
      return (
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Dashboard</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">Good morning, Alex</h2>
            </div>
            <button className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white">
              New task
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Applications</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">8</p>
              <p className="mt-1 text-sm text-emerald-600">+2 this month</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Upcoming deadlines</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">3</p>
              <p className="mt-1 text-sm text-amber-600">Due this week</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Saved resources</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">14</p>
              <p className="mt-1 text-sm text-sky-600">Updated recently</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Upcoming deadlines</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span>Common App essay review</span>
                  <span className="font-medium text-slate-900">Sep 20</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span>Scholarship application</span>
                  <span className="font-medium text-slate-900">Sep 24</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                  <span>Teacher recommendation follow-up</span>
                  <span className="font-medium text-slate-900">Sep 27</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Helpful resources</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="rounded-xl bg-white px-3 py-2">College match checklist</li>
                <li className="rounded-xl bg-white px-3 py-2">Financial aid planning guide</li>
                <li className="rounded-xl bg-white px-3 py-2">Essay brainstorming worksheet</li>
              </ul>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "College Chat") {
      return (
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-sky-600">College Chat</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Ask about applications, scholarships, and deadlines</h2>
            </div>
            <button className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white">
              Start new chat
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                    message.sender === "bot"
                      ? "bg-white text-slate-700 ring-1 ring-slate-200"
                      : "ml-auto bg-sky-600 text-white"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <input
                type="text"
                placeholder="Ask College Advisor..."
                className="flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Send
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "Resources") {
      return (
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Resources</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "College match checklist",
              "Financial aid guide",
              "Essay planning worksheet",
              "Campus visit prep",
              "Scholarship tracker",
              "Application timeline",
            ].map((resource) => (
              <div key={resource} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm text-slate-700">{resource}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Deadlines</h2>
        <div className="mt-6 space-y-3">
          {[
            ["Common App essay review", "Sep 20"],
            ["Scholarship application", "Sep 24"],
            ["Teacher recommendation follow-up", "Sep 27"],
            ["Financial aid form review", "Oct 1"],
          ].map(([title, date]) => (
            <div key={title} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <span className="text-slate-700">{title}</span>
              <span className="font-semibold text-slate-900">{date}</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between rounded-full bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            College Advisor
          </h1>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-200 hover:text-slate-900"
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
