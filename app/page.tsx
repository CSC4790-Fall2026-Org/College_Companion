"use client";
import { Show, SignInButton, SignUpButton, UserButton, useSession, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Suspense, startTransition, type FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CollegePennant } from "@/components/college-pennant";
import { getPennantKey } from "@/lib/colleges";
import {
  parseSavedSchools,
  type Requirement,
  type School,
  type SchoolFitCategory,
} from "@/lib/checklist";

const tabs = ["Home", "College Chat", "Resources", "Deadlines", "Visualizations", "Colleges"] as const;
type Tab = (typeof tabs)[number];

const quickPrompts = [
  "How should I prioritize my college applications?",
  "What deadlines are coming up this month?",
  "Help me build a scholarship plan.",
  "What should I do after submitting my applications?",
];

type ChatMessage = {
  sender: "bot" | "user";
  text: string;
};

type StreamChunk = {
  choices?: { delta?: { content?: string } }[];
  error?: { message?: string };
};

type Deadline = {
  id: number;
  title: string;
  date: string;
};

type ChecklistDeadline = {
  id: string;
  title: string;
  schoolName: string;
  date: string;
};

type HomepageDeadline = {
  id: string;
  title: string;
  source: string;
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
const schoolFitCategories: SchoolFitCategory[] = ["Best fit", "Reach", "Safety"];

const resources: Resource[] = [
  { title: "Common App", category: "Applications", description: "Create and manage your college applications in one place.", href: "https://www.commonapp.org/" },
  { title: "College application guide", category: "Applications", description: "Review application steps, materials, and tips for first-year applicants.", href: "https://www.commonapp.org/apply/first-year-students/" },
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

const getRequirementDateKey = (date: string, currentYear: number): string | null => {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    return parsedDate.getFullYear() === Number(year) &&
      parsedDate.getMonth() === Number(month) - 1 &&
      parsedDate.getDate() === Number(day)
      ? getDateKey(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
      : null;
  }

  const shortDate = /^([a-z]+)\s+(\d{1,2})$/i.exec(date.trim());
  if (!shortDate) {
    return null;
  }

  const monthIndex = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].findIndex((month) => month === shortDate[1].slice(0, 3).toLowerCase());
  const day = Number(shortDate[2]);

  if (monthIndex < 0) {
    return null;
  }

  const parsedDate = new Date(currentYear, monthIndex, day);
  return parsedDate.getMonth() === monthIndex && parsedDate.getDate() === day
    ? getDateKey(currentYear, monthIndex, day)
    : null;
};

const defaultDeadlines: Deadline[] = [
  { id: 1, title: "Common App essay review", date: "2026-09-20" },
  { id: 2, title: "Scholarship application", date: "2026-09-24" },
  { id: 3, title: "Teacher recommendation follow-up", date: "2026-09-27" },
  { id: 4, title: "Financial aid form review", date: "2026-10-01" },
];

type ChecklistLoadResult =
  | { userId: string; status: "ready" }
  | { userId: string; status: "error"; message: string };

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

function getChecklistErrorMessage(error: unknown, operation: "load" | "save"): string {
  const errorMessage = error instanceof Error ? error.message : "";
  const normalizedErrorMessage = errorMessage.toLowerCase();

  if (error instanceof TypeError && normalizedErrorMessage.includes("fetch")) {
    return `Could not connect to checklist storage while trying to ${operation}. Check that the app server is running and retry.`;
  }

  return error instanceof Error
    ? `Could not ${operation} your checklist: ${errorMessage}`
    : `An unexpected error occurred while trying to ${operation} your checklist.`;
}

const initialChatMessages: ChatMessage[] = [
  {
    sender: "bot",
    text: "Hi! I can help with college planning, application strategy, and deadline tracking. Try asking about scholarships, essay timing, school lists, or upcoming dates.",
  },
];

const confettiColors = ["#28734e", "#c6a45c", "#f4e8c1", "#fb7185", "#38bdf8", "#a78bfa"];
const confettiPieces = Array.from({ length: 56 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  color: confettiColors[index % confettiColors.length],
  delay: `${(index % 14) * 35}ms`,
  duration: `${2400 + (index % 7) * 130}ms`,
  width: `${6 + (index % 3) * 2}px`,
  height: `${10 + (index % 4) * 3}px`,
}));

type TaskDraft = { id: number; name: string; date: string; type: string; saved: boolean };
const createTaskDraft = (): TaskDraft => ({
  id: Date.now() + Math.random(),
  name: "",
  date: "",
  type: "",
  saved: false,
});

export default function Home() {
  const { isLoaded: userLoaded, user } = useUser();
  const { isLoaded: sessionLoaded } = useSession();
  const userId = user?.id ?? null;
  const accountName = user?.firstName || user?.fullName || user?.username;
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory>("All");
  const [deadlines, setDeadlines] = useState<Deadline[]>(defaultDeadlines);
  const [deadlinesLoaded, setDeadlinesLoaded] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [editingDeadlineTitle, setEditingDeadlineTitle] = useState("");
  const [editingDeadlineDate, setEditingDeadlineDate] = useState("");
  const [deadlineView, setDeadlineView] = useState<DeadlineView>("list");
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [demoSchools, setDemoSchools] = useState<School[]>(defaultSchools);
  const [checklistLoadResult, setChecklistLoadResult] = useState<ChecklistLoadResult | null>(null);
  const [checklistSaveError, setChecklistSaveError] = useState("");
  const [checklistLoadAttempt, setChecklistLoadAttempt] = useState(0);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolFitCategory, setNewSchoolFitCategory] = useState<SchoolFitCategory | null>(null);
  const [newAppType, setNewAppType] = useState("");
  const [newAppDueDate, setNewAppDueDate] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>(() => [createTaskDraft()]);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [showNewRequirementForm, setShowNewRequirementForm] = useState(false);
  const [newRequirementTitle, setNewRequirementTitle] = useState("");
  const [newRequirementDate, setNewRequirementDate] = useState("");
  const [newRequirementType, setNewRequirementType] = useState("");
  const [checklistSearch, setChecklistSearch] = useState("");
  const [addSchoolError, setAddSchoolError] = useState("");
  const [celebration, setCelebration] = useState<{ id: number; schoolName: string } | null>(null);
  const celebrationId = useRef(0);
  const checklistSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const checklistSchools =
    !userLoaded || !sessionLoaded ? [] : user ? schools : demoSchools;
  const checklistLoadState: "loading" | "ready" | "error" =
    !user
      ? userLoaded && sessionLoaded
        ? "ready"
        : "loading"
      : checklistLoadResult?.userId === user.id
        ? checklistLoadResult.status
        : "loading";
  const checklistLoadError =
    checklistLoadResult &&
    checklistLoadResult.userId === user?.id &&
    checklistLoadResult.status === "error"
      ? checklistLoadResult.message
      : "";

  useEffect(() => {
    if (!userLoaded || !sessionLoaded || !userId) {
      return;
    }

    let active = true;

    const loadChecklist = async () => {
      const response = await fetch("/api/checklist", { cache: "no-store" });
      const result = (await response.json()) as { schools?: unknown; error?: unknown };

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string" ? result.error : "The checklist request failed.",
        );
      }

      const parsedSchools = parseSavedSchools(result.schools);

      if (active) {
        setSchools(parsedSchools);
        setChecklistSaveError("");
        setChecklistLoadResult({ userId, status: "ready" });
      }
    };

    void loadChecklist().catch((error: unknown) => {
      if (active) {
        setChecklistLoadResult({
          userId,
          status: "error",
          message: getChecklistErrorMessage(error, "load"),
        });
      }
    });

    return () => {
      active = false;
    };
  }, [userLoaded, sessionLoaded, userId, checklistLoadAttempt]);

  useEffect(() => {
    if (
      !userId ||
      checklistLoadResult?.userId !== userId ||
      checklistLoadResult.status !== "ready"
    ) {
      return;
    }

    let active = true;
    const schoolsToSave = schools;
    const timeoutId = window.setTimeout(() => {
      checklistSaveQueue.current = checklistSaveQueue.current.then(async () => {
        if (!active) {
          return;
        }

        const response = await fetch("/api/checklist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schools: schoolsToSave }),
        });

        const result = (await response.json()) as { error?: unknown };

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string" ? result.error : "The checklist request failed.",
          );
        }

        if (active) {
          setChecklistSaveError("");
        }
      }).catch((error: unknown) => {
        if (active) {
          setChecklistSaveError(getChecklistErrorMessage(error, "save"));
        }
      });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [schools, userId, checklistLoadResult]);

  const updateChecklistSchools = (update: (current: School[]) => School[]) => {
    if (user) {
      setSchools(update);
    } else {
      setDemoSchools(update);
    }
  };

  const toggleRequirement = (schoolId: number, requirementId: number) => {
    const school = checklistSchools.find((item) => item.id === schoolId);
    const requirement = school?.requirements.find((item) => item.id === requirementId);

    if (!school || !requirement) {
      return;
    }

    const completesSchool =
      school.requirements.length > 0 &&
      school.requirements.every((item) =>
        item.id === requirementId ? !item.done : item.done,
      );

    updateChecklistSchools((current) =>
      current.map((item) =>
        item.id === schoolId
          ? {
              ...item,
              requirements: item.requirements.map((itemRequirement) =>
                itemRequirement.id === requirementId
                  ? { ...itemRequirement, done: !itemRequirement.done }
                  : itemRequirement,
              ),
            }
          : item,
      ),
    );

    if (completesSchool) {
      celebrationId.current += 1;
      setCelebration({ id: celebrationId.current, schoolName: school.name });
    }
  };

  useEffect(() => {
    if (!celebration) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCelebration(null), 3800);
    return () => window.clearTimeout(timeoutId);
  }, [celebration]);

  const closeAddSchool = () => {
    setShowAddSchool(false);
    setNewSchoolName("");
    setNewSchoolFitCategory(null);
    setNewAppType("");
    setNewAppDueDate("");
    setTaskDrafts([createTaskDraft()]);
    setAddSchoolError("");
  };

  const updateTaskDraft = (id: number, changes: Partial<TaskDraft>) => {
    setTaskDrafts((current) => current.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const addTaskDraft = () => {
    setTaskDrafts((current) => [...current, createTaskDraft()]);
  };

  const removeTaskDraft = (id: number) => {
    setTaskDrafts((current) => {
      const next = current.filter((t) => t.id !== id);
      return next.length ? next : [createTaskDraft()];
    });
  };

  const handleAddSchool = () => {
    const name = newSchoolName.trim();

    if (!name) {
      return;
    }

    const isDuplicate = checklistSchools.some(
      (school) => school.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (isDuplicate) {
      setAddSchoolError(`"${name}" is already on your checklist.`);
      return;
    }

    const requirements: Requirement[] = [];

   if (newAppType) {
      requirements.push({
        id: 1,
        title: newAppType,
        category: "Application",
        date: newAppDueDate,
        doneLabel: "Submitted",
        openLabel: "Upcoming",
        done: false,
      });
    }

    taskDrafts.forEach((task) => {
    if (!task.name.trim()) {
      return;
    }

    requirements.push({
      id: requirements.length + 1,
      title: task.name.trim(),
      category: task.type || "Task",
      date: task.date,
      doneLabel: "Complete",
      openLabel: "Upcoming",
      done: false,
    });
  });

  updateChecklistSchools((current) => [
    ...current,
    {
      id: Date.now(),
      name,
      dueLabel: "Upcoming",
      requirements,
      ...(newSchoolFitCategory ? { fitCategory: newSchoolFitCategory } : {}),
      pennantKey: getPennantKey(name),
    },
  ]);
  closeAddSchool();
  };

    const deleteSchool = (id: number) => {
    if (!window.confirm("Delete this school and all of its requirements?")) {
      return;
    }
    updateChecklistSchools((current) => current.filter((school) => school.id !== id));
  };

  const removeRequirement = (schoolId: number, requirementId: number) => {
    updateChecklistSchools((current) =>
      current.map((school) =>
        school.id === schoolId
          ? { ...school, requirements: school.requirements.filter((r) => r.id !== requirementId) }
          : school,
      ),
    );
  };

  const updateSchoolFitCategory = (schoolId: number, fitCategory: SchoolFitCategory | undefined) => {
    updateChecklistSchools((current) =>
      current.map((school) => {
        if (school.id !== schoolId) {
          return school;
        }

        const updatedSchool = { ...school };
        if (fitCategory) {
          updatedSchool.fitCategory = fitCategory;
        } else {
          delete updatedSchool.fitCategory;
        }
        return updatedSchool;
      }),
    );
  };

  const handleAddRequirement = (schoolId: number) => {
    const title = newRequirementTitle.trim();

    if (!title) {
      return;
    }

    updateChecklistSchools((current) =>
      current.map((school) => {
        if (school.id !== schoolId) {
          return school;
        }

        const nextId = school.requirements.reduce(
          (highestId, requirement) => Math.max(highestId, requirement.id),
          0,
        ) + 1;

        return {
          ...school,
          requirements: [
            ...school.requirements,
            {
              id: nextId,
              title,
              category: newRequirementType || "Task",
              date: newRequirementDate,
              doneLabel: "Complete",
              openLabel: "Upcoming",
              done: false,
            },
          ],
        };
      }),
    );

    setNewRequirementTitle("");
    setNewRequirementDate("");
    setNewRequirementType("");
    setShowNewRequirementForm(false);
  };

  const closeSchoolEditor = () => {
    setEditingSchoolId(null);
    setShowNewRequirementForm(false);
    setNewRequirementTitle("");
    setNewRequirementDate("");
    setNewRequirementType("");
  };

  useEffect(() => {
    const savedDeadlines = window.localStorage.getItem("college-advisor-deadlines");
    let savedDeadlineList: Deadline[] | undefined;

    if (savedDeadlines) {
      try {
        const parsedDeadlines = JSON.parse(savedDeadlines) as Deadline[];
        if (Array.isArray(parsedDeadlines)) {
          savedDeadlineList = parsedDeadlines;
        }
      } catch {
        window.localStorage.removeItem("college-advisor-deadlines");
      }
    }

    startTransition(() => {
      if (savedDeadlineList) {
        setDeadlines(savedDeadlineList);
      }

      setDeadlinesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!deadlinesLoaded) {
      return;
    }

    window.localStorage.setItem("college-advisor-deadlines", JSON.stringify(deadlines));
  }, [deadlines, deadlinesLoaded]);

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

  const startEditingDeadline = (deadline: Deadline) => {
    setEditingDeadlineId(deadline.id);
    setEditingDeadlineTitle(deadline.title);
    setEditingDeadlineDate(deadline.date);
  };

  const cancelEditingDeadline = () => {
    setEditingDeadlineId(null);
    setEditingDeadlineTitle("");
    setEditingDeadlineDate("");
  };

  const handleUpdateDeadline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = editingDeadlineTitle.trim();

    if (editingDeadlineId === null || !title || !editingDeadlineDate) {
      return;
    }

    setDeadlines((current) =>
      current
        .map((deadline) =>
          deadline.id === editingDeadlineId
            ? { ...deadline, title, date: editingDeadlineDate }
            : deadline,
        )
        .sort((first, second) => first.date.localeCompare(second.date)),
    );
    cancelEditingDeadline();
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

  const today = new Date();
  const todayKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const checklistDeadlines: ChecklistDeadline[] = checklistSchools.flatMap((school) =>
    school.requirements.flatMap((requirement) => {
      if (requirement.done) {
        return [];
      }

      const date = getRequirementDateKey(requirement.date, today.getFullYear());
      return date
        ? [{ id: `${school.id}-${requirement.id}`, title: requirement.title, schoolName: school.name, date }]
        : [];
    }),
  );
  const homepageDeadlines: HomepageDeadline[] = [
    ...checklistDeadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      source: deadline.schoolName,
      date: deadline.date,
    })),
    ...deadlines.map((deadline) => ({
      id: `deadline-${deadline.id}`,
      title: deadline.title,
      source: "Deadlines",
      date: deadline.date,
    })),
  ];
  const upcomingDeadlines = homepageDeadlines
    .filter((deadline) => deadline.date >= todayKey)
    .sort((first, second) => first.date.localeCompare(second.date));
  const overdueDeadlines = homepageDeadlines
    .filter((deadline) => deadline.date < todayKey)
    .sort((first, second) => second.date.localeCompare(first.date));
  const dashboardDeadlines = [...homepageDeadlines]
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(0, 3);
  const totalRequirements = checklistSchools.reduce((total, school) => total + school.requirements.length, 0);
  const completedRequirements = checklistSchools.reduce(
    (total, school) => total + school.requirements.filter((requirement) => requirement.done).length,
    0,
  );
  const schoolFitCounts = schoolFitCategories.reduce(
    (counts, category) => ({
      ...counts,
      [category]: checklistSchools.filter((school) => school.fitCategory === category).length,
    }),
    { "Best fit": 0, Reach: 0, Safety: 0 },
  );
  const categorizedSchoolCount = schoolFitCategories.reduce(
    (total, category) => total + schoolFitCounts[category],
    0,
  );
  const schoolFitTotal = checklistSchools.length;
  const bestFitStop = schoolFitTotal ? (schoolFitCounts["Best fit"] / schoolFitTotal) * 100 : 0;
  const reachStop = schoolFitTotal
    ? bestFitStop + (schoolFitCounts.Reach / schoolFitTotal) * 100
    : 0;
  const schoolFitGradient = schoolFitTotal
    ? `conic-gradient(#28734e 0 ${bestFitStop}%, #c6a45c ${bestFitStop}% ${reachStop}%, #b8c5bb ${reachStop}% 100%)`
    : "#d9dfd5";

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
        body: JSON.stringify({
          message: prompt,
          history: chatMessages
            .slice(initialChatMessages.length)
            .filter((chatMessage) => chatMessage.text.trim())
            .map((chatMessage) => ({
              role: chatMessage.sender === "bot" ? "assistant" : "user",
              content: chatMessage.text,
            })),
        }),
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

  const startNewChat = () => {
    if (isSending) {
      return;
    }

    setChatMessages([...initialChatMessages]);
    setChatInput("");
    setChatError("");
  };

  const checklistQuery = checklistSearch.trim().toLowerCase();

  const visibleSchools = checklistSchools.flatMap((school) => {
  if (!checklistQuery || school.name.toLowerCase().includes(checklistQuery)) {
    return [{ school, rows: school.requirements }];
  }

  const rows = school.requirements.filter((r) =>
    `${r.title} ${r.category}`.toLowerCase().includes(checklistQuery),
  );

  return rows.length ? [{ school, rows }] : [];

  });

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
          <div className="overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">
                    Your college orbit
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold md:text-5xl">Hello{accountName ? `, ${accountName}` : ""}</h2>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Applications",
                    value: checklistSchools.length,
                    note: `${completedRequirements} of ${totalRequirements} checklist items complete`,
                    tone: "bg-white/10 text-white",
                  },
                  {
                    label: "Tracked deadlines",
                    value: homepageDeadlines.length,
                    note: `${overdueDeadlines.length} overdue · ${upcomingDeadlines.length} upcoming`,
                    tone: "bg-white/10 text-white",
                  },
                  {
                    label: "Planning resources",
                    value: resources.length,
                    note: "Available in Resources",
                    tone: "bg-white/10 text-white",
                  },
                ].map((card) => (
                  <div key={card.label} className={`card-lift rounded-2xl border border-white/15 p-4 ${card.tone}`}>
                    <p className="text-sm opacity-75">{card.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                    <p className="mt-1 text-sm opacity-80">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card-lift rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-5 text-white shadow-[0_18px_45px_rgba(40,115,78,0.18)]">
              <h3 className="text-xl font-semibold">Upcoming tasks</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                {dashboardDeadlines.map((deadline) => {
                  const isOverdue = deadline.date < todayKey;
                  const isDueToday = deadline.date === todayKey;

                  return (
                  <li key={deadline.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{deadline.title}</span>
                      <span className="block text-xs text-emerald-100/70">{deadline.source}</span>
                    </span>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${isOverdue ? "bg-rose-600 text-white" : "bg-[#f4e8c1] text-emerald-950"}`}>
                      {isOverdue ? `Overdue · ${formatDeadlineDate(deadline.date)}` : isDueToday ? "Due today" : formatDeadlineDate(deadline.date)}
                    </span>
                  </li>
                  );
                })}
                {dashboardDeadlines.length === 0 && checklistLoadState === "loading" && (
                  <li className="rounded-xl border border-white/15 bg-white/10 px-3 py-4 text-white/80">
                    Loading college tasks…
                  </li>
                )}
                {dashboardDeadlines.length === 0 && checklistLoadState !== "loading" && (
                  <li className="rounded-xl border border-white/15 bg-white/10 px-3 py-4 text-white/80">
                    No incomplete college tasks with due dates. Add tasks in the Colleges tab.
                  </li>
                )}
              </ul>
            </div>

            <div className="card-lift rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-5 text-white shadow-[0_18px_45px_rgba(40,115,78,0.18)]">
              <h3 className="text-xl font-semibold">Helpful resources</h3>
              <div className="mt-4 space-y-3">
                {resources.slice(0, 3).map((resource) => (
                  <a
                    key={resource.title}
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]"
                  >
                    <span className="block">{resource.title}</span>
                    <span className="mt-1 block text-xs font-normal text-emerald-100/70">{resource.category}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "College Chat") {
      return (
        <section className="fade-in-up mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-6 text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">College Chat</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Ask about applications, scholarships, and deadlines</h2>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              disabled={isSending}
              className="rounded-lg bg-[#f4e8c1] px-4 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start new chat
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-[#c6a45c]/50 bg-[#f4eee2] p-4">
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div key={`${message.sender}-${index}`} className={message.sender === "user" ? "ml-auto max-w-xl" : "max-w-xl"}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      message.sender === "bot"
                        ? "border border-emerald-900/10 bg-white text-slate-800 shadow-sm"
                        : "bg-[#28734e] text-white shadow-sm"
                    }`}
                  >
                    {message.sender === "bot" ? (
                      <div className="chat-markdown">
                        {message.text ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{ a: ({ children }) => <>{children}</> }}
                          >
                            {message.text}
                          </ReactMarkdown>
                        ) : isSending && index === chatMessages.length - 1 ? (
                          <span className="animate-pulse">Thinking...</span>
                        ) : null}
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
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
                  className="rounded-lg border border-emerald-900/20 bg-white/55 px-3 py-2 text-xs font-semibold text-emerald-900/55 transition-colors hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-900/15 bg-white p-3 shadow-sm">
              <input
                type="text"
                placeholder="Ask College Companion..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={isSending}
                className="flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !chatInput.trim()}
                className="rounded-lg bg-[#28734e] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#205b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Thinking..." : "Send"}
              </button>
            </form>
            {chatError && <p className="mt-3 text-sm font-medium text-rose-700">{chatError}</p>}
          </div>
        </section>
      );
    }

    if (activeTab === "Resources") {
      return (
        <section className="fade-in-up mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-6 text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">Your planning library</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Resources</h2>
            </div>
            <p className="text-sm text-emerald-50/80">{filteredResources.length} {filteredResources.length === 1 ? "resource" : "resources"}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <label className="flex-1 text-sm font-semibold text-emerald-50">
              Search resources
              <input
                type="search"
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder="Search scholarships, FAFSA, applications..."
                className="mt-1 w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 font-normal text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
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
                    ? "bg-[#f4e8c1] text-emerald-950 shadow-sm"
                    : "border border-white/25 bg-white/10 text-emerald-50/90 hover:bg-white/20 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {filteredResources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-[1.25rem] border border-[#c6a45c]/50 bg-[#f4eee2] p-4 text-slate-800 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-[#28734e]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">{resource.category}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-emerald-950">{resource.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{resource.description}</p>
                <p className="mt-4 text-xs font-semibold text-emerald-800">Open official resource</p>
              </a>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <p className="mt-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-8 text-center text-sm text-white/85">No resources match that search. Try another topic or choose All.</p>
          )}
        </section>
      );
    }

    if (activeTab === "Visualizations") {
      return (
        <section className="fade-in-up mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-6 text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">Visualizations</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Fun ways to track your college journey</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[#c6a45c]/50 bg-[#f4eee2] p-5 text-slate-800 shadow-sm">
              <h3 className="text-lg font-semibold text-emerald-950">School fit meter</h3>
              <div className="mt-5 flex items-center gap-5">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full text-xl font-semibold text-emerald-950"
                  style={{
                    background: schoolFitGradient,
                  }}
                >
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
                    <span>{categorizedSchoolCount}/{schoolFitTotal}</span>
                    <span className="text-[9px] font-medium text-slate-500">categorized</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  {[
                    { category: "Best fit" as const, color: "bg-[#28734e]" },
                    { category: "Reach" as const, color: "bg-[#c6a45c]" },
                    { category: "Safety" as const, color: "bg-[#b8c5bb]" },
                  ].map(({ category, color }) => (
                    <p key={category} className="flex items-center gap-2">
                      <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
                      <span>{category} schools: {schoolFitCounts[category]}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[#c6a45c]/50 bg-[#f4eee2] p-5 text-slate-800 shadow-sm">
              <h3 className="text-lg font-semibold text-emerald-950">Application progress</h3>
              <div className="mt-5 space-y-4">
                {[
                  ["Essays", 80],
                  ["Recommendations", 65],
                  ["Scholarships", 55],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm text-slate-700">
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-emerald-950/10">
                      <div
                        className="h-2.5 rounded-full bg-[#28734e]"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[#c6a45c]/50 bg-[#f4eee2] p-5 text-slate-800 shadow-sm md:col-span-2">
              <h3 className="text-lg font-semibold text-emerald-950">Deadline timeline</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  { month: "Sep", value: 40, label: "Essay review" },
                  { month: "Oct", value: 70, label: "Applications" },
                  { month: "Nov", value: 90, label: "Scholarships" },
                  { month: "Dec", value: 50, label: "Decisions" },
                ].map((item) => (
                  <div key={item.month} className="rounded-xl border border-emerald-900/10 bg-white p-3 shadow-sm">
                    <div className="flex h-24 items-end">
                      <div
                        className="w-full rounded-t-xl bg-[#28734e]"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-emerald-950">{item.month}</p>
                    <p className="text-center text-xs text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      );
    }

    if (activeTab === "Colleges") {
      return (
       <section className="fade-in-up mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-6 text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">Stay organized</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Colleges</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={checklistSearch}
              onChange={(event) => setChecklistSearch(event.target.value)}
              placeholder="Search tasks or schools"
              className="w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1] sm:w-56"/>
          

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]"
          >
            Print
          </button>

          <button
            type="button"
            onClick={() => setShowAddSchool(true)}
            disabled={checklistLoadState !== "ready"}
            className="rounded-lg bg-[#f4e8c1] px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add school
          </button>

        </div>
      </div>

      <div className="mt-6 space-y-4">
      {checklistLoadState === "loading" && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white" role="status">
          Loading your college checklist…
        </p>
      )}
      {checklistLoadState === "error" && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{checklistLoadError}</span>
          <button
            type="button"
            onClick={() => {
              setChecklistLoadResult(null);
              setChecklistLoadAttempt((attempt) => attempt + 1);
            }}
            className="w-fit rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}
      {checklistLoadState === "ready" && !user && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white">
          Demo checklist. Sign in to create and save your own college list.
        </p>
      )}
      {checklistLoadState === "ready" && user && checklistSchools.length === 0 && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white">
          Your checklist is empty. Add a college to get started.
        </p>
      )}
      {checklistLoadState === "ready" && checklistSaveError && (
        <p className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-800" role="alert">
          {checklistSaveError}
        </p>
      )}
      {checklistLoadState === "ready" && visibleSchools.map(({school, rows}) => {
      const completed = school.requirements.filter((r) => r.done).length;
      const percent = school.requirements.length ? (completed / school.requirements.length) * 100 : 0;
      return (
        <div key={school.id} className="overflow-hidden rounded-2xl border border-[#c6a45c]/50 bg-[#f4eee2] text-slate-800 shadow-sm">
                {/* School header */}
        <div className="flex flex-col gap-3 border-b border-emerald-900/10 bg-white/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CollegePennant schoolName={school.name} pennantKey={school.pennantKey} />
            <div>
            <p className="text-sm font-semibold text-emerald-950">{school.name}</p>
            <p className="text-xs text-slate-500">{school.requirements.length} requirements</p>
            {editingSchoolId === school.id && (
              <label className="mt-2 block text-xs font-semibold text-emerald-950">
                School fit
                <select
                  value={school.fitCategory ?? ""}
                  onChange={(event) =>
                    updateSchoolFitCategory(
                      school.id,
                      schoolFitCategories.find((category) => category === event.target.value),
                    )
                  }
                  className="mt-1 rounded-lg border border-emerald-900/15 bg-white px-2 py-1 text-xs font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                >
                  <option value="">Not categorized</option>
                  {schoolFitCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
            )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#28734e 0 ${percent}%, #d9dfd5 ${percent}% 100%)` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-950">
                {completed}/{school.requirements.length}
              </div>
            </div>
            <span className="rounded-lg bg-[#f4e8c1] px-3 py-1 text-center text-xs font-semibold text-emerald-950">
              {school.dueLabel}
            </span>

            {editingSchoolId === school.id ? (
              <button type="button" onClick={closeSchoolEditor}
                className="rounded-lg bg-[#28734e] px-3 py-1 text-xs font-semibold text-white hover:bg-[#205b3e]">
                Done
              </button>
              ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSchoolId(school.id);
                    setShowNewRequirementForm(false);
                  }}
                  className="rounded-lg border border-emerald-900/20 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteSchool(school.id)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Requirement rows */}
        {rows.map((r) => {
          const requirementDateKey = getRequirementDateKey(r.date, today.getFullYear());
          const isOverdue = !r.done && requirementDateKey !== null && requirementDateKey < todayKey;
          const isDueToday = !r.done && requirementDateKey === todayKey;

          return (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-4 border-b border-emerald-900/10 px-4 py-3 last:border-b-0 hover:bg-white/60"
              >
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={() => toggleRequirement(school.id, r.id)}
                  className="h-4 w-4 accent-[#28734e]"
                />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${r.done ? "text-slate-400" : "text-emerald-950"}`}>{r.title}</p>
                  <p className="text-xs text-slate-400">{r.category}</p>
                </div>
                <span className="text-xs text-slate-500">{formatDeadlineDate(r.date)}</span>
                <span
                  className={`w-24 rounded-full px-3 py-1 text-center text-xs font-semibold ${
                    r.done
                      ? "bg-[#28734e] text-white"
                      : isOverdue
                        ? "bg-rose-600 text-white"
                        : isDueToday
                          ? "bg-rose-50 text-rose-600"
                          : "bg-white text-slate-600"
                  }`}
                >
                  {r.done ? "Complete" : isOverdue ? "Overdue" : isDueToday ? "Due today" : r.openLabel}
                </span>

                {editingSchoolId === school.id && (
                  <button type="button" onClick={() => removeRequirement(school.id, r.id)}
                    className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                    Remove
                  </button>
                )}
              </label>
          );
        })}
        {editingSchoolId === school.id && (
          <div className="border-b border-emerald-900/10 px-4 py-3">
            {!showNewRequirementForm ? (
              <button
                type="button"
                onClick={() => setShowNewRequirementForm(true)}
                className="rounded-lg border border-emerald-900/20 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                + Add task
              </button>
            ) : (
              <form
                className="space-y-3 rounded-xl border border-emerald-900/15 bg-white/70 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAddRequirement(school.id);
                }}
              >
                <h3 className="text-sm font-semibold text-emerald-950">Add a task for {school.name}</h3>
                <label className="block text-xs font-semibold text-emerald-950">
                  Task name
                  <input
                    type="text"
                    value={newRequirementTitle}
                    onChange={(event) => setNewRequirementTitle(event.target.value)}
                    placeholder="e.g. Submit recommendation letter"
                    required
                    className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-emerald-950">
                    Task type
                    <select
                      value={newRequirementType}
                      onChange={(event) => setNewRequirementType(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                    >
                      <option value="">Select a task type</option>
                      <option>Application</option>
                      <option>Academic records</option>
                      <option>Recommendations</option>
                      <option>Writing supplement</option>
                      <option>Financial aid</option>
                      <option>Scholarship</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-emerald-950">
                    Due date
                    <input
                      type="date"
                      value={newRequirementDate}
                      onChange={(event) => setNewRequirementDate(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewRequirementForm(false);
                      setNewRequirementTitle("");
                      setNewRequirementDate("");
                      setNewRequirementType("");
                    }}
                    className="rounded-lg border border-emerald-900/20 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newRequirementTitle.trim()}
                    className="rounded-lg bg-[#28734e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#205b3e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save task
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  })}
      </div>
        {showAddSchool &&
          createPortal(
  <div
    className="fixed inset-0 z-50 flex h-dvh w-screen items-stretch justify-stretch bg-emerald-950/50 backdrop-blur-sm"
    onClick={closeAddSchool}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-school-title"
      className="h-full w-full overflow-y-auto border border-[#c6a45c]/50 bg-[#f4eee2] p-6 text-slate-800 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h2 id="add-school-title" className="text-xl font-semibold text-emerald-950">Add a school</h2>
        <button
          type="button"
          onClick={closeAddSchool}
          aria-label="Close"
          className="rounded-lg px-3 py-1 text-lg font-semibold text-emerald-800 transition hover:bg-emerald-900/10 hover:text-emerald-950"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-emerald-900/15 bg-white/60">
        <div className="border-b border-emerald-900/10 px-4 py-3 text-sm font-semibold text-emerald-950">
          School details
        </div>

        <div className="space-y-4 px-4 py-4">
          <label className="block text-xs font-semibold text-emerald-950">
            School name <span className="text-rose-500">*</span>
            <input
              type="text"
              value={newSchoolName}
              onChange={(event) => {
                setNewSchoolName(event.target.value);
                setAddSchoolError("");
              }}

              placeholder="e.g. Northbridge University"
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:ring-2 ${
                addSchoolError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-emerald-900/15 focus:border-[#c6a45c] focus:ring-[#f4e8c1]"}`}/>
            
              {addSchoolError && (
                <span className="mt-1 block text-xs font-normal text-rose-600">{addSchoolError}</span>
              )}
          </label>

          <fieldset>
            <legend className="text-xs font-semibold text-emerald-950">School fit (optional)</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {schoolFitCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={newSchoolFitCategory === category}
                  onClick={() =>
                    setNewSchoolFitCategory((current) => current === category ? null : category)
                  }
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    newSchoolFitCategory === category
                      ? "border-[#28734e] bg-[#28734e] text-white"
                      : "border-emerald-900/20 bg-white text-emerald-900 hover:bg-emerald-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs font-normal text-slate-500">
              Choose a category to include this college in the School fit meter.
            </p>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-emerald-950">
              Application Type
              <select
                value={newAppType}
                onChange={(event) => setNewAppType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
              >
                <option value="">Select an application type</option>
                <option>Common Application</option>
                <option>Coalition Application</option>
                <option>Direct application</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-emerald-950">
              Application Due Date
              <input
                type="date"
                value={newAppDueDate}
                onChange={(event) => setNewAppDueDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
              />
            </label>
          </div>

          <div className="space-y-4 pt-2">
  <p className="text-sm font-semibold text-emerald-950">Tasks</p>

  {taskDrafts.map((task, index) =>
    task.saved ? (
      <div
        key={task.id}
        className="flex items-center gap-4 rounded-lg border border-emerald-900/15 bg-white px-3 py-2"
      >
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-950">{task.name}</p>
          <p className="text-xs text-slate-400">{task.type || "Task"}</p>
        </div>
        <span className="text-xs text-slate-500">
          {task.date ? formatDeadlineDate(task.date) : ""}
        </span>
        <button
          type="button"
          onClick={() => updateTaskDraft(task.id, { saved: false })}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-900/10"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => removeTaskDraft(task.id)}
          aria-label={`Remove ${task.name}`}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          ✕
        </button>
      </div>
    ) : (
      <div
        key={task.id}
        className="space-y-4 rounded-lg border border-emerald-900/15 bg-white/60 p-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-emerald-950">Task {index + 1}</p>
          {taskDrafts.length > 1 && (
            <button
              type="button"
              onClick={() => removeTaskDraft(task.id)}
              aria-label={`Remove task ${index + 1}`}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              ✕
            </button>
          )}
        </div>

        <label className="block text-xs font-semibold text-emerald-950">
          Task name
          <input
            type="text"
            value={task.name}
            onChange={(event) => updateTaskDraft(task.id, { name: event.target.value })}
            placeholder="e.g. Review application packet"
            className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
          />
        </label>

        <label className="block text-xs font-semibold text-emerald-950">
          Task due date
          <input
            type="date"
            value={task.date}
            onChange={(event) => updateTaskDraft(task.id, { date: event.target.value })}
            className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
          />
        </label>

        <label className="block text-xs font-semibold text-emerald-950">
          Task type
          <select
            value={task.type}
            onChange={(event) => updateTaskDraft(task.id, { type: event.target.value })}
            className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
          >
            <option value="">Select a task type</option>
            <option>Application</option>
            <option>Academic records</option>
            <option>Recommendations</option>
            <option>Writing supplement</option>
            <option>Financial aid</option>
          </select>
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => updateTaskDraft(task.id, { saved: true })}
            disabled={!task.name.trim()}
            className="rounded-lg border border-emerald-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload task
          </button>
        </div>
      </div>
    ),
   )}

    <div className="flex justify-end">
      <button
        type="button"
        onClick={addTaskDraft}
        disabled={taskDrafts.some((t) => !t.saved && !t.name.trim())}
        className="rounded-lg border border-emerald-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add another task
      </button>
    </div>
  </div>
  
  </div>
        <div className="border-t border-emerald-900/10 p-3">
          <button
            type="button"
            onClick={handleAddSchool}
            disabled={!newSchoolName.trim()}
            className="w-full rounded-lg bg-[#28734e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#205b3e] disabled:cursor-not-allowed disabled:opacity-50">
            + Add school
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body,)}
  </section>);}

    return (
      <section className="fade-in-up mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] p-6 text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4e8c1]">Stay on track</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Deadlines</h2>
          </div>
          <p className="text-sm text-emerald-50/80">
            {deadlines.length + checklistDeadlines.length}{" "}
            {deadlines.length + checklistDeadlines.length === 1 ? "deadline" : "deadlines"}
          </p>
        </div>

        <div className="mt-5 inline-flex rounded-xl border border-white/15 bg-white/10 p-1">
          {(["list", "calendar"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setDeadlineView(view)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1] ${
                deadlineView === view ? "bg-[#f4e8c1] text-emerald-950 shadow-sm" : "text-emerald-50/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddDeadline} className="mt-6 grid gap-3 rounded-2xl border border-[#c6a45c]/50 bg-[#f4eee2] p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="text-sm font-semibold text-emerald-950">
            What is due?
            <input type="text" value={deadlineTitle} onChange={(event) => setDeadlineTitle(event.target.value)} placeholder="e.g. Submit FAFSA" maxLength={100} className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 font-normal text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]" required />
          </label>
          <label className="text-sm font-semibold text-emerald-950">
            Due date
            <input type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} className="mt-1 rounded-xl border border-emerald-900/15 bg-white px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]" required />
          </label>
          <button type="submit" className="rounded-lg bg-[#28734e] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#205b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Add deadline</button>
        </form>

        {deadlineView === "list" ? (
          <div className="mt-6 space-y-3">
            {[...deadlines].sort((first, second) => first.date.localeCompare(second.date)).map((deadline) => (
              <div
                key={deadline.id}
                className="rounded-xl border border-[#c6a45c]/50 bg-[#f4eee2] px-4 py-3 text-slate-800 shadow-sm"
              >
                {editingDeadlineId === deadline.id ? (
                  <form onSubmit={handleUpdateDeadline} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                    <label className="text-xs font-semibold text-emerald-950">
                      Task
                      <input
                        type="text"
                        value={editingDeadlineTitle}
                        onChange={(event) => setEditingDeadlineTitle(event.target.value)}
                        maxLength={100}
                        required
                        className="mt-1 w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                      />
                    </label>
                    <label className="text-xs font-semibold text-emerald-950">
                      Due date
                      <input
                        type="date"
                        value={editingDeadlineDate}
                        onChange={(event) => setEditingDeadlineDate(event.target.value)}
                        required
                        className="mt-1 rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-[#c6a45c] focus:ring-2 focus:ring-[#f4e8c1]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!editingDeadlineTitle.trim() || !editingDeadlineDate}
                      className="rounded-lg bg-[#28734e] px-3 py-2 text-xs font-semibold text-white hover:bg-[#205b3e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingDeadline}
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{deadline.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#28734e] px-2 py-1 text-xs font-bold text-white">{formatDeadlineDate(deadline.date)}</span>
                      <button
                        type="button"
                        onClick={() => startEditingDeadline(deadline)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-700"
                        aria-label={`Edit ${deadline.title}`}
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => setDeadlines((current) => current.filter((item) => item.id !== deadline.id))} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" aria-label={`Remove ${deadline.title}`}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {deadlines.length === 0 && <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-6 text-center text-sm text-white/85">No deadlines yet. Add one above to get started.</p>}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[#c6a45c]/50 bg-[#f4eee2] p-4">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => shiftCalendarMonth(-1)} className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-900 transition hover:bg-emerald-900/10 focus-visible:outline-2 focus-visible:outline-emerald-700" aria-label="Previous month">&lt;</button>
              <h3 className="text-lg font-semibold text-emerald-950">
                {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarDate)}
              </h3>
              <button type="button" onClick={() => shiftCalendarMonth(1)} className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-900 transition hover:bg-emerald-900/10 focus-visible:outline-2 focus-visible:outline-emerald-700" aria-label="Next month">&gt;</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
              {calendarWeekdays.map((weekday) => <span key={weekday} className="py-2">{weekday}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, index) => {
                const dateKey = day === null ? "" : getDateKey(calendarYear, calendarMonth, day);
                const dayDeadlines = deadlines.filter((deadline) => deadline.date === dateKey);
                const dayChecklistTasks = checklistDeadlines.filter((task) => task.date === dateKey);

                return (
                  <div key={day === null ? `empty-${index}` : dateKey} className={`min-h-24 rounded-xl p-2 text-left ring-1 ${day === null ? "bg-emerald-900/[0.03] ring-transparent" : "bg-white ring-emerald-900/10"}`}>
                    {day !== null && (
                      <>
                        <span className="text-sm font-bold text-emerald-950">{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayDeadlines.map((deadline) => (
                            <div key={deadline.id} className="rounded-md bg-[#28734e] px-1.5 py-1 text-[10px] font-semibold leading-tight text-white" title={deadline.title}>
                              {deadline.title}
                            </div>
                          ))}
                          {dayChecklistTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight text-white ${
                                task.date < todayKey ? "bg-rose-600" : "bg-emerald-700"
                              }`}
                              title={`${task.schoolName}: ${task.title}`}
                            >
                              <span className="block truncate">{task.title}</span>
                              <span className="block truncate font-normal text-white/80">{task.schoolName}</span>
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
    <main className="min-h-screen bg-[#e1f0df] px-6 py-8">
      <div className="relative mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-[1.75rem] border border-emerald-950/10 border-b-[3px] border-b-[#c6a45c] bg-[#28734e] text-white shadow-[0_18px_45px_rgba(40,115,78,0.22)]">
          <div className="flex flex-col gap-4 border-b border-white/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <Image
                  src="/college-companion-logo.png"
                  alt="College Companion"
                  width={1855}
                  height={220}
                  priority
                  className="h-10 w-auto max-w-full object-contain object-left"
                />
                <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-100/70">
                  College planning · Student success
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Suspense>
                <Show when="signed-out">
                  <SignInButton>
                    <button className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="rounded-lg bg-[#f4e8c1] px-4 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]">
                      Create account
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/account"
                    className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1]"
                  >
                    Account
                  </Link>
                  <UserButton />
                </Show>
              </Suspense>
            </div>
          </div>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1 overflow-x-auto px-4 py-3 text-sm font-semibold sm:px-6"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4e8c1] ${
                  activeTab === tab
                    ? "bg-[#f4e8c1] text-emerald-950 shadow-sm"
                    : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        {renderContent()}
        {celebration && (
          <>
            <div key={celebration.id} className="confetti-celebration" aria-hidden="true">
              {confettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="confetti-piece"
                  style={{
                    left: piece.left,
                    backgroundColor: piece.color,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    width: piece.width,
                    height: piece.height,
                  }}
                />
              ))}
            </div>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              All requirements for {celebration.schoolName} are complete.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
