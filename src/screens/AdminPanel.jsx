import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { vacancyFromRow, VACANCY_STATUS } from "../lib/vacancy.js";
import { VacancyDocument } from "./VacancyPreview.jsx";
import { confirmDialog } from "../lib/telegram.js";

const TABS = ["stats", "moderation", "vacancies", "reports", "applications", "users", "pricing"];

const STATUS_COLOR = {
  [VACANCY_STATUS.DRAFT]: "text-white/45",
  [VACANCY_STATUS.PENDING_REVIEW]: "text-amber-400",
  [VACANCY_STATUS.APPROVED]: "text-sky-400",
  [VACANCY_STATUS.REJECTED]: "text-red-400",
  [VACANCY_STATUS.ACTIVE]: "text-emerald-400",
  [VACANCY_STATUS.PAUSED]: "text-white/45",
};

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

// ---------- Reusable bits ----------

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-base-850 border border-base-700 rounded-xl p-4">
      <p className={`text-2xl font-bold ${accent || ""}`}>{value ?? 0}</p>
      <p className="text-xs text-white/50 mt-1">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-base-800 last:border-b-0">
      <span className="text-xs text-white/45 shrink-0">{label}</span>
      <span className="text-xs text-white/85 text-right break-all">{String(value)}</span>
    </div>
  );
}

// Bottom-sheet wrapper used everywhere in this file for consistency.
function Sheet({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? "max-w-[480px]" : "max-w-[420px]"} max-h-[88vh] flex flex-col bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up`}
      >
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4 shrink-0" />
        {children}
      </div>
    </div>
  );
}

export default function AdminPanel({ onBack, adminId }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [allVacancies, setAllVacancies] = useState([]);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewVacancy, setPreviewVacancy] = useState(null);
  const [previewMode, setPreviewMode] = useState(null); // "moderation" | "view"
  const [pricing, setPricing] = useState(null);
  const [pricingForm, setPricingForm] = useState({ listingPrice: "", topPrice: "" });
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [vacancySearch, setVacancySearch] = useState("");
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [activeUser, setActiveUser] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, moderationRes, applicationsRes, usersRes, pricingRes, reportsRes, vacanciesRes] =
        await Promise.all([
          apiFetch("/api/admin?action=stats"),
          apiFetch("/api/admin?action=moderation"),
          apiFetch("/api/admin?action=applications"),
          apiFetch("/api/admin?action=users"),
          apiFetch("/api/admin?action=pricing"),
          apiFetch("/api/admin?action=reports&status=open"),
          // NEW: backend action expected to return { vacancies: [...] } — every vacancy
          // row (any status), enough fields to search/filter/delete/preview them here.
          apiFetch("/api/admin?action=allVacancies").catch(() => ({ vacancies: [] })),
        ]);
      setStats(statsRes);
      setPending((moderationRes?.vacancies || []).map(vacancyFromRow));
      setApplications(applicationsRes?.applications || []);
      setUsers(usersRes?.users || []);
      setPricing(pricingRes);
      setReports(reportsRes?.reports || []);
      setAllVacancies((vacanciesRes?.vacancies || []).map((row) => ({ row, v: vacancyFromRow(row) })));
      setPricingForm({
        listingPrice: String(pricingRes?.listingPrice ?? ""),
        topPrice: String(pricingRes?.topPrice ?? ""),
      });
    } catch {
      // сервер сам відхилить не-адмінів (403) — тут просто лишаємо порожній стан
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const [actionError, setActionError] = useState(null);

  const approve = async (id) => {
    setActionError(null);
    try {
      await apiFetch("/api/admin", { method: "POST", body: { action: "moderate", id, decision: "approve" } });
      setPending((prev) => prev.filter((v) => v.id !== id));
      setAllVacancies((prev) =>
        prev.map((x) => (x.v.id === id ? { ...x, v: { ...x.v, status: VACANCY_STATUS.APPROVED } } : x))
      );
    } catch (err) {
      setActionError(`Помилка модерації: ${err?.payload?.error || err.message}`);
    }
  };

  const reject = async (id) => {
    setActionError(null);
    try {
      await apiFetch("/api/admin", {
        method: "POST",
        body: { action: "moderate", id, decision: "reject", rejectReason: rejectReason || null },
      });
      setPending((prev) => prev.filter((v) => v.id !== id));
      setAllVacancies((prev) =>
        prev.map((x) => (x.v.id === id ? { ...x, v: { ...x.v, status: VACANCY_STATUS.REJECTED } } : x))
      );
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      setActionError(`Помилка модерації: ${err?.payload?.error || err.message}`);
    }
  };

  const deleteVacancy = async (id) => {
    if (!(await confirmDialog(t("common.confirmDeleteVacancy") || "Видалити цю вакансію назавжди?"))) return;
    setActionError(null);
    setDeletingId(id);
    try {
      // NEW: backend action expected — hard/soft-deletes the vacancy row.
      await apiFetch("/api/admin", { method: "POST", body: { action: "deleteVacancy", id } });
      setAllVacancies((prev) => prev.filter((x) => x.v.id !== id));
      setPending((prev) => prev.filter((v) => v.id !== id));
      setPreviewVacancy(null);
    } catch (err) {
      setActionError(`Помилка видалення: ${err?.payload?.error || err.message}`);
    }
    setDeletingId(null);
  };

  const toggleBan = async (u) => {
    setActionError(null);
    const nextBanned = !u.is_banned;
    try {
      await apiFetch("/api/admin", { method: "POST", body: { action: "ban", telegramId: u.telegram_id, banned: nextBanned } });
      setUsers((prev) => prev.map((x) => (x.telegram_id === u.telegram_id ? { ...x, is_banned: nextBanned } : x)));
      setActiveUser((prev) => (prev && prev.telegram_id === u.telegram_id ? { ...prev, is_banned: nextBanned } : prev));
    } catch (err) {
      setActionError(`Помилка: ${err?.payload?.error || err.message}`);
    }
  };

  const resolveReport = async (id, decision, banTarget = false) => {
    setActionError(null);
    setResolvingReportId(id);
    try {
      await apiFetch("/api/admin", { method: "POST", body: { action: "resolveReport", id, decision, banTarget } });
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (banTarget) {
        setUsers((prev) => {
          const report = reports.find((r) => r.id === id);
          const targetId = report?.target?.telegram_id;
          return targetId ? prev.map((u) => (u.telegram_id === targetId ? { ...u, is_banned: true } : u)) : prev;
        });
      }
    } catch (err) {
      setActionError(`Помилка обробки скарги: ${err?.payload?.error || err.message}`);
    }
    setResolvingReportId(null);
  };

  const savePricing = async () => {
    setActionError(null);
    setPricingSaved(false);
    const listing = Number(pricingForm.listingPrice);
    const top = Number(pricingForm.topPrice);
    if (!Number.isInteger(listing) || listing < 0 || !Number.isInteger(top) || top < 0) {
      setActionError("Ціни мають бути цілими невід'ємними числами.");
      return;
    }
    setSavingPricing(true);
    try {
      const res = await apiFetch("/api/admin", {
        method: "POST",
        body: { action: "setPricing", listingPrice: listing, topPrice: top },
      });
      setPricing({ listingPrice: res.listingPrice, topPrice: res.topPrice });
      setPricingSaved(true);
    } catch (err) {
      setActionError(`Помилка збереження цін: ${err?.payload?.error || err.message}`);
    }
    setSavingPricing(false);
  };

  // ---------- Derived data ----------

  const vacancyStatusCounts = useMemo(() => {
    const counts = {};
    allVacancies.forEach(({ v }) => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    return counts;
  }, [allVacancies]);

  const filteredVacancies = useMemo(() => {
    const q = vacancySearch.trim().toLowerCase();
    return allVacancies.filter(({ v, row }) => {
      const matchesStatus = vacancyStatusFilter === "all" || v.status === vacancyStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = [
        v.position,
        v.company,
        v.city,
        v.description,
        v.requirements,
        v.salary,
        v.contact,
        row?.telegram_id,
        row?.telegram_username,
        ...(v.tags || []),
      ]
        .filter(Boolean)
        .join(" \n ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allVacancies, vacancySearch, vacancyStatusFilter]);

  // vacancies/applications belonging to whichever user is open in the detail sheet
  const activeUserVacancies = useMemo(() => {
    if (!activeUser) return [];
    return allVacancies.filter(({ row }) => String(row?.telegram_id) === String(activeUser.telegram_id));
  }, [activeUser, allVacancies]);

  const activeUserApplications = useMemo(() => {
    if (!activeUser) return [];
    return applications.filter((a) => String(a.telegram_id) === String(activeUser.telegram_id));
  }, [activeUser, applications]);

  const filteredUsers = useMemo(() => users, [users]);

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{t("admin.title")}</h1>
      </div>

      <div className="px-6 pb-3 flex gap-2 overflow-x-auto">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`tap shrink-0 text-xs font-medium rounded-full px-3.5 py-1.5 border ${
              tab === tb ? "bg-accent-500 border-accent-500 text-base-950" : "border-base-700 text-white/60"
            }`}
          >
            {tb === "vacancies"
              ? "Всі вакансії"
              : t(`admin.${tb === "moderation" ? "moderationQueue" : tb}`)}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mx-6 mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="tap shrink-0 text-red-400/70">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-white/40 text-sm py-10 text-center">{t("common.loading")}</div>
        ) : (
          <>
            {tab === "stats" && stats && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label={t("admin.usersToday")} value={stats.usersToday} />
                  <StatCard label={t("admin.activeToday")} value={stats.activeToday} accent="text-emerald-400" />
                  <StatCard label={t("admin.totalUsers")} value={stats.totalUsers} />
                  <StatCard label="Забанено" value={users.filter((u) => u.is_banned).length} accent="text-red-400" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Активність</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label={stats.activeThisWeek !== undefined ? "Активні за 7д" : t("admin.activeToday")} value={stats.activeThisWeek ?? stats.activeToday} />
                    <StatCard label="Нових за 7д" value={stats.newUsersThisWeek ?? "—"} />
                    <StatCard label="Відгуків всього" value={applications.length} />
                    <StatCard label="Відгуків за 7д" value={stats.applicationsThisWeek ?? "—"} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Вакансії</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label={t("admin.totalVacancies")} value={stats.totalVacancies ?? allVacancies.length} />
                    <StatCard label={t("admin.pendingModeration")} value={stats.pendingCount} accent="text-amber-400" />
                    <StatCard label="Активні" value={vacancyStatusCounts[VACANCY_STATUS.ACTIVE] || 0} accent="text-emerald-400" />
                    <StatCard label="На паузі" value={vacancyStatusCounts[VACANCY_STATUS.PAUSED] || 0} />
                    <StatCard label="Відхилені" value={vacancyStatusCounts[VACANCY_STATUS.REJECTED] || 0} accent="text-red-400" />
                    <StatCard label="Чернетки" value={vacancyStatusCounts[VACANCY_STATUS.DRAFT] || 0} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Скарги</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label={t("admin.pendingReports")} value={stats.pendingReportsCount} accent="text-amber-400" />
                    <StatCard label="Оброблено всього" value={stats.resolvedReportsCount ?? "—"} />
                  </div>
                </div>

                {allVacancies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Топ вакансій за переглядами</p>
                    <div className="flex flex-col gap-2">
                      {[...allVacancies]
                        .sort((a, b) => (b.row?.views_count || 0) - (a.row?.views_count || 0))
                        .slice(0, 5)
                        .map(({ v, row }) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setPreviewVacancy(v);
                              setPreviewMode("view");
                            }}
                            className="tap flex items-center justify-between gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-2.5 text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{v.position || "—"}</p>
                              <p className="text-xs text-white/45 truncate">{v.company}</p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-accent-300">
                              {row?.views_count || 0} 👁
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "moderation" && (
              <div className="flex flex-col gap-3">
                {pending.length === 0 && <p className="text-sm text-white/45 py-6 text-center">{t("admin.noPending")}</p>}
                {pending.map((v) => (
                  <div key={v.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <p className="font-semibold text-sm">{v.position}</p>
                    <p className="text-xs text-white/50 mb-2">{v.company} · {v.city}</p>
                    <p className="text-xs text-white/70 whitespace-pre-line mb-3 line-clamp-4">{v.description}</p>
                    <button
                      onClick={() => {
                        setPreviewVacancy(v);
                        setPreviewMode("moderation");
                      }}
                      className="tap w-full mb-3 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2"
                    >
                      {t("admin.viewFull")}
                    </button>
                    {rejectingId === v.id ? (
                      <div>
                        <textarea
                          className="w-full bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-xs text-white mb-2 min-h-[60px] resize-none"
                          placeholder={t("vacancy.rejectedReason")}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => reject(v.id)} className="tap flex-1 bg-red-500/90 text-white text-xs font-semibold rounded-lg py-2">
                            {t("common.confirm")}
                          </button>
                          <button onClick={() => setRejectingId(null)} className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2">
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => approve(v.id)} className="tap flex-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-lg py-2">
                          {t("common.approve")}
                        </button>
                        <button onClick={() => setRejectingId(v.id)} className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2">
                          {t("common.reject")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "vacancies" && (
              <div className="flex flex-col gap-3">
                <input
                  value={vacancySearch}
                  onChange={(e) => setVacancySearch(e.target.value)}
                  placeholder="Пошук по всіх вакансіях: посада, компанія, місто, опис, теги, telegram_id..."
                  className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {["all", ...Object.values(VACANCY_STATUS)].map((s) => (
                    <button
                      key={s}
                      onClick={() => setVacancyStatusFilter(s)}
                      className={`tap shrink-0 text-[11px] font-medium rounded-full px-3 py-1.5 border ${
                        vacancyStatusFilter === s
                          ? "bg-accent-500 border-accent-500 text-base-950"
                          : "border-base-700 text-white/60"
                      }`}
                    >
                      {s === "all" ? `Всі (${allVacancies.length})` : `${t(`vacancy.status.${s}`)} (${vacancyStatusCounts[s] || 0})`}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-white/40">
                  Знайдено: {filteredVacancies.length}
                </p>

                {filteredVacancies.length === 0 && (
                  <p className="text-sm text-white/45 py-6 text-center">Нічого не знайдено</p>
                )}

                {filteredVacancies.map(({ v, row }) => (
                  <div key={v.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{v.position || "—"}</p>
                      <span className={`shrink-0 text-[11px] font-medium ${STATUS_COLOR[v.status] || "text-white/45"}`}>
                        {t(`vacancy.status.${v.status}`)}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-1">
                      {v.company} {v.city ? `· ${v.city}` : ""}
                    </p>
                    <p className="text-xs text-white/35 mb-3">
                      {row?.telegram_username ? `@${row.telegram_username}` : `id ${row?.telegram_id ?? "—"}`} ·{" "}
                      {row?.views_count || 0} переглядів
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewVacancy(v);
                          setPreviewMode("view");
                        }}
                        className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2"
                      >
                        {t("admin.viewFull")}
                      </button>
                      <button
                        onClick={() => deleteVacancy(v.id)}
                        disabled={deletingId === v.id}
                        className="tap shrink-0 bg-red-500/90 text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                      >
                        {deletingId === v.id ? "…" : "Видалити"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "reports" && (
              <div className="flex flex-col gap-3">
                {reports.length === 0 && <p className="text-sm text-white/45 py-6 text-center">{t("admin.noReports")}</p>}
                {reports.map((rep) => {
                  const vacancyTitle = rep.vacancies?.data?.position || rep.vacancy_applications?.vacancy_id || "—";
                  const isBusy = resolvingReportId === rep.id;
                  return (
                    <div key={rep.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                      <p className="font-semibold text-sm mb-1">
                        {rep.type === "vacancy" ? t("admin.reportOnVacancy") : t("admin.reportOnApplicant")}
                      </p>
                      <p className="text-xs text-white/50 mb-2">
                        {t(`report.reasons.${rep.reason}`)} · {vacancyTitle}
                      </p>
                      <p className="text-xs text-white/45 mb-1">
                        {t("admin.reportedBy")}: {rep.reporter?.telegram_username ? `@${rep.reporter.telegram_username}` : rep.reporter?.telegram_id}
                      </p>
                      <p className="text-xs text-white/45 mb-2">
                        {t("admin.reportedTarget")}: {rep.target?.telegram_username ? `@${rep.target.telegram_username}` : rep.target?.telegram_id}
                        {rep.target?.is_banned && <span className="ml-2 text-[10px] text-red-400 font-semibold">{t("admin.banned")}</span>}
                      </p>
                      {rep.comment && (
                        <p className="text-xs text-white/70 whitespace-pre-line mb-3">
                          {t("admin.reportComment")}: {rep.comment}
                        </p>
                      )}
                      {rep.vacancy_applications?.message && (
                        <p className="text-xs text-white/60 whitespace-pre-line mb-3 line-clamp-3">
                          {rep.vacancy_applications.message}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveReport(rep.id, "resolved")}
                          disabled={isBusy}
                          className="tap flex-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-lg py-2 disabled:opacity-50"
                        >
                          {t("admin.resolve")}
                        </button>
                        <button
                          onClick={() => resolveReport(rep.id, "dismissed")}
                          disabled={isBusy}
                          className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2 disabled:opacity-50"
                        >
                          {t("admin.dismiss")}
                        </button>
                        {!rep.target?.is_banned && (
                          <button
                            onClick={() => resolveReport(rep.id, "resolved", true)}
                            disabled={isBusy}
                            className="tap shrink-0 bg-red-500/90 text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                          >
                            {t("admin.banUser")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "applications" && (
              <div className="flex flex-col gap-3">
                {applications.length === 0 && <p className="text-sm text-white/45 py-6 text-center">{t("admin.noApplications")}</p>}
                {applications.map((a) => (
                  <div key={a.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <p className="font-semibold text-sm">{a.vacancies?.data?.position || "—"}</p>
                    <p className="text-xs text-white/50 mb-2">telegram_id: {a.telegram_id}</p>
                    {a.message && <p className="text-xs text-white/70">{a.message}</p>}
                  </div>
                ))}
              </div>
            )}

            {tab === "pricing" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-white/45">
                  Ціни зберігаються в окремій таблиці pricing_settings у Supabase і застосовуються одразу до всіх
                  нових оплат. Публікація рахується за кожен тиждень показу, топ-розміщення — окрема доплата за кожен
                  тиждень перебування вакансії у топі списку.
                </p>
                <div className="bg-base-850 border border-base-700 rounded-xl p-4 flex flex-col gap-3">
                  <label className="text-xs text-white/60">
                    Розміщення, ⭐ за тиждень
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pricingForm.listingPrice}
                      onChange={(e) => {
                        setPricingSaved(false);
                        setPricingForm((f) => ({ ...f, listingPrice: e.target.value }));
                      }}
                      className="mt-1 w-full bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="text-xs text-white/60">
                    Топ-сектор, ⭐ за тиждень
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pricingForm.topPrice}
                      onChange={(e) => {
                        setPricingSaved(false);
                        setPricingForm((f) => ({ ...f, topPrice: e.target.value }));
                      }}
                      className="mt-1 w-full bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </label>
                  {pricing && (
                    <p className="text-[11px] text-white/35">
                      Поточні збережені значення: {pricing.listingPrice} ⭐/тиждень розміщення, {pricing.topPrice} ⭐/тиждень
                      топ-сектору.
                    </p>
                  )}
                  <button
                    onClick={savePricing}
                    disabled={savingPricing}
                    className="tap bg-accent-500 text-base-950 text-xs font-semibold rounded-lg py-2.5 disabled:opacity-50"
                  >
                    {savingPricing ? "Зберігаємо…" : pricingSaved ? "Збережено ✓" : "Зберегти ціни"}
                  </button>
                </div>
              </div>
            )}

            {tab === "users" && (
              <div className="flex flex-col gap-2">
                {filteredUsers.map((u) => {
                  const uVacancyCount = allVacancies.filter(({ row }) => String(row?.telegram_id) === String(u.telegram_id)).length;
                  return (
                    <button
                      key={u.telegram_id}
                      onClick={() => setActiveUser(u)}
                      className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {u.first_name || u.telegram_username || u.telegram_id}
                          {u.is_banned && <span className="ml-2 text-[10px] text-red-400 font-semibold">{t("admin.banned")}</span>}
                        </p>
                        <p className="text-xs text-white/40">
                          @{u.telegram_username || "—"} · {u.telegram_id} · {uVacancyCount} вак.
                        </p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Vacancy preview sheet — used from moderation, stats, and vacancies tab */}
      {previewVacancy && (
        <Sheet onClose={() => setPreviewVacancy(null)}>
          <div className="flex-1 overflow-y-auto pb-2">
            <VacancyDocument vacancy={previewVacancy} />
          </div>
          {previewMode === "moderation" ? (
            <div className="flex gap-2 pt-3 shrink-0">
              <button
                onClick={() => {
                  approve(previewVacancy.id);
                  setPreviewVacancy(null);
                }}
                className="tap flex-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-lg py-2.5"
              >
                {t("common.approve")}
              </button>
              <button
                onClick={() => {
                  setRejectingId(previewVacancy.id);
                  setPreviewVacancy(null);
                }}
                className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2.5"
              >
                {t("common.reject")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-3 shrink-0">
              <button
                onClick={() => deleteVacancy(previewVacancy.id)}
                disabled={deletingId === previewVacancy.id}
                className="tap flex-1 bg-red-500/90 text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-50"
              >
                {deletingId === previewVacancy.id ? "…" : "Видалити вакансію"}
              </button>
            </div>
          )}
          <button
            onClick={() => setPreviewVacancy(null)}
            className="tap w-full mt-2 text-center text-sm font-medium text-white/50 py-2 shrink-0"
          >
            {t("common.close")}
          </button>
        </Sheet>
      )}

      {/* User detail sheet */}
      {activeUser && (
        <Sheet onClose={() => setActiveUser(null)} wide>
          <div className="flex-1 overflow-y-auto pb-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-300 font-semibold text-sm shrink-0">
                {(activeUser.first_name || activeUser.telegram_username || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {[activeUser.first_name, activeUser.last_name].filter(Boolean).join(" ") || "—"}
                  {activeUser.is_banned && (
                    <span className="ml-2 text-[10px] text-red-400 font-semibold align-middle">{t("admin.banned")}</span>
                  )}
                </p>
                <p className="text-xs text-white/40 truncate">@{activeUser.telegram_username || "—"}</p>
              </div>
            </div>

            <div className="bg-base-850 border border-base-700 rounded-xl p-3 mb-4">
              <Row label="Telegram ID" value={activeUser.telegram_id} />
              <Row label="Ім'я" value={activeUser.first_name} />
              <Row label="Прізвище" value={activeUser.last_name} />
              <Row label="Username" value={activeUser.telegram_username && `@${activeUser.telegram_username}`} />
              <Row label="Мова" value={activeUser.language_code} />
              <Row label="Зареєстрований" value={fmtDate(activeUser.created_at)} />
              <Row label="Останній візит" value={fmtDate(activeUser.last_seen_at || activeUser.updated_at)} />
              <Row label="Статус" value={activeUser.is_banned ? "Забанений" : "Активний"} />
              <Row label="Резюме" value={activeUser.resumes_count} />
              <Row label="Всього зірок витрачено" value={activeUser.stars_spent} />
            </div>

            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              Вакансії ({activeUserVacancies.length})
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {activeUserVacancies.length === 0 && (
                <p className="text-xs text-white/35 mb-2">Немає вакансій</p>
              )}
              {activeUserVacancies.map(({ v, row }) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setPreviewVacancy(v);
                    setPreviewMode("view");
                  }}
                  className="tap flex items-center justify-between gap-2 bg-base-850 border border-base-700 rounded-lg px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{v.position || "—"}</p>
                    <p className={`text-[11px] ${STATUS_COLOR[v.status] || "text-white/45"}`}>{t(`vacancy.status.${v.status}`)}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/35">{row?.views_count || 0} 👁</span>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              Відгуки на вакансії ({activeUserApplications.length})
            </p>
            <div className="flex flex-col gap-2">
              {activeUserApplications.length === 0 && (
                <p className="text-xs text-white/35">Немає відгуків</p>
              )}
              {activeUserApplications.map((a) => (
                <div key={a.id} className="bg-base-850 border border-base-700 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-medium truncate">{a.vacancies?.data?.position || "—"}</p>
                  {a.message && <p className="text-[11px] text-white/60 mt-1 line-clamp-2">{a.message}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 shrink-0">
            <button
              onClick={() => toggleBan(activeUser)}
              className={`tap flex-1 text-xs font-semibold rounded-lg py-2.5 ${
                activeUser.is_banned ? "bg-base-800 border border-base-700 text-white/70" : "bg-red-500/90 text-white"
              }`}
            >
              {activeUser.is_banned ? t("admin.unban") : t("admin.ban")}
            </button>
          </div>
          <button
            onClick={() => setActiveUser(null)}
            className="tap w-full mt-2 text-center text-sm font-medium text-white/50 py-2 shrink-0"
          >
            {t("common.close")}
          </button>
        </Sheet>
      )}
    </div>
  );
}
