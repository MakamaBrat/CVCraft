import { useEffect, useRef, useState } from "react";
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
import VacancyMyApplications from "./screens/VacancyMyApplications.jsx";
import AdminPanel from "./screens/AdminPanel.jsx";
import BlockedUsers from "./screens/BlockedUsers.jsx";
import TelegramGate from "./components/TelegramGate.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
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
  birthDate: "",
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
  // РАНІШЕ тут ще був фолбек на #/r/<id> — це дозволяло відкрити застосунок
  // (і навіть чужий шеринг резюме/вакансії) прямим посиланням у звичайному
  // браузері, без Telegram взагалі. Застосунок тепер відкривається ТІЛЬКИ
  // всередині Telegram, тому єдине законне джерело sharedId — start_param,
  // який Telegram підставляє сам після ?startapp=... у диплінку бота.
  //
  // "ap_<id>" — окремий випадок: це не публічний шеринг (як "v_"/резюме),
  // а диплінк із повідомлення бота "новий відгук на вашу вакансію" —
  // веде власника вакансії одразу на екран VacancyApplicants усередині
  // звичайного (авторизованого) застосунку, а не на публічний SharedView.
  // Тому тут його НЕ повертаємо як sharedId.
  const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (tgStartParam && !tgStartParam.startsWith("ap_")) return tgStartParam;
  return null;
}

function parsePendingApplicantsId() {
  const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (tgStartParam && tgStartParam.startsWith("ap_")) return tgStartParam.slice(3);
  return null;
}

export default function App() {
  const [sharedId, setSharedId] = useState(() => parseHashRoute());
  // id вакансії з диплінку "новий відгук" (?startapp=ap_<id>) — обробляється
  // окремо від sharedId, див. коментар у parsePendingApplicantsId().
  const [pendingApplicantsId, setPendingApplicantsId] = useState(() => parsePendingApplicantsId());
  const [identity, setIdentity] = useState(loadIdentity);
  const [checkedTelegram, setCheckedTelegram] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [route, setRoute] = useState({ screen: "home" });
  const [draft, setDraft] = useState(null);
  // Таймер дебаунсу та "знімок" останнього вже збереженого вмісту чернетки
  // (без id/updatedAt/status) — щоб не робити зайвих POST-запитів, коли
  // draft змінюється сам собою після commitDraft (там оновлюється лише
  // updatedAt).
  const draftSaveTimer = useRef(null);
  const lastSavedDraftRef = useRef(null);

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

  const loadVacancies = async () => {
    if (!backendEnabled) {
      setLoadingVacancies(false);
      return;
    }
    setLoadingVacancies(true);
    try {
      const res = await apiFetch("/api/vacancies");
      setVacancies((res?.vacancies || []).map(vacancyFromRow));
    } catch {
      // ignore
    }
    setLoadingVacancies(false);
  };

  useEffect(() => {
    if (sharedId || !identity) {
      setLoadingVacancies(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!backendEnabled) {
        setLoadingVacancies(false);
        return;
      }
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

  // Підтягуємо список вакансій, куди юзер вже відгукнувся, при старті —
  // інакше appliedVacancyIds завжди порожній після рестарту і форму
  // відгуку можна відправити повторно. Потребує бекенд-ендпоінта
  // /api/my-applications у форматі { applications: [{ vacancy: { id } }] }.
  useEffect(() => {
    if (!identity || !backendEnabled) return;
    let cancelled = false;
    apiFetch("/api/my-applications")
      .then((res) => {
        if (cancelled) return;
        const ids = new Set((res?.applications || []).map((a) => a.vacancy?.id).filter(Boolean));
        setAppliedVacancyIds(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [identity]);

  // Автозбереження чернетки резюме просто в процесі заповнення: як тільки
  // з'явився хоч якийсь вміст (навіть на першому кроці візарда) — за ~800мс
  // тиші після останнього натискання клавіші чернетка йде на бекенд зі
  // статусом "draft". Порівняння зі знімком lastSavedDraftRef захищає від
  // зайвих POST-запитів, коли draft оновлюється сам собою після commitDraft
  // (там міняється лише updatedAt).
  //
  // ВАЖЛИВО: цей ефект має бути оголошений ДО ранніх return нижче
  // (sharedId / !checkedTelegram / !identity) — інакше кількість хуків, що
  // викликаються за рендер, буде відрізнятись залежно від цих умов, що
  // порушує Rules of Hooks і призводить до краху React ("Rendered fewer
  // hooks than expected") — саме це й спричиняло чорний екран.
  useEffect(() => {
    if (route.screen !== "wizard" || !draft) return;
    if (!isResumeDirty(draft)) return;

    const { id, updatedAt, status, ...content } = draft;
    const snapshot = JSON.stringify(content);
    if (snapshot === lastSavedDraftRef.current) return;

    draftSaveTimer.current = setTimeout(() => {
      lastSavedDraftRef.current = snapshot;
      commitDraft({ ...draft, status: draft.status === "complete" ? "complete" : "draft" });
    }, 800);

    return () => clearTimeout(draftSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, route.screen]);

  // Диплінк "новий відгук" (?startapp=ap_<vacancyId>) із повідомлення бота:
  // щойно власні вакансії підвантажились і серед них знайшлась потрібна —
  // одразу відкриваємо для неї екран відгуків, як за звичайним натисканням
  // "Відгуки" у VacancyList. Спрацьовує один раз (pendingApplicantsId
  // скидається одразу після переходу), щоб не заважати подальшій навігації
  // всередині застосунку.
  useEffect(() => {
    if (!pendingApplicantsId || !identity || loadingVacancies) return;
    const v = vacancies.find((x) => x.id === pendingApplicantsId);
    if (!v) {
      // Вакансію могли видалити, або власні вакансії ще не встигли
      // повністю завантажитись асинхронно — просто не переходимо нікуди
      // і не блокуємо звичайне використання застосунку.
      setPendingApplicantsId(null);
      return;
    }
    setPendingApplicantsId(null);
    setApplicantsVacancy(v);
    setRoute({ screen: "vacancyApplicants" });
    if (!backendEnabled) {
      setApplicants([]);
      return;
    }
    setLoadingApplicants(true);
    apiFetch(`/api/vacancy-applicants?vacancyId=${encodeURIComponent(v.id)}`)
      .then((res) => setApplicants(res?.applicants || []))
      .catch(() => setApplicants([]))
      .finally(() => setLoadingApplicants(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingApplicantsId, identity, loadingVacancies, vacancies]);

  if (sharedId) {
    const isVacancyShare = sharedId.startsWith("v_");
    const closeShared = () => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setSharedId(null);
    };
    // Локальні версії переходів "Дивитись вакансії" / "Створити вакансію" —
    // навмисно НЕ викликаємо goBrowseVacancies/startNewVacancy (оголошені
    // нижче через const), бо цей блок повертається раніше за їх оголошення
    // і посилання на них тут кинуло б ReferenceError (temporal dead zone).
    // setRoute/setVacancyDraft — це сеттери useState, а loadPublicVacancies
    // та emptyVacancy оголошені/імпортовані вище — їх можна викликати тут.
    const goBrowseFromShare = () => {
      closeShared();
      setRoute({ screen: "home" });
    };
    const goCreateFromShare = () => {
      closeShared();
      setRoute({ screen: "home" });
    };
    return (
      <div className="phone-shell">
        {isVacancyShare ? (
          <SharedVacancyView
            vacancyId={sharedId.slice(2)}
            onOpenApp={closeShared}
            onApply={(v) => {
              closeShared();
              setOpenVacancy(v);
              setRoute({ screen: "vacancyDetail", back: "browseVacancies" });
            }}
            onBrowseVacancies={goBrowseFromShare}
            onCreateVacancy={goCreateFromShare}
          />
        ) : (
          <SharedView
            resumeId={sharedId}
            onOpenApp={closeShared}
            onBrowseVacancies={goBrowseFromShare}
            onCreateVacancy={goCreateFromShare}
          />
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
        <TelegramGate />
      </div>
    );
  }

  const canCreateMore = resumes.length < MAX_RESUMES_PER_USER;

  const startNew = () => {
    if (!canCreateMore) return;
    const r = emptyResume();
    lastSavedDraftRef.current = null;
    setDraft(r);
    setRoute({ screen: "wizard", step: 0 });
  };

  const editExisting = (id) => {
    const r = resumes.find((x) => x.id === id);
    if (r) {
      const { id: rid, updatedAt, status, ...content } = r;
      lastSavedDraftRef.current = JSON.stringify(content);
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

  // Чи введено в чернетку резюме хоч щось — використовується і для
  // автозбереження, і щоб не створювати порожні чернетки при випадковому
  // вході у візард без жодного натискання клавіш.
  const isResumeDirty = (r) =>
    Boolean(
      r?.fullName?.trim() ||
        r?.role?.trim() ||
        r?.email?.trim() ||
        r?.phone?.trim() ||
        r?.city?.trim() ||
        r?.summary?.trim() ||
        (r?.experience || []).length > 0 ||
        (r?.education || []).length > 0 ||
        (r?.skills || []).length > 0 ||
        (r?.portfolio || []).length > 0
    );

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

  // Негайно зберігає поточну чернетку (якщо в ній щось нове відносно
  // останнього збереження), скасувавши будь-який запланований дебаунс.
  const flushDraftSave = async () => {
    if (!draft || !isResumeDirty(draft)) return;
    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
    const { id, updatedAt, status, ...content } = draft;
    const snapshot = JSON.stringify(content);
    if (snapshot === lastSavedDraftRef.current) return;
    lastSavedDraftRef.current = snapshot;
    await commitDraft({ ...draft, status: draft.status === "complete" ? "complete" : "draft" });
  };

  // Вихід із візарда резюме (кнопка "додому" або back на першому кроці) —
  // просто "домиває" будь-яке ще не збережене автозбереженням значення.
  const exitWizard = async () => {
    await flushDraftSave();
    goHome();
  };

  const deleteResume = async (id) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (backendEnabled) {
      await apiFetch(`/api/resumes?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  };

  // Адмінам ліміт вакансій не показуємо і не застосовуємо на клієнті —
  // бекенд (api/vacancies.js) теж пропускає перевірку для isAdminId().
  const canCreateMoreVacancies = isUserAdmin || vacancies.length < MAX_VACANCIES_PER_USER;

  const goVacancyList = () => setRoute({ screen: "vacancies" });
  const goVacancyTemplates = () => setRoute({ screen: "vacancyTemplates" });
  const goVacancyPreview = () => setRoute({ screen: "vacancyPreview" });
  const goAdmin = () => setRoute({ screen: "admin" });

  const goBlockedUsers = () => setRoute({ screen: "blockedUsers" });
  const goBrowseVacancies = () => {
    loadPublicVacancies();
    setRoute({ screen: "browseVacancies" });
  };
  const goMyApplications = () => setRoute({ screen: "myApplications" });

  // Відкриття вакансії зі списку "Мої відгуки" — дані вакансії беремо
  // напряму з рядка заявки (бекенд віддає їх embedded), бо вакансія вже
  // могла зникнути з publicVacancies (напр. заповнена/на паузі).
  const openAppliedVacancy = (v) => {
    if (!v) return;
    setOpenVacancy(v);
    setAppliedVacancyIds((prev) => new Set(prev).add(v.id));
    setRoute({ screen: "vacancyDetail", back: "myApplications" });
  };

  const startNewVacancy = () => {
    if (!canCreateMoreVacancies) return;
    setVacancyDraft(emptyVacancy());
    setRoute({ screen: "vacancyWizard", step: 0 });
  };

  const editVacancy = (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (!v) return;
    setVacancyDraft(v);
    setRoute({ screen: "vacancyWizard", step: 0 });
  };

  const payVacancy = (id) => {
    const v = vacancies.find((x) => x.id === id);
    if (v) {
      setVacancyDraft(v);
      setRoute({ screen: "vacancyPreview", back: "vacancies" });
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
    const previous = vacancies.find((v) => v.id === updated.id) || null;
    const isNew = !previous;

    if (isNew && !isUserAdmin && vacancies.length >= MAX_VACANCIES_PER_USER) {
      goVacancyList();
      return;
    }

    // Якщо вакансія на момент старту редагування вже була публічною
    // (approved/active/paused) — щойно приходить ПЕРША ж зміна (навіть ще
    // на кроці "Шаблони", задовго до фінального "Зберегти" в Preview),
    // одразу знімаємо її з публіки й повертаємо на модерацію. Раніше цей
    // перехід статусу відбувався лише в saveVacancyEdit (фінальне
    // "Зберегти"), а всі проміжні автозбереження встигали піти в live-запис
    // ще до модерації — вакансія виглядала так, ніби зміни вже застосувались
    // без жодної повторної перевірки.
    const wasLive =
      previous && [VACANCY_STATUS.APPROVED, VACANCY_STATUS.ACTIVE, VACANCY_STATUS.PAUSED].includes(previous.status);

    const next = {
      ...updated,
      updatedAt: Date.now(),
      ...(wasLive ? { status: VACANCY_STATUS.PENDING_REVIEW, rejectReason: null } : {}),
    };

    setVacancyDraft(next);
    setVacancies((prev) => {
      const exists = prev.some((v) => v.id === next.id);
      return exists ? prev.map((v) => (v.id === next.id ? next : v)) : [next, ...prev];
    });

    if (backendEnabled) {
      const { id, updatedAt, status, rejectReason, expiresAt, topUntil, isPaid, listingPrice, topPrice, template, ...data } = next;
      try {
        await apiFetch("/api/vacancies", {
          method: "POST",
          body: { id, data, template, ...(wasLive ? { status: VACANCY_STATUS.PENDING_REVIEW } : {}) },
        });
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
        return previous;
      }
    }
    return next;
  };

  // Фінальне збереження зі "Перегляду вакансії" (кнопка "Зберегти").
  // Перехід на pending_review тепер відбувається вже всередині
  // commitVacancyDraft (з першої ж зміни), тому тут просто довіряємо
  // тому, що вона повертає, і йдемо додому.
  const saveVacancyEdit = async (vacancy) => {
    await commitVacancyDraft(vacancy);
    goVacancyList();
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
    if (!openVacancy) return false;
    if (!backendEnabled) {
      setAppliedVacancyIds((prev) => new Set(prev).add(openVacancy.id));
      return true;
    }
    try {
      await apiFetch("/api/vacancy-apply", {
        method: "POST",
        body: { vacancyId: openVacancy.id, message: message || null, resumeId: resumeId || null },
      });
      setAppliedVacancyIds((prev) => new Set(prev).add(openVacancy.id));
      return true;
    } catch (err) {
      if (err?.payload?.error === "already_applied") {
        // Вже відгукувались раніше (напр. в іншій сесії) — не помилка для
        // користувача, просто синхронізуємо локальний стан.
        setAppliedVacancyIds((prev) => new Set(prev).add(openVacancy.id));
        return true;
      }
      console.error("vacancy apply failed:", err.status, err.payload || err.message);
      const reason =
        err?.payload?.error === "resume_required"
          ? t("vacancy.resumeRequiredNotice")
          : err?.payload?.error === "application_limit_reached"
          ? t("vacancy.applicationLimitReached")
          : t("vacancy.applyFailed");
      await alertDialog(reason);
      return false;
    }
  };

  // Забрати раніше відправлений відгук. Викликається і з деталей вакансії
  // (кандидат ще бачить картку), і зі списку "Мої відгуки" — в обох
  // випадках достатньо vacancyId, бо на вакансію в юзера лише одна заявка.
  const withdrawFromVacancy = async (vacancyId) => {
    if (!vacancyId) return false;
    if (!backendEnabled) {
      setAppliedVacancyIds((prev) => {
        const next = new Set(prev);
        next.delete(vacancyId);
        return next;
      });
      return true;
    }
    try {
      await apiFetch("/api/vacancy-withdraw", { method: "POST", body: { vacancyId } });
      setAppliedVacancyIds((prev) => {
        const next = new Set(prev);
        next.delete(vacancyId);
        return next;
      });
      return true;
    } catch (err) {
      if (err?.payload?.error === "not_found") {
        // Вже забрано раніше (напр. в іншій сесії) — просто синхронізуємо стан.
        setAppliedVacancyIds((prev) => {
          const next = new Set(prev);
          next.delete(vacancyId);
          return next;
        });
        return true;
      }
      console.error("vacancy withdraw failed:", err.status, err.payload || err.message);
      await alertDialog(t("vacancy.withdrawFailed"));
      return false;
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
          onOpenMyApplications={goMyApplications}
          onOpenAdmin={goAdmin}
          onOpenBlockedUsers={goBlockedUsers}
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
          onSendToModeration={sendVacancyToModeration}
          canCreateMore={canCreateMoreVacancies}
          maxVacancies={isUserAdmin ? "∞" : MAX_VACANCIES_PER_USER}
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
          onSave={() => saveVacancyEdit(vacancyDraft)}
          onSendToModeration={() => sendVacancyToModeration(vacancyDraft)}
          onClose={goVacancyList}
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
          onBack={() =>
            setRoute({ screen: route.back === "myApplications" ? "myApplications" : "browseVacancies" })
          }
          onApply={applyToVacancy}
          onWithdraw={withdrawFromVacancy}
        />
      )}

      {route.screen === "myApplications" && (
        <VacancyMyApplications onBack={goHome} onOpen={openAppliedVacancy} onWithdraw={withdrawFromVacancy} />
      )}

      {route.screen === "vacancyApplicants" && applicantsVacancy && (
        <VacancyApplicants
          vacancy={applicantsVacancy}
          applicants={applicants}
          loading={loadingApplicants}
          onBack={goVacancyList}
        />
      )}

      {route.screen === "blockedUsers" && <BlockedUsers onBack={goHome} />}

      {route.screen === "admin" && isUserAdmin && (
        <AdminPanel
          onBack={() => {
            // Адмінка тримає власний окремий стан (approve/reject оновлюють
            // тільки його) — тому "Мої вакансії" тут же лишались зі старим
            // статусом, поки не перезапустиш застосунок. Тож при виході з
            // адмінки тихо (без спінера на цьому екрані) підвантажуємо
            // актуальний список вакансій, щоб він був свіжим, коли людина
            // відкриє "Мої вакансії".
            loadVacancies();
            goHome();
          }}
          adminId={identity.id}
        />
      )}

      <ConfirmModal />
    </div>
  );
}
