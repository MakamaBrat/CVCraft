import { useEffect, useState } from "react";
import Home from "./screens/Home.jsx";
import Wizard from "./screens/Wizard.jsx";
import Templates from "./screens/Templates.jsx";
import Preview from "./screens/Preview.jsx";
import SharedView from "./screens/SharedView.jsx";
import SharedVacancyView from "./screens/SharedVacancyView.jsx";
import VacancyWizard from "./screens/VacancyWizard.jsx";
import VacancyTemplates from "./screens/VacancyTemplates.jsx";
import VacancyPreview from "./screens/VacancyPreview.jsx";
import VacancyList from "./screens/VacancyList.jsx";
import VacancyBrowse from "./screens/VacancyBrowse.jsx";
import VacancyDetail from "./screens/VacancyDetail.jsx";
import VacancyApplicants from "./screens/VacancyApplicants.jsx";
import AdminPanel from "./screens/AdminPanel.jsx";
import TelegramGate from "./components/TelegramGate.jsx";
import { apiFetch, backendEnabled } from "./lib/api.js";
import { getTelegramUser, initTelegramApp, alertDialog } from "./lib/telegram.js";
import { MAX_RESUMES_PER_USER, MAX_VACANCIES_PER_USER } from "./lib/config.js";
import { emptyVacancy, vacancyFromRow, VACANCY_STATUS } from "./lib/vacancy.js";
import { useLanguage } from "./lib/i18n/index.jsx";

const IDENTITY_KEY = "cvcraft.identity.v1";
const LOCAL_RESUMES_KEY = "cvcraft.resumes.v1";

const emptyResume = () => ({
  id: crypto.randomUUID(),
  updatedAt: Date.now(),
  status: "draft",
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
  colorScheme: "dark",
  backgroundUrl: "",
  avatarUrl: "",
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
  const m = hash.match(/^#\/r\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (tgStartParam) return tgStartParam;
  return null;
}

export default function App() {
  const [sharedId, setSharedId] = useState(() => parseHashRoute());
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
  const [isUserAdmin, setIsUserAdmin] = useState(false);

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
    if (!identity || !backendEnabled) return;
    apiFetch("/api/auth-sync", { method: "POST", body: { languageCode: lang } })
      .then((res) => setIsUserAdmin(Boolean(res?.isAdmin)))
      .catch((err) => console.error("auth-sync failed:", err.status, err.payload || err.message));
  }, [identity, lang]);

  // Оновлюємо last_active_at періодично, поки застосунок відкритий,
  // щоб адмінська статистика "активних сьогодні" була точною.
  useEffect(() => {
    if (!identity || !backendEnabled) return;
    const interval = setInterval(() => {
      apiFetch("/api/auth-sync", { method: "POST", body: { languageCode: lang } }).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [identity, lang]);

  useEffect(() => {
    if (sharedId || !identity) return;
    let cancelled = false;

    async function load() {
      setLoadingResumes(true);
      if (backendEnabled) {
        try {
          const res = await apiFetch("/api/resumes");
          if (!cancelled) {
            setResumes(
              (res?.resumes || []).map((row) => ({
                ...row.data,
                id: row.id,
                updatedAt: new Date(row.updated_at).getTime(),
              }))
            );
          }
        } catch {
          // ignore, keep whatever was already in state
        }
        if (!cancelled) setLoadingResumes(false);
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
    if (!backendEnabled && identity) {
      localStorage.setItem(LOCAL_RESUMES_KEY, JSON.stringify(resumes));
    }
  }, [resumes, identity]);

  useEffect(() => {
    if (sharedId || !identity || !backendEnabled) {
      setLoadingVacancies(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingVacancies(true);
      try {
        const res = await apiFetch("/api/vacancies");
        if (!cancelled) setVacancies((res?.vacancies || []).map(vacancyFromRow));
      } catch {
        // ignore
      }
      if (!cancelled) setLoadingVacancies(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, sharedId]);

  const loadPublicVacancies = async () => {
    if (!backendEnabled) {
      setLoadingPublicVacancies(false);
      return;
    }
    setLoadingPublicVacancies(true);
    try {
      const res = await apiFetch("/api/vacancies?scope=public");
      setPublicVacancies((res?.vacancies || []).map(vacancyFromRow));
    } catch {
      // ignore
    }
    setLoadingPublicVacancies(false);
  };

  if (sharedId) {
    const isVacancyShare = sharedId.startsWith("v_");
    const closeShared = () => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setSharedId(null);
    };
    return (
      <div className="phone-shell">
        {isVacancyShare ? (
          <SharedVacancyView vacancyId={sharedId.slice(2)} onOpenApp={closeShared} />
        ) : (
          <SharedView resumeId={sharedId} onOpenApp={closeShared} />
        )}
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

  const viewExisting = (id) => {
    const r = resumes.find((x) => x.id === id);
    if (r) {
      setDraft(r);
      setRoute({ screen: "preview", back: "home" });
    }
  };

  const goTemplates = () => setRoute({ screen: "templates" });
  const goPreview = () => setRoute({ screen: "preview" });
  const goHome = () => setRoute({ screen: "home" });

  const commitDraft = async (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    const previous = resumes.find((r) => r.id === next.id) || null;
    const isNew = !previous;

    if (isNew && resumes.length >= MAX_RESUMES_PER_USER) {
      goHome();
      return;
    }

    setDraft(next);
    setResumes((prev) => {
      const exists = prev.some((r) => r.id === next.id);
      return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [next, ...prev];
    });

    if (backendEnabled) {
      const { id, updatedAt, ...data } = next;
      try {
        await apiFetch("/api/resumes", { method: "POST", body: { id, data } });
      } catch (err) {
        console.error("resume save failed:", err.status, err.payload || err.message);
        setResumes((prev) =>
          previous ? prev.map((r) => (r.id === id ? previous : r)) : prev.filter((r) => r.id !== id)
        );
        if (previous) setDraft(previous);
        await alertDialog(t("home.saveFailed"));
      }
    }
  };

  // Вихід із візарда резюме (кнопка "додому" або back на першому кроці).
  // Якщо в чернетці є хоч щось введене — зберігаємо її як недописану
  // (status: "draft"), щоб не втратити прогрес; якщо резюме вже раніше
  // було завершене (status: "complete"), статус не чіпаємо — це просто
  // вихід із редагування, а не переривання нового заповнення.
  const exitWizard = async (isDirty) => {
    if (draft && isDirty) {
      await commitDraft({ ...draft, status: draft.status === "complete" ? "complete" : "draft" });
    }
    goHome();
  };

  const deleteResume = async (id) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (backendEnabled) {
      await apiFetch(`/api/resumes?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  };

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

  const editVacancy = async (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (!v) return;
    if (![VACANCY_STATUS.DRAFT, VACANCY_STATUS.REJECTED].includes(v.status)) {
      await alertDialog(t("vacancy.editLocked"));
      return;
    }
    setVacancyDraft(v);
    setRoute({ screen: "vacancyWizard", step: 0 });
  };

  const payVacancy = (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (v) {
      setVacancyDraft(v);
      setRoute({ screen: "vacancyPreview" });
    }
  };

  const viewVacancy = (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (v) {
      setVacancyDraft(v);
      setRoute({ screen: "vacancyPreview", back: "vacancies" });
    }
  };

  const commitVacancyDraft = async (updated) => {
    const next = { ...updated, updatedAt: Date.now() };
    const previous = vacancies.find((v) => v.id === next.id) || null;
    const isNew = !previous;

    if (isNew && vacancies.length >= MAX_VACANCIES_PER_USER) {
      goVacancyList();
      return;
    }

    setVacancyDraft(next);
    setVacancies((prev) => {
      const exists = prev.some((v) => v.id === next.id);
      return exists ? prev.map((v) => (v.id === next.id ? next : v)) : [next, ...prev];
    });

    if (backendEnabled) {
      const { id, updatedAt, status, rejectReason, expiresAt, topUntil, isPaid, listingPrice, topPrice, template, ...data } = next;
      try {
        await apiFetch("/api/vacancies", { method: "POST", body: { id, data, template } });
      } catch (err) {
        console.error("vacancy save failed:", err.status, err.payload || err.message);
        // Відкат: повертаємо попередню версію вакансії (якщо вона вже існувала)
        // замість того, щоб видаляти її з локального списку — інакше невдалий
        // запит (напр. вакансію вже не можна редагувати після модерації)
        // виглядає для користувача так, ніби вакансія просто зникла.
        setVacancies((prev) =>
          previous ? prev.map((v) => (v.id === id ? previous : v)) : prev.filter((v) => v.id !== id)
        );
        if (previous) setVacancyDraft(previous);
        const reason = err?.payload?.error === "not_editable" ? t("vacancy.editLocked") : t("vacancy.saveFailed");
        await alertDialog(reason);
      }
    }
  };

  const deleteVacancy = async (id) => {
    setVacancies((prev) => prev.filter((v) => v.id !== id));
    if (backendEnabled) {
      await apiFetch(`/api/vacancies?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const sendVacancyToModeration = async (vacancy) => {
    const next = { ...vacancy, status: VACANCY_STATUS.PENDING_REVIEW, rejectReason: null };
    setVacancyDraft(next);
    setVacancies((prev) => prev.map((v) => (v.id === next.id ? next : v)));
    if (backendEnabled) {
      await apiFetch("/api/vacancies", { method: "POST", body: { action: "submit", id: vacancy.id } }).catch(() => {});
    }
    goVacancyList();
  };

  const openVacancyDetail = async (id) => {
    const v = publicVacancies.find((x) => x.id === id);
    if (!v) return;
    setOpenVacancy(v);
    setRoute({ screen: "vacancyDetail" });
    if (backendEnabled) {
      apiFetch("/api/vacancy-view", { method: "POST", body: { id } }).catch(() => {});
    }
  };

  const applyToVacancy = async (message, resumeId) => {
    if (!openVacancy) return;
    setAppliedVacancyIds((prev) => new Set(prev).add(openVacancy.id));
    if (backendEnabled) {
      await apiFetch("/api/vacancy-apply", {
        method: "POST",
        body: { vacancyId: openVacancy.id, message: message || null, resumeId: resumeId || null },
      }).catch(() => {});
    }
  };

  const goApplicants = async (vacancyId) => {
    const v = vacancies.find((x) => x.id === vacancyId);
    if (!v) return;
    setApplicantsVacancy(v);
    setRoute({ screen: "vacancyApplicants" });
    if (!backendEnabled) {
      setApplicants([]);
      return;
    }
    setLoadingApplicants(true);
    try {
      const res = await apiFetch(`/api/vacancy-applicants?vacancyId=${encodeURIComponent(vacancyId)}`);
      setApplicants(res?.applicants || []);
    } catch {
      setApplicants([]);
    }
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
          onView={viewExisting}
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
          onBackHome={exitWizard}
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
          onBack={route.back === "home" ? goHome : goTemplates}
          onDone={() => {
            commitDraft({ ...draft, status: "complete" });
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
          onView={viewVacancy}
          onDelete={deleteVacancy}
          onOpenApplicants={goApplicants}
          onPay={payVacancy}
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
          onBackHome={goHome}
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
          onBack={route.back === "vacancies" ? goVacancyList : goVacancyTemplates}
          onSave={() => {
            commitVacancyDraft(vacancyDraft);
            goVacancyList();
          }}
          onSendToModeration={() => sendVacancyToModeration(vacancyDraft)}
          onPaid={async (id) => {
            if (!backendEnabled) return;
            try {
              const res = await apiFetch("/api/vacancies");
              const fresh = (res?.vacancies || []).map(vacancyFromRow);
              setVacancies(fresh);
              const updated = fresh.find((v) => v.id === id);
              if (updated) setVacancyDraft(updated);
            } catch (err) {
              console.error("failed to refresh vacancy after payment:", err.status, err.payload || err.message);
            }
          }}
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
