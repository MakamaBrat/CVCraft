import { useEffect, useMemo, useState } from "react";
import Home from "./screens/Home.jsx";
import Wizard from "./screens/Wizard.jsx";
import Templates from "./screens/Templates.jsx";
import Preview from "./screens/Preview.jsx";
import SharedView from "./screens/SharedView.jsx";
import TelegramGate from "./components/TelegramGate.jsx";
import { supabase, supabaseEnabled } from "./lib/supabase.js";
import { getTelegramUser, initTelegramApp } from "./lib/telegram.js";

const IDENTITY_KEY = "cvcraft.identity.v1";
const LOCAL_RESUMES_KEY = "cvcraft.resumes.v1";

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

function loadIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadLocalResumes() {
  try {
    const raw = localStorage.getItem(LOCAL_RESUMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function parseHashRoute() {
  const hash = window.location.hash;
  const m = hash.match(/^#\/r\/([a-zA-Z0-9-]+)/);
  if (m) return m[1];
  const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (tgStartParam?.startsWith("r-")) return tgStartParam.slice(2);
  return null;
}

export default function App() {
  const sharedId = useMemo(() => parseHashRoute(), []);
  const [identity, setIdentity] = useState(loadIdentity);
  const [checkedTelegram, setCheckedTelegram] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [route, setRoute] = useState({ screen: "home" });
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    initTelegramApp();
    const tgUser = getTelegramUser();
    if (tgUser) {
      const resolved = { id: tgUser.id, username: tgUser.username, firstName: tgUser.firstName };
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(resolved));
      setIdentity(resolved);
    }
    setCheckedTelegram(true);
  }, []);

  useEffect(() => {
    if (sharedId || !identity) return;
    let cancelled = false;

    async function load() {
      setLoadingResumes(true);
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("resumes")
          .select("id, data, updated_at")
          .eq("telegram_id", identity.id)
          .order("updated_at", { ascending: false });
        if (!cancelled) {
          if (!error && data) {
            setResumes(
              data.map((row) => ({ ...row.data, id: row.id, updatedAt: new Date(row.updated_at).getTime() }))
            );
          }
          setLoadingResumes(false);
        }
      } else {
        if (!cancelled) {
          setResumes(loadLocalResumes());
          setLoadingResumes(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [identity, sharedId]);

  useEffect(() => {
    if (!supabaseEnabled && identity) {
      localStorage.setItem(LOCAL_RESUMES_KEY, JSON.stringify(resumes));
    }
  }, [resumes, identity]);

  if (sharedId) {
    return (
      <div className="phone-shell">
        <SharedView
          resumeId={sharedId}
          onOpenApp={() => {
            window.location.hash = "";
            window.location.reload();
          }}
        />
      </div>
    );
  }

  if (!checkedTelegram) {
    return (
      <div className="phone-shell">
        <div className="flex-1 flex items-center justify-center bg-base-950 text-white/40 text-sm">
          Завантаження…
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="phone-shell">
        <TelegramGate
          onSubmit={(id) => {
            localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
            setIdentity(id);
          }}
        />
      </div>
    );
  }

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

  const commitDraft = async (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    setDraft(next);
    setResumes((prev) => {
      const exists = prev.some((r) => r.id === next.id);
      return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [next, ...prev];
    });

    if (supabaseEnabled) {
      const { id, updatedAt, ...data } = next;
      await supabase.from("resumes").upsert({
        id,
        telegram_id: identity.id,
        telegram_username: identity.username || null,
        data,
      });
    }
  };

  const deleteResume = async (id) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (supabaseEnabled) {
      await supabase.from("resumes").delete().eq("id", id);
    }
  };

  return (
    <div className="phone-shell">
      {route.screen === "home" && (
        <Home
          resumes={resumes}
          loading={loadingResumes}
          identity={identity}
          onCreate={startNew}
          onEdit={editExisting}
          onDelete={deleteResume}
        />
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
          onBack={() => setRoute({ screen: "wizard", step: 5 })}
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
