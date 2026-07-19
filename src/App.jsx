import { useEffect, useMemo, useState } from "react";
import Home from "./screens/Home.jsx";
import Wizard from "./screens/Wizard.jsx";
import Templates from "./screens/Templates.jsx";
import Preview from "./screens/Preview.jsx";
import SharedView from "./screens/SharedView.jsx";
import VacancyWizard from "./screens/VacancyWizard.jsx";
import VacancyTemplates from "./screens/VacancyTemplates.jsx";
import VacancyPreview from "./screens/VacancyPreview.jsx";
import VacancyList from "./screens/VacancyList.jsx";
import VacancyBrowse from "./screens/VacancyBrowse.jsx";
import VacancyDetail from "./screens/VacancyDetail.jsx";
import VacancyApplicants from "./screens/VacancyApplicants.jsx";
import AdminPanel from "./screens/AdminPanel.jsx";
import TelegramGate from "./components/TelegramGate.jsx";
import { supabase, supabaseEnabled } from "./lib/supabase.js";
import { getTelegramUser, initTelegramApp } from "./lib/telegram.js";
import { MAX_RESUMES_PER_USER, MAX_VACANCIES_PER_USER, isAdmin as checkIsAdmin } from "./lib/config.js";
import { emptyVacancy, vacancyFromRow, VACANCY_STATUS } from "./lib/vacancy.js";
import { useLanguage } from "./lib/i18n/index.jsx";

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
  if (tgStartParam) return tgStartParam;
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

  const [vacancies, setVacancies] = useState([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [vacancyDraft, setVacancyDraft] = useState(null);
  const [publicVacancies, setPublicVacancies] = useState([]);
  const [loadingPublicVacancies, setLoadingPublicVacancies] = useState(true);
  const [openVacancy, setOpenVacancy] = useState(null);
  const [appliedVacancyIds, setAppliedVacancyIds] = useState(() => new Set());
  const [applicantsVacancy, setApplicantsVacancy] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

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

  const { lang, t } = useLanguage();

  useEffect(() => {
    if (!identity || !supabaseEnabled) return;
    supabase
      .from("users")
      .upsert({
        telegram_id: identity.id,
        telegram_username: identity.username || null,
        first_name: identity.firstName || null,
        last_active_at: new Date().toISOString(),
        language_code: lang,
      })
      .then(() => {});
  }, [identity, lang]);

  // Оновлюємо last_active_at періодично, поки застосунок відкритий,
  // щоб адмінська статистика "активних сьогодні" була точною.
  useEffect(() => {
    if (!identity || !supabaseEnabled) return;
    const interval = setInterval(() => {
      supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("telegram_id", identity.id)
        .then(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [identity]);

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

  useEffect(() => {
    if (sharedId || !identity || !supabaseEnabled) {
      setLoadingVacancies(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingVacancies(true);
      const { data, error } = await supabase
        .from("vacancies")
        .select("*")
        .eq("telegram_id", identity.id)
        .order("updated_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setVacancies(data.map(vacancyFromRow));
        setLoadingVacancies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, sharedId]);

  const loadPublicVacancies = async () => {
    if (!supabaseEnabled) {
      setLoadingPublicVacancies(false);
      return;
    }
    setLoadingPublicVacancies(true);
    const { data, error } = await supabase
      .from("vacancies")
      .select("*")
      .eq("status", VACANCY_STATUS.ACTIVE)
      .order("created_at", { ascending: false });
    if (!error && data) setPublicVacancies(data.map(vacancyFromRow));
    setLoadingPublicVacancies(false);
  };

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
          {t("common.loading")}
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

  const canCreateMore = resumes.length < MAX_RESUMES_PER_USER;

  const startNew = () => {
    if (!canCreateMore) return;
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
    const isNew = !resumes.some((r) => r.id === next.id);

    if (isNew && resumes.length >= MAX_RESUMES_PER_USER) {
      goHome();
      return;
    }

    setDraft(next);
    setResumes((prev) => {
      const exists = prev.some((r) => r.id === next.id);
      return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [next, ...prev];
    });

    if (supabaseEnabled) {
      const { id, updatedAt, ...data } = next;
      const { error } = await supabase.from("resumes").upsert({
        id,
        telegram_id: identity.id,
        data,
      });
      if (error) {
        // most likely the 2-resume limit trigger fired (race condition)
        setResumes((prev) => prev.filter((r) => r.id !== id));
      }
    }
  };

  const deleteResume = async (id) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (supabaseEnabled) {
      await supabase.from("resumes").delete().eq("id", id);
    }
  };

  const isUserAdmin = checkIsAdmin(identity?.id);
  const canCreateMoreVacancies = vacancies.length < MAX_VACANCIES_PER_USER;

  const goVacancyList = () => setRoute({ screen: "vacancies" });
  const goVacancyTemplates = () => setRoute({ screen: "vacancyTemplates" });
  const goVacancyPreview = () => setRoute({ screen: "vacancyPreview" });
  const goAdmin = () => setRoute({ screen: "admin" });
  const goBrowseVacancies = () => {
    loadPublicVacancies();
    setRoute({ screen: "browseVacancies" });
  };

  const startNewVacancy = () => {
    if (!canCreateMoreVacancies) return;
    setVacancyDraft(emptyVacancy());
    setRoute({ screen: "vacancyWizard", step: 0 });
  };

  const editVacancy = (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (v) {
      setVacancyDraft(v);
      setRoute({ screen: "vacancyWizard", step: 0 });
    }
  };

  const commitVacancyDraft = async (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    const isNew = !vacancies.some((v) => v.id === next.id);

    if (isNew && vacancies.length >= MAX_VACANCIES_PER_USER) {
      goVacancyList();
      return;
    }

    setVacancyDraft(next);
    setVacancies((prev) => {
      const exists = prev.some((v) => v.id === next.id);
      return exists ? prev.map((v) => (v.id === next.id ? next : v)) : [next, ...prev];
    });

    if (supabaseEnabled) {
      const { id, updatedAt, status, rejectReason, showsPurchased, showsUsed, isPaid, listingPrice, pricePerShow, template, ...data } = next;
      const { error } = await supabase.from("vacancies").upsert({
        id,
        telegram_id: identity.id,
        data,
        template,
      });
      if (error) {
        setVacancies((prev) => prev.filter((v) => v.id !== id));
      }
    }
  };

  const deleteVacancy = async (id) => {
    setVacancies((prev) => prev.filter((v) => v.id !== id));
    if (supabaseEnabled) {
      await supabase.from("vacancies").delete().eq("id", id);
    }
  };

  const sendVacancyToModeration = async (vacancy) => {
    const next = { ...vacancy, status: VACANCY_STATUS.PENDING_REVIEW, rejectReason: null };
    setVacancyDraft(next);
    setVacancies((prev) => prev.map((v) => (v.id === next.id ? next : v)));
    if (supabaseEnabled) {
      await supabase
        .from("vacancies")
        .update({ status: VACANCY_STATUS.PENDING_REVIEW, reject_reason: null })
        .eq("id", vacancy.id);
    }
    goVacancyList();
  };

  const openVacancyDetail = async (id) => {
    const v = publicVacancies.find((x) => x.id === id);
    if (!v) return;
    setOpenVacancy(v);
    setRoute({ screen: "vacancyDetail" });
    if (supabaseEnabled) {
      await supabase.rpc("register_vacancy_show", { p_vacancy_id: id });
    }
  };

  const applyToVacancy = async (message, resumeId) => {
    if (!openVacancy) return;
    setAppliedVacancyIds((prev) => new Set(prev).add(openVacancy.id));
    if (supabaseEnabled) {
      const resume = resumeId ? resumes.find((r) => r.id === resumeId) : null;
      const contact = (resume && resume.phone) || (identity.username ? `@${identity.username}` : null);
      await supabase.from("vacancy_applications").insert({
        vacancy_id: openVacancy.id,
        telegram_id: identity.id,
        message: message || null,
        contact,
        resume_id: resumeId || null,
        resume_snapshot: resume || null,
      });
    }
  };

  const goApplicants = async (vacancyId) => {
    const v = vacancies.find((x) => x.id === vacancyId);
    if (!v) return;
    setApplicantsVacancy(v);
    setRoute({ screen: "vacancyApplicants" });
    if (!supabaseEnabled) {
      setApplicants([]);
      return;
    }
    setLoadingApplicants(true);
    const { data, error } = await supabase
      .from("vacancy_applications")
      .select("id, message, contact, resume_id, resume_snapshot, created_at, telegram_id")
      .eq("vacancy_id", vacancyId)
      .order("created_at", { ascending: false });
    if (!error && data) setApplicants(data);
    setLoadingApplicants(false);
  };

  return (
    <div className="phone-shell">
      {route.screen === "home" && (
        <Home
          resumes={resumes}
          loading={loadingResumes}
          identity={identity}
          canCreateMore={canCreateMore}
          maxResumes={MAX_RESUMES_PER_USER}
          onCreate={startNew}
          onEdit={editExisting}
          onDelete={deleteResume}
          onOpenVacancies={goVacancyList}
          onCreateVacancy={startNewVacancy}
          onBrowseVacancies={goBrowseVacancies}
          onOpenAdmin={goAdmin}
          isAdmin={isUserAdmin}
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

      {route.screen === "vacancies" && (
        <VacancyList
          vacancies={vacancies}
          loading={loadingVacancies}
          onBack={goHome}
          onCreate={startNewVacancy}
          onEdit={editVacancy}
          onDelete={deleteVacancy}
          onOpenApplicants={goApplicants}
          canCreateMore={canCreateMoreVacancies}
          maxVacancies={MAX_VACANCIES_PER_USER}
        />
      )}

      {route.screen === "vacancyWizard" && vacancyDraft && (
        <VacancyWizard
          draft={vacancyDraft}
          setDraft={setVacancyDraft}
          step={route.step}
          setStep={(step) => setRoute({ screen: "vacancyWizard", step })}
          onBackHome={goVacancyList}
          onFinishInfo={() => {
            commitVacancyDraft(vacancyDraft);
            goVacancyTemplates();
          }}
        />
      )}

      {route.screen === "vacancyTemplates" && vacancyDraft && (
        <VacancyTemplates
          draft={vacancyDraft}
          setDraft={(d) => {
            setVacancyDraft(d);
            commitVacancyDraft(d);
          }}
          onBack={() => setRoute({ screen: "vacancyWizard", step: 3 })}
          onNext={goVacancyPreview}
        />
      )}

      {route.screen === "vacancyPreview" && vacancyDraft && (
        <VacancyPreview
          vacancy={vacancyDraft}
          onBack={goVacancyTemplates}
          onSave={() => {
            commitVacancyDraft(vacancyDraft);
            goVacancyList();
          }}
          onSendToModeration={() => sendVacancyToModeration(vacancyDraft)}
        />
      )}

      {route.screen === "browseVacancies" && (
        <VacancyBrowse
          vacancies={publicVacancies}
          loading={loadingPublicVacancies}
          onBack={goHome}
          onOpen={openVacancyDetail}
        />
      )}

      {route.screen === "vacancyDetail" && openVacancy && (
        <VacancyDetail
          vacancy={openVacancy}
          applied={appliedVacancyIds.has(openVacancy.id)}
          resumes={resumes}
          onBack={() => setRoute({ screen: "browseVacancies" })}
          onApply={applyToVacancy}
        />
      )}

      {route.screen === "vacancyApplicants" && applicantsVacancy && (
        <VacancyApplicants
          vacancy={applicantsVacancy}
          applicants={applicants}
          loading={loadingApplicants}
          onBack={goVacancyList}
        />
      )}

      {route.screen === "admin" && isUserAdmin && (
        <AdminPanel onBack={goHome} adminId={identity.id} />
      )}
    </div>
  );
}
