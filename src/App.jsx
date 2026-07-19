import { useEffect, useState } from "react";
import Home from "./screens/Home.jsx";
import Wizard from "./screens/Wizard.jsx";
import Templates from "./screens/Templates.jsx";
import Preview from "./screens/Preview.jsx";

const STORAGE_KEY = "cvcraft.resumes.v1";

const emptyResume = () => ({
  id: crypto.randomUUID(),
  updatedAt: Date.now(),
  fullName: "",
  role: "",
  email: "",
  phone: "",
  city: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  portfolio: [],
  template: "minimal",
});

function loadResumes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveResumes(resumes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

export default function App() {
  const [resumes, setResumes] = useState(loadResumes);
  const [route, setRoute] = useState({ screen: "home" });
  const [draft, setDraft] = useState(null);

  useEffect(() => saveResumes(resumes), [resumes]);

  const startNew = () => {
    const r = emptyResume();
    setDraft(r);
    setRoute({ screen: "wizard", step: 0 });
  };

  const editExisting = (id) => {
    const r = resumes.find((x) => x.id === id);
    if (r) {
      setDraft(r);
      setRoute({ screen: "wizard", step: 0 });
    }
  };

  const goTemplates = () => setRoute({ screen: "templates" });
  const goPreview = () => setRoute({ screen: "preview" });
  const goHome = () => setRoute({ screen: "home" });

  const commitDraft = (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    setDraft(next);
    setResumes((prev) => {
      const exists = prev.some((r) => r.id === next.id);
      return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [next, ...prev];
    });
  };

  const deleteResume = (id) => setResumes((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="phone-shell">
      {route.screen === "home" && (
        <Home resumes={resumes} onCreate={startNew} onEdit={editExisting} onDelete={deleteResume} />
      )}
      {route.screen === "wizard" && draft && (
        <Wizard
          draft={draft}
          setDraft={setDraft}
          step={route.step}
          setStep={(step) => setRoute({ screen: "wizard", step })}
          onBackHome={goHome}
          onFinishInfo={() => {
            commitDraft(draft);
            goTemplates();
          }}
        />
      )}
      {route.screen === "templates" && draft && (
        <Templates
          draft={draft}
          setDraft={(d) => {
            setDraft(d);
            commitDraft(d);
          }}
          onBack={() => setRoute({ screen: "wizard", step: 4 })}
          onNext={goPreview}
        />
      )}
      {route.screen === "preview" && draft && (
        <Preview
          resume={draft}
          onBack={goTemplates}
          onDone={() => {
            commitDraft(draft);
            goHome();
          }}
        />
      )}
    </div>
  );
}
