"use client";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tabs = ["Home", "College Chat", "Resources", "Deadlines", "Visualizations", "Checklist"] as const;
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

type StreamCitation = {
  type?: string;
  url_citation?: { url?: string; title?: string };
};

type StreamChunk = {
  choices?: { delta?: { content?: string; annotations?: StreamCitation[] } }[];
  error?: { message?: string };
};

type Deadline = {
  id: number;
  title: string;
  date: string;
};

type DeadlineView = "list" | "calendar";

type ResourceCategory = "All" | "Applications" | "Financial Aid" | "Scholarships" | "Planning";

type Resource = {
  title: string;
  category: Exclude<ResourceCategory, "All">;
  description: string;
  href: string;
};

const calendarWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const resourceCategories: ResourceCategory[] = ["All", "Applications", "Financial Aid", "Scholarships", "Planning"];

const resources: Resource[] = [
  { title: "Common App", category: "Applications", description: "Create and manage your college applications in one place.", href: "https://www.commonapp.org/" },
  { title: "College application checklist", category: "Applications", description: "Review key application steps, materials, and timing.", href: "https://studentaid.gov/articles/8-steps-to-preparing-for-college/" },
  { title: "Federal Student Aid", category: "Financial Aid", description: "Find FAFSA guidance, aid types, and federal college planning tools.", href: "https://studentaid.gov/" },
  { title: "FAFSA form", category: "Financial Aid", description: "Start or continue your Free Application for Federal Student Aid.", href: "https://studentaid.gov/h/apply-for-aid/fafsa" },
  { title: "CSS Profile", category: "Financial Aid", description: "Learn about the CSS Profile for institutional financial aid.", href: "https://cssprofile.collegeboard.org/" },
  { title: "BigFuture scholarships", category: "Scholarships", description: "Search scholarships and explore paying-for-college resources.", href: "https://bigfuture.collegeboard.org/pay-for-college/scholarship-search" },
  { title: "Federal scholarship search", category: "Scholarships", description: "Explore official scholarship and grant opportunities.", href: "https://www.careeronestop.org/Toolkit/Training/find-scholarships.aspx" },
  { title: "College Scorecard", category: "Planning", description: "Compare colleges using costs, programs, and outcomes.", href: "https://collegescorecard.ed.gov/" },
  { title: "College Board BigFuture", category: "Planning", description: "Explore colleges, majors, careers, and planning tools.", href: "https://bigfuture.collegeboard.org/" },
];

const getDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const defaultDeadlines: Deadline[] = [
  { id: 1, title: "Common App essay review", date: "2026-09-20" },
  { id: 2, title: "Scholarship application", date: "2026-09-24" },
  { id: 3, title: "Teacher recommendation follow-up", date: "2026-09-27" },
  { id: 4, title: "Financial aid form review", date: "2026-10-01" },
];

type Requirement = {
  id: number;
  title: string;
  category: string;
  date: string;
  doneLabel: string;
  openLabel: string;
  done: boolean;
};

type School = {
  id: number;
  name: string;
  dueLabel: string;
  requirements: Requirement[];
};

const defaultSchools: School[] = [
  {
    id: 1,
    name: "Westview College",
    dueLabel: "1 due today",
    requirements: [
      { id: 1, title: "Common Application", category: "Application", date: "Oct 1", doneLabel: "Submitted", openLabel: "Upcoming", done: true },
      { id: 2, title: "Official transcript upload", category: "Academic records", date: "Oct 2", doneLabel: "Received", openLabel: "Upcoming", done: true },
      { id: 3, title: "Teacher recommendation letters", category: "Recommendations", date: "Oct 3", doneLabel: "Complete", openLabel: "Upcoming", done: true },
      { id: 4, title: "Community supplemental essay", category: "Writing supplement", date: "Oct 4", doneLabel: "Submitted", openLabel: "Due today", done: false },
      { id: 5, title: "CSS Profile and financial aid forms", category: "Financial aid", date: "Oct 10", doneLabel: "Submitted", openLabel: "Upcoming", done: false },
    ],
  },
  {
    id: 2,
    name: "Northbridge University",
    dueLabel: "Due in 2 days",
    requirements: [
      { id: 1, title: "Coalition Application", category: "Application", date: "Oct 1", doneLabel: "Submitted", openLabel: "Upcoming", done: true },
      { id: 2, title: "SAT score report", category: "Testing", date: "Oct 2", doneLabel: "Received", openLabel: "Upcoming", done: true },
      { id: 3, title: "Architecture portfolio submission", category: "Portfolio", date: "Oct 6", doneLabel: "Submitted", openLabel: "Due in 2 days", done: false },
    ],
  },
];

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
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory>("All");
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
    if (typeof window === "undefined") {
      return defaultDeadlines;
    }

    const savedDeadlines = window.localStorage.getItem("college-advisor-deadlines");

    if (!savedDeadlines) {
      return defaultDeadlines;
    }

    try {
      const parsedDeadlines = JSON.parse(savedDeadlines) as Deadline[];
      return Array.isArray(parsedDeadlines) ? parsedDeadlines : defaultDeadlines;
    } catch {
      window.localStorage.removeItem("college-advisor-deadlines");
      return defaultDeadlines;
    }
  });
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineView, setDeadlineView] = useState<DeadlineView>("list");
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [schools, setSchools] = useState<School[]>(defaultSchools);

  const toggleRequirement = (schoolId: number, requirementId: number) => {
  setSchools((current) =>
    current.map((school) =>
      school.id === schoolId
        ? {
            ...school,
            requirements: school.requirements.map((r) =>
              r.id === requirementId ? { ...r, done: !r.done } : r,
            ),
          }
        : school,
    ),
  );
  };

  useEffect(() => {
    window.localStorage.setItem("college-advisor-deadlines", JSON.stringify(deadlines));
  }, [deadlines]);

  const formatDeadlineDate = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);

    if (!year || !month || !day) {
      return date;
    }

    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
      new Date(year, month - 1, day),
    );
  };

  const handleAddDeadline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = deadlineTitle.trim();

    if (!title || !deadlineDate) {
      return;
    }

    setDeadlines((current) => [...current, { id: Date.now(), title, date: deadlineDate }].sort((a, b) => a.date.localeCompare(b.date)));
    setDeadlineTitle("");
    setDeadlineDate("");
  };

  const shiftCalendarMonth = (offset: number) => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const filteredResources = resources.filter((resource) => {
    const matchesCategory = resourceCategory === "All" || resource.category === resourceCategory;
    const searchText = resourceSearch.trim().toLowerCase();
    const matchesSearch = !searchText || `${resource.title} ${resource.description} ${resource.category}`.toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  const sendMessage = async (message?: string) => {
    const prompt = (message ?? chatInput).trim();

    if (!prompt || isSending) {
      return;
    }

    setChatInput("");
    setChatError("");
    setChatMessages((current) => [...current, { sender: "user", text: prompt }, { sender: "bot", text: "" }]);
    setIsSending(true);

    const updateLatestBotMessage = (update: (message: ChatMessage) => ChatMessage) => {
      setChatMessages((current) => {
        const latestIndex = current.length - 1;

        if (latestIndex < 0 || current[latestIndex].sender !== "bot") {
          return current;
        }

        return current.map((chatMessage, index) => (index === latestIndex ? update(chatMessage) : chatMessage));
      });
    };

    try {
      const response = await fetch("/api/ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "The AI helper could not respond.");
      }

      if (!response.body) {
        throw new Error("The AI helper did not return a readable response stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const citations: Citation[] = [];
      const citationUris = new Set<string>();
      let buffer = "";
      let eventData: string[] = [];
      let streamError = "";

      const processEvent = () => {
        const data = eventData.join("\n");
        eventData = [];

        if (!data || data === "[DONE]") {
          return;
        }

        try {
          const chunk = JSON.parse(data) as StreamChunk;

          if (chunk.error?.message) {
            streamError = chunk.error.message;
            return;
          }

          const choice = chunk.choices?.[0];
          const content = choice?.delta?.content;

          if (content) {
            updateLatestBotMessage((chatMessage) => ({ ...chatMessage, text: chatMessage.text + content }));
          }

          for (const annotation of choice?.delta?.annotations ?? []) {
            const uri = annotation.url_citation?.url;

            if (annotation.type === "url_citation" && uri && /^https?:\/\//i.test(uri) && !citationUris.has(uri)) {
              citationUris.add(uri);
              citations.push({ title: annotation.url_citation?.title || uri, uri });
            }
          }
        } catch {
          return;
        }
      };

      const processLine = (line: string) => {
        const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;

        if (!normalizedLine) {
          processEvent();
        } else if (normalizedLine.startsWith("data:")) {
          eventData.push(normalizedLine.slice(5).replace(/^ /, ""));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        let lineEnd = buffer.indexOf("\n");
        while (lineEnd !== -1) {
          processLine(buffer.slice(0, lineEnd));
          buffer = buffer.slice(lineEnd + 1);
          lineEnd = buffer.indexOf("\n");
        }

        if (done) {
          if (buffer) {
            processLine(buffer);
          }
          processLine("");
          break;
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      updateLatestBotMessage((chatMessage) => ({
        ...chatMessage,
        text: chatMessage.text || "I could not find an answer.",
        citations,
      }));
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
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();
    const calendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const calendarStartOffset = new Date(calendarYear, calendarMonth, 1).getDay();
    const calendarCells = Array.from(
      { length: calendarStartOffset + calendarDaysInMonth },
      (_, index) => (index < calendarStartOffset ? null : index - calendarStartOffset + 1),
    );

    if (activeTab === "Home") {
      return (
        <section className="fade-in-up mt-8">
          <div className="overflow-hidden rounded-[2rem] bg-white/35 p-[1px] shadow-[0_25px_80px_rgba(99,102,241,0.2)] backdrop-blur-md">
            <div className="rounded-[calc(2rem-1px)] bg-white/15 p-6 text-slate-900 shadow-inner backdrop-blur-md md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-800">
                    Your college orbit
                  </p>
                  <h2 className="mt-2 text-3xl font-black md:text-5xl">Good morning, Brando!</h2>
                </div>
                <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:scale-[1.02]">
                  New task
                </button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Applications", value: "8", note: "+2 this month", tone: "bg-emerald-400/20 text-emerald-950" },
                  { label: "Upcoming deadlines", value: "3", note: "Due this week", tone: "bg-amber-400/20 text-amber-950" },
                  { label: "Saved resources", value: "14", note: "Updated recently", tone: "bg-sky-400/20 text-sky-950" },
                ].map((card) => (
                  <div key={card.label} className={`card-lift rounded-2xl border border-white/10 p-4 ${card.tone}`}>
                    <p className="text-sm opacity-75">{card.label}</p>
                    <p className="mt-2 text-3xl font-black">{card.value}</p>
                    <p className="mt-1 text-sm opacity-80">{card.note}</p>
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
                        {message.text ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                        ) : isSending && index === chatMessages.length - 1 ? (
                          <span className="animate-pulse">Thinking...</span>
                        ) : null}
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
                placeholder="Ask College Companion..."
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
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Your planning library</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Resources</h2>
            </div>
            <p className="text-sm text-slate-600">{filteredResources.length} {filteredResources.length === 1 ? "resource" : "resources"}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <label className="flex-1 text-sm font-semibold text-slate-700">
              Search resources
              <input
                type="search"
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder="Search scholarships, FAFSA, applications..."
                className="mt-1 w-full rounded-xl border border-amber-200 bg-white/85 px-3 py-2 font-normal text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {resourceCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setResourceCategory(category)}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  resourceCategory === category
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white/80 text-slate-600 ring-1 ring-amber-200 hover:bg-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {filteredResources.map((resource, index) => (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className={`group rounded-[1.5rem] p-4 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-lg ${
                  index % 3 === 0
                    ? "bg-gradient-to-br from-pink-200 to-orange-100 ring-pink-200"
                    : index % 3 === 1
                      ? "bg-gradient-to-br from-sky-200 to-cyan-100 ring-sky-200"
                      : "bg-gradient-to-br from-violet-200 to-fuchsia-100 ring-violet-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{resource.category}</span>
                  <span className="text-slate-500 transition group-hover:translate-x-1" aria-hidden="true">-&gt;</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">{resource.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{resource.description}</p>
                <p className="mt-4 text-xs font-bold text-slate-500">Open official resource</p>
              </a>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <p className="mt-6 rounded-2xl bg-white/75 px-4 py-8 text-center text-sm text-slate-600">No resources match that search. Try another topic or choose All.</p>
          )}
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

          </div>
        </section>
      );
    }

    if (activeTab === "Checklist") {
      return (
       <section className="fade-in-up mt-8 rounded-[2rem] bg-gradient-to-br from-emerald-50 via-white to-sky-100 p-6 shadow-sm ring-1 ring-emerald-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">College Companion Checklist</h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search tasks or schools"
              className="mx-auto w-full max-w-md flex-1 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Filter
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Print
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Add school
          </button>

        </div>
      </div>

      <div className="mt-6 space-y-4">
  {schools.map((school) => {
    const completed = school.requirements.filter((r) => r.done).length;
    const percent = (completed / school.requirements.length) * 100;

    return (
      <div key={school.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {/* School header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{school.name}</p>
            <p className="text-xs text-slate-500">{school.requirements.length} requirements</p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#047857 0 ${percent}%, #e2e8f0 ${percent}% 100%)` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700">
                {completed}/{school.requirements.length}
              </div>
            </div>
            <span className="w-40 rounded-full border border-slate-200 px-3 py-1 text-center text-xs font-semibold text-rose-600">
              {school.dueLabel}
            </span>
          </div>
        </div>

        {/* Requirement rows */}
        {school.requirements.map((r) => (
          <label
            key={r.id}
            className="flex cursor-pointer items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={r.done}
              onChange={() => toggleRequirement(school.id, r.id)}
              className="h-4 w-4 accent-emerald-700"
            />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${r.done ? "text-slate-400" : "text-slate-900"}`}>{r.title}</p>
              <p className="text-xs text-slate-400">{r.category}</p>
            </div>
            <span className="text-xs text-slate-500">{r.date}</span>
            <span
              className={`w-24 rounded-full px-3 py-1 text-center text-xs font-semibold ${
                r.done
                  ? "bg-emerald-50 text-emerald-700"
                  : r.openLabel === "Due today"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {r.done ? r.doneLabel : r.openLabel}
            </span>
          </label>
        ))}
      </div>
    );
  })}
</div>

    </section>
  );
}

    return (
      <section className="mt-8 rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-sky-50 p-6 shadow-sm ring-1 ring-sky-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Stay on track</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Deadlines</h2>
          </div>
          <p className="text-sm text-slate-600">{deadlines.length} {deadlines.length === 1 ? "deadline" : "deadlines"}</p>
        </div>

        <div className="mt-5 inline-flex rounded-xl bg-white/80 p-1 ring-1 ring-slate-200">
          {(["list", "calendar"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setDeadlineView(view)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                deadlineView === view ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddDeadline} className="mt-6 grid gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-700">
            What is due?
            <input type="text" value={deadlineTitle} onChange={(event) => setDeadlineTitle(event.target.value)} placeholder="e.g. Submit FAFSA" maxLength={100} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200" required />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Due date
            <input type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200" required />
          </label>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">Add deadline</button>
        </form>

        {deadlineView === "list" ? (
          <div className="mt-6 space-y-3">
            {deadlines.map((deadline, index) => (
              <div
                key={deadline.id}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm ring-1 ${
                  index % 2 === 0
                    ? "bg-gradient-to-r from-rose-100 to-orange-50 ring-rose-200"
                    : "bg-gradient-to-r from-sky-100 to-violet-50 ring-sky-200"
                }`}
              >
                <span className="text-slate-700">{deadline.title}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">{formatDeadlineDate(deadline.date)}</span>
                  <button type="button" onClick={() => setDeadlines((current) => current.filter((item) => item.id !== deadline.id))} className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-rose-600" aria-label={`Remove ${deadline.title}`}>Remove</button>
                </div>
              </div>
            ))}
            {deadlines.length === 0 && <p className="rounded-2xl bg-white/70 px-4 py-6 text-center text-sm text-slate-500">No deadlines yet. Add one above to get started.</p>}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => shiftCalendarMonth(-1)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100" aria-label="Previous month">&lt;</button>
              <h3 className="text-lg font-black text-slate-900">
                {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarDate)}
              </h3>
              <button type="button" onClick={() => shiftCalendarMonth(1)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100" aria-label="Next month">&gt;</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
              {calendarWeekdays.map((weekday) => <span key={weekday} className="py-2">{weekday}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, index) => {
                const dateKey = day === null ? "" : getDateKey(calendarYear, calendarMonth, day);
                const dayDeadlines = deadlines.filter((deadline) => deadline.date === dateKey);

                return (
                  <div key={day === null ? `empty-${index}` : dateKey} className={`min-h-24 rounded-xl p-2 text-left ring-1 ${day === null ? "bg-slate-50/60 ring-transparent" : "bg-white ring-slate-200"}`}>
                    {day !== null && (
                      <>
                        <span className="text-sm font-bold text-slate-700">{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayDeadlines.map((deadline) => (
                            <div key={deadline.id} className="rounded-md bg-gradient-to-r from-rose-400 to-violet-500 px-1.5 py-1 text-[10px] font-bold leading-tight text-white" title={deadline.title}>
                              {deadline.title}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            College Companion
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
            <Link
              href="/account"
              className="rounded-full bg-white/80 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Account
            </Link>
          </nav>
        </header>

        {renderContent()}
      </div>
    </main>
  );
}
