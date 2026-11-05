import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ouderschap_standalone_data";

export const childColors = [
  { id: "salie", hex: "#6F7F68" },
  { id: "klei", hex: "#C07B5C" },
  { id: "blauw", hex: "#6B7F99" },
  { id: "lavendel", hex: "#8A7CA8" },
  { id: "honing", hex: "#B8923E" },
  { id: "taupe", hex: "#8A7E72" },
];

export const defaultChildColor = (index) =>
  childColors[index % childColors.length].hex;

export function calculateAge(birthDateString, now = new Date()) {
  if (!birthDateString) return null;
  const birthDate = new Date(birthDateString);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;

  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 1) {
    const totalMonths = Math.max(1, years * 12 + months);
    return { value: totalMonths, unit: totalMonths === 1 ? "month" : "months" };
  }
  return { value: years, unit: years === 1 ? "year" : "years" };
}

// 14-day default cycle: 7 days "ik", 7 days "ander"
const defaultSchedule = {
  pattern: "om-de-week",
  days: ["ik", "ik", "ik", "ik", "ik", "ik", "ik", "ander", "ander", "ander", "ander", "ander", "ander", "ander"],
  switchTime: "14:30",
  switchLocation: "",
  startMonday: new Date().toISOString().slice(0, 10),
};

const defaultInitialState = {
  user: {
    name: "Ouder",
    mode: "samen",
    photo: null,
    onboarded: false,
  },
  children: [], // ZERO mock data - clean initial state
  schedule: defaultSchedule,
  appointments: [],
  tasks: [],
  expenses: [],
  topics: [],
  proposals: [],
  documents: [],
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultInitialState, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load family data", e);
    }
    return defaultInitialState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save family data", e);
    }
  }, [state]);

  const updateProfile = (updates) => {
    setState((prev) => ({
      ...prev,
      user: { ...prev.user, ...updates },
    }));
  };

  const addChild = ({ name, birthDate, color, photo, custody, school, medical, practical }) => {
    const newChild = {
      id: `child-${Date.now()}`,
      name: name.trim(),
      birthDate: birthDate || "",
      color: color || defaultChildColor(state.children.length),
      photo: photo || null,
      custody: custody || "unknown",
      school: school || "",
      medical: medical || "",
      practical: practical || "",
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      children: [...prev.children, newChild],
    }));
    return newChild;
  };

  const updateChild = (id, updates) => {
    setState((prev) => ({
      ...prev,
      children: prev.children.map((k) => (k.id === id ? { ...k, ...updates } : k)),
    }));
  };

  const deleteChild = (id) => {
    setState((prev) => ({
      ...prev,
      children: prev.children.filter((k) => k.id !== id),
    }));
  };

  const setSchedule = (scheduleUpdates) => {
    setState((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, ...scheduleUpdates },
    }));
  };

  const addAppointment = (apt) => {
    const item = {
      id: `apt-${Date.now()}`,
      ...apt,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      appointments: [item, ...prev.appointments],
    }));
    return item;
  };

  const deleteAppointment = (id) => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.filter((a) => a.id !== id),
    }));
  };

  const addTask = (task) => {
    const item = {
      id: `task-${Date.now()}`,
      completed: false,
      isPackingItem: false,
      ...task,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      tasks: [item, ...prev.tasks],
    }));
    return item;
  };

  const toggleTask = (id) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  };

  const deleteTask = (id) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const addExpense = (exp) => {
    const item = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      settled: false,
      ...exp,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      expenses: [item, ...prev.expenses],
    }));
    return item;
  };

  const deleteExpense = (id) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const addProposal = (prop) => {
    const item = {
      id: `prop-${Date.now()}`,
      status: "open",
      createdAt: new Date().toISOString(),
      ...prop,
    };
    setState((prev) => ({
      ...prev,
      proposals: [item, ...prev.proposals],
    }));
    return item;
  };

  const respondProposal = (id, status) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  };

  const addTopic = (title) => {
    const topic = {
      id: `topic-${Date.now()}`,
      title: title.trim(),
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      topics: [topic, ...prev.topics],
    }));
    return topic;
  };

  const addMessage = (topicId, text, sender = "ik") => {
    const msg = {
      id: `msg-${Date.now()}`,
      text: text.trim(),
      sender,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) =>
        t.id === topicId ? { ...t, messages: [...t.messages, msg] } : t
      ),
    }));
    return msg;
  };

  const clearAllData = () => {
    setState(defaultInitialState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        updateProfile,
        addChild,
        updateChild,
        deleteChild,
        setSchedule,
        addAppointment,
        deleteAppointment,
        addTask,
        toggleTask,
        deleteTask,
        addExpense,
        deleteExpense,
        addProposal,
        respondProposal,
        addTopic,
        addMessage,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

