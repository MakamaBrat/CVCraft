import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { vacancyFromRow, VACANCY_STATUS } from "../lib/vacancy.js";
import { VacancyDocument } from "./VacancyPreview.jsx";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";
import { confirmDialog } from "../lib/telegram.js";

const TAB_IDS = ["stats", "moderation", "vacancies", "resumes", "reports", "applications", "users", "pricing"];
const TAB_LABEL_KEYS = {
  stats: "admin.tabStats",
  moderation: "admin.tabModeration",
  vacancies: "admin.tabVacancies",
  resumes: "admin.tabResumes",
  reports: "admin.tabReports",
  applications: "admin.tabApplications",
  users: "admin.tabUsers",
  pricing: "admin.tabPricing",
};

const STATUS_COLOR = {
  [VACANCY_STATUS.DRAFT]: "text-white/45",
  [VACANCY_STATUS.PENDING_REVIEW]: "text-amber-400",
  [VACANCY_STATUS.APPROVED]: "text-sky-400",
  [VACANCY_STATUS.REJECTED]: "text-red-400",
  [VACANCY_STATUS.ACTIVE]: "text-emerald-400",
  [VACANCY_STATUS.PAUSED]: "text-white/45",
};

const ACCENTS = { minimal: "#4b5563", modern: "#6c5ce7", bold: "#ff7a59", classic: "#2f6fb0" };

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

function vacancyDocFromRaw(raw) {
  if (!raw) return null;
  try {
    return vacancyFromRow(raw);
  } catch {
    return { id: raw.id, status: raw.status, ...(raw.data || {}) };
  }
}

// Resume rows are stored the same way vacancies are (id + JSON `data` blob).
// There's no resumeFromRow helper exported today, so flatten it the same way
// vacancyDocFromRaw does as a fallback.
function resumeDocFromRaw(raw) {
  if (!raw) return null;
  if (raw.fullName !== undefined || raw.role !== undefined) return raw; // already flat (e.g. a snapshot)
  return { id: raw.id, ...(raw.data || {}) };
}

// ---------- Small building blocks ----------

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

function LinkChip({ onClick, icon = "👤", children }) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      className="tap inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 bg-accent-500/10 border border-accent-500/25 rounded-full px-2.5 py-1"
    >
      <span>{icon}</span> {children}
    </button>
  );
}

// Bottom-sheet wrapper used everywhere for consistency.
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

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center justify-between text-[11px] text-white/55 mb-1">
        <span className="truncate">{label}</span>
        <span className="text-white/85 font-semibold shrink-0 ml-2">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-base-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function BarChart({ title, data, color = "#6c5ce7" }) {
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <div className="bg-base-850 border border-base-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">{title}</p>
      {data.map((d) => (
        <BarRow key={d.label} label={d.label} value={d.value || 0} max={max} color={d.color || color} />
      ))}
    </div>
  );
}

// Sparkline/trend chart for time-series data (expects [{label, value}]).
function TrendChart({ title, points, color = "#22c55e" }) {
  if (!points || points.length < 2) return null;
  const w = 300;
  const h = 76;
  const pad = 8;
  const values = points.map((p) => p.value || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0]},${c[1]}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`;
  return (
    <div className="bg-base-850 border border-base-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">{title}</p>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <path d={areaPath} fill={color} opacity="0.14" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r="2.4" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-white/35">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

// Full resume document renderer (mirrors the markup used in VacancyApplicants' applicant detail).
function ResumeDoc({ resume, t }) {
  if (!resume) return <p className="text-sm text-white/40 text-center py-10">{t("resume.unavailable")}</p>;
  const accent = ACCENTS[resume.template] || ACCENTS.minimal;
  const theme = getColorTheme(resume.colorScheme);
  const align = getAlign(resume.align);
  const isCenter = align === "center";
  return (
    <div
      className="rounded-xl shadow-xl mx-auto"
      style={{
        width: "100%",
        maxWidth: 400,
        padding: "28px 24px",
        fontFamily: "Manrope, sans-serif",
        ...getDocBackgroundStyle(theme, resume.backgroundUrl),
        color: theme.text,
        textAlign: align,
      }}
    >
      <div
        className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        <Avatar url={resume.avatarUrl} name={resume.fullName} accent={accent} theme={theme} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight truncate">{resume.fullName || "—"}</h2>
          <p className="text-sm font-medium truncate" style={{ color: accent }}>
            {resume.role}
          </p>
        </div>
      </div>

      <div
        className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
        style={{ color: theme.textMed }}
      >
        {resume.email && <span>{resume.email}</span>}
        {resume.phone && <span>{resume.phone}</span>}
        {resume.city && <span>{resume.city}</span>}
      </div>

      {resume.summary && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            {t("resume.sections.about")}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>
            {resume.summary}
          </p>
        </section>
      )}

      {(resume.experience || []).length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.experience")}
          </h3>
          <div className="space-y-3">
            {resume.experience.map((e) => (
              <div key={e.id}>
                <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                  <p className="text-[12.5px] font-semibold">{e.position}</p>
                  <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                    {e.period}
                  </p>
                </div>
                <p className="text-[11px] mb-1" style={{ color: theme.textMed }}>
                  {e.company}
                </p>
                {e.description && (
                  <p className="text-[11.5px] leading-relaxed" style={{ color: theme.text, opacity: 0.78 }}>
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(resume.education || []).length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.education")}
          </h3>
          <div className="space-y-2">
            {resume.education.map((e) => (
              <div key={e.id}>
                <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                  <p className="text-[12.5px] font-semibold">{e.school}</p>
                  <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                    {e.period}
                  </p>
                </div>
                {e.degree && (
                  <p className="text-[11px]" style={{ color: theme.textMed }}>
                    {e.degree}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(resume.skills || []).length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.skills")}
          </h3>
          <div className={`flex flex-wrap gap-1.5 ${isCenter ? "justify-center" : ""}`}>
            {resume.skills.map((s) => (
              <span
                key={s}
                className="text-[10.5px] font-medium rounded-full px-2.5 py-1"
                style={{ background: `${accent}${theme.chipAlpha}`, color: accent }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {(resume.portfolio || []).length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.portfolio")}
          </h3>
          <div className="space-y-3">
            {resume.portfolio.map((p) => (
              <div key={p.id}>
                {p.title && <p className="text-[11.5px] font-semibold mb-1">{p.title}</p>}
                <MediaPreview item={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminPanel({ onBack, adminId }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]); // [{ v, row }]
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [allVacancies, setAllVacancies] = useState([]); // [{ v, row }]
  const [allResumes, setAllResumes] = useState([]); // [{ r, row }]
  const [resumeSearch, setResumeSearch] = useState("");
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState(null); // { type: 'vacancy'|'resume', data, row, mode }
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
      const [statsRes, moderationRes, applicationsRes, usersRes, pricingRes, reportsRes, vacanciesRes, resumesRes] =
        await Promise.all([
          apiFetch("/api/admin?action=stats"),
          apiFetch("/api/admin?action=moderation"),
          apiFetch("/api/admin?action=applications"),
          apiFetch("/api/admin?action=users"),
          apiFetch("/api/admin?action=pricing"),
          apiFetch("/api/admin?action=reports&status=open"),
          // NEW backend action: returns { vacancies: [rawRow, ...] } — every vacancy row
          // of any status, each row keeping telegram_id/telegram_username/views_count.
          apiFetch("/api/admin?action=allVacancies").catch(() => ({ vacancies: [] })),
          // NEW backend action: returns { resumes: [rawRow, ...] } — every saved resume,
          // each row keeping telegram_id/telegram_username so it can be tied to a user.
          apiFetch("/api/admin?action=allResumes").catch(() => ({ resumes: [] })),
        ]);
      setStats(statsRes);
      setPending((moderationRes?.vacancies || []).map((row) => ({ row, v: vacancyFromRow(row) })));
      setApplications(applicationsRes?.applications || []);
      setUsers(usersRes?.users || []);
      setPricing(pricingRes);
      setReports(reportsRes?.reports || []);
      setAllVacancies(
        (vacanciesRes?.vacancies || []).map((raw) => {
          const row = { ...raw, telegram_username: raw.owner?.telegram_username, first_name: raw.owner?.first_name, is_banned: raw.owner?.is_banned };
          return { row, v: vacancyFromRow(raw) };
        })
      );
      setAllResumes(
        (resumesRes?.resumes || []).map((raw) => {
          const row = { ...raw, telegram_username: raw.owner?.telegram_username, first_name: raw.owner?.first_name, is_banned: raw.owner?.is_banned };
          return { row, r: resumeDocFromRaw(raw) };
        })
      );
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
      setPending((prev) => prev.filter((x) => x.v.id !== id));
      setAllVacancies((prev) =>
        prev.map((x) => (x.v.id === id ? { ...x, v: { ...x.v, status: VACANCY_STATUS.APPROVED } } : x))
      );
    } catch (err) {
      setActionError(t("admin.errModeration")(err?.payload?.error || err.message));
    }
  };

  const reject = async (id) => {
    setActionError(null);
    try {
      await apiFetch("/api/admin", {
        method: "POST",
        body: { action: "moderate", id, decision: "reject", rejectReason: rejectReason || null },
      });
      setPending((prev) => prev.filter((x) => x.v.id !== id));
      setAllVacancies((prev) =>
        prev.map((x) => (x.v.id === id ? { ...x, v: { ...x.v, status: VACANCY_STATUS.REJECTED } } : x))
      );
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      setActionError(t("admin.errModeration")(err?.payload?.error || err.message));
    }
  };

  const deleteVacancy = async (id) => {
    if (!(await confirmDialog(t("common.confirmDeleteVacancy") || "Видалити цю вакансію назавжди?"))) return;
    setActionError(null);
    setDeletingId(id);
    try {
      // NEW backend action: hard/soft-deletes the vacancy row.
      await apiFetch("/api/admin", { method: "POST", body: { action: "deleteVacancy", id } });
      setAllVacancies((prev) => prev.filter((x) => x.v.id !== id));
      setPending((prev) => prev.filter((x) => x.v.id !== id));
      setPreview(null);
    } catch (err) {
      setActionError(t("admin.errDelete")(err?.payload?.error || err.message));
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
      setActionError(t("admin.errGeneric")(err?.payload?.error || err.message));
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
      setActionError(t("admin.errReport")(err?.payload?.error || err.message));
    }
    setResolvingReportId(null);
  };

  const savePricing = async () => {
    setActionError(null);
    setPricingSaved(false);
    const listing = Number(pricingForm.listingPrice);
    const top = Number(pricingForm.topPrice);
    if (!Number.isInteger(listing) || listing < 0 || !Number.isInteger(top) || top < 0) {
      setActionError(t("admin.pricingInvalid"));
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
      setActionError(t("admin.errPricingSave")(err?.payload?.error || err.message));
    }
    setSavingPricing(false);
  };

  // ---------- Navigation helpers ----------

  const openVacancyPreview = (v, row, mode) => setPreview({ type: "vacancy", data: v, row, mode });
  const openResumePreview = (resume, row, mode = "plain") => setPreview({ type: "resume", data: resume, row, mode });

  // Opens the user sheet, preferring the full record from `users` (loaded once)
  // and falling back to whatever partial info the report/vacancy row carried.
  const openUserById = (telegramId, partial) => {
    if (!telegramId) return;
    const full = users.find((u) => String(u.telegram_id) === String(telegramId));
    setActiveUser(full || { telegram_id: telegramId, ...partial });
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

  const activeUserVacancies = useMemo(() => {
    if (!activeUser) return [];
    return allVacancies.filter(({ row }) => String(row?.telegram_id) === String(activeUser.telegram_id));
  }, [activeUser, allVacancies]);

  const activeUserApplications = useMemo(() => {
    if (!activeUser) return [];
    return applications.filter((a) => String(a.telegram_id) === String(activeUser.telegram_id));
  }, [activeUser, applications]);

  const activeUserResumes = useMemo(() => {
    if (!activeUser) return [];
    return allResumes.filter(({ row }) => String(row?.telegram_id) === String(activeUser.telegram_id));
  }, [activeUser, allResumes]);

  const filteredResumes = useMemo(() => {
    const q = resumeSearch.trim().toLowerCase();
    if (!q) return allResumes;
    return allResumes.filter(({ r, row }) => {
      const haystack = [
        r.fullName,
        r.role,
        r.city,
        r.email,
        r.phone,
        r.summary,
        row?.telegram_id,
        row?.telegram_username,
        ...(r.skills || []),
      ]
        .filter(Boolean)
        .join(" \n ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allResumes, resumeSearch]);

  const vacancyStatusChartData = useMemo(
    () =>
      Object.values(VACANCY_STATUS).map((s) => ({
        label: t(`vacancy.status.${s}`),
        value: vacancyStatusCounts[s] || 0,
        color: STATUS_COLOR[s]?.includes("emerald")
          ? "#34d399"
          : STATUS_COLOR[s]?.includes("amber")
          ? "#fbbf24"
          : STATUS_COLOR[s]?.includes("red")
          ? "#f87171"
          : STATUS_COLOR[s]?.includes("sky")
          ? "#38bdf8"
          : "#6b7280",
      })),
    [vacancyStatusCounts, t]
  );

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

      {/* No-scroll tab menu: wraps onto multiple lines instead of horizontal scrolling */}
      <div className="px-6 pb-3 flex flex-wrap gap-2">
        {TAB_IDS.map((tid) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`tap text-xs font-medium rounded-full px-3.5 py-1.5 border ${
              tab === tid ? "bg-accent-500 border-accent-500 text-base-950" : "border-base-700 text-white/60"
            }`}
          >
            {t(TAB_LABEL_KEYS[tid])}
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
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label={t("admin.usersToday")} value={stats.usersToday} />
                  <StatCard label={t("admin.activeToday")} value={stats.activeToday} accent="text-emerald-400" />
                  <StatCard label={t("admin.totalUsers")} value={stats.totalUsers} />
                  <StatCard label={t("admin.bannedCount")} value={users.filter((u) => u.is_banned).length} accent="text-red-400" />
                </div>

                {stats.activitySeries?.length > 1 ? (
                  <TrendChart title={t("admin.activeUsersChart")} points={stats.activitySeries} color="#22c55e" />
                ) : (
                  <BarChart
                    title={t("admin.activityNoSeriesTitle")}
                    color="#22c55e"
                    data={[
                      { label: t("admin.activeTodayShort"), value: stats.activeToday || 0 },
                      { label: t("admin.newTodayShort"), value: stats.usersToday || 0 },
                      { label: t("admin.totalUsersShort"), value: stats.totalUsers || 0 },
                    ]}
                  />
                )}

                {stats.newUsersSeries?.length > 1 && (
                  <TrendChart title={t("admin.newUsersChart")} points={stats.newUsersSeries} color="#38bdf8" />
                )}

                {stats.applicationsSeries?.length > 1 && (
                  <TrendChart title={t("admin.applicationsChart")} points={stats.applicationsSeries} color="#f59e0b" />
                )}

                <BarChart title={t("admin.byStatusChart")} data={vacancyStatusChartData} />

                <BarChart
                  title={t("admin.reportsChart")}
                  color="#f87171"
                  data={[
                    { label: t("admin.pendingShort"), value: stats.pendingReportsCount || 0 },
                    { label: t("admin.resolvedTotalShort"), value: stats.resolvedReportsCount || 0 },
                  ]}
                />

                {allVacancies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">{t("admin.topViewsTitle")}</p>
                    <div className="flex flex-col gap-2">
                      {[...allVacancies]
                        .sort((a, b) => (b.row?.views_count || 0) - (a.row?.views_count || 0))
                        .slice(0, 5)
                        .map(({ v, row }) => (
                          <button
                            key={v.id}
                            onClick={() => openVacancyPreview(v, row, "view")}
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

                {!stats.activitySeries && (
                  <p className="text-[11px] text-white/30">{t("admin.noSeriesHint")}</p>
                )}
              </div>
            )}

            {tab === "moderation" && (
              <div className="flex flex-col gap-3">
                {pending.length === 0 && <p className="text-sm text-white/45 py-6 text-center">{t("admin.noPending")}</p>}
                {pending.map(({ v, row }) => (
                  <div key={v.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm">{v.position}</p>
                      <LinkChip onClick={() => openUserById(row?.telegram_id, { telegram_username: row?.telegram_username })}>
                        {row?.telegram_username ? `@${row.telegram_username}` : row?.telegram_id}
                      </LinkChip>
                    </div>
                    <p className="text-xs text-white/50 mb-2">{v.company} · {v.city}</p>
                    <p className="text-xs text-white/70 whitespace-pre-line mb-3 line-clamp-4">{v.description}</p>
                    <button
                      onClick={() => openVacancyPreview(v, row, "moderation")}
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
                  placeholder={t("admin.searchVacanciesPlaceholder")}
                  className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
                />
                <div className="flex flex-wrap gap-2">
                  {["all", ...Object.values(VACANCY_STATUS)].map((s) => (
                    <button
                      key={s}
                      onClick={() => setVacancyStatusFilter(s)}
                      className={`tap text-[11px] font-medium rounded-full px-3 py-1.5 border ${
                        vacancyStatusFilter === s
                          ? "bg-accent-500 border-accent-500 text-base-950"
                          : "border-base-700 text-white/60"
                      }`}
                    >
                      {s === "all" ? t("admin.allStatusFilter")(allVacancies.length) : `${t(`vacancy.status.${s}`)} (${vacancyStatusCounts[s] || 0})`}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-white/40">{t("admin.foundCount")(filteredVacancies.length)}</p>

                {filteredVacancies.length === 0 && (
                  <p className="text-sm text-white/45 py-6 text-center">{t("admin.nothingFound")}</p>
                )}

                {filteredVacancies.map(({ v, row }) => (
                  <div key={v.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{v.position || "—"}</p>
                      <span className={`shrink-0 text-[11px] font-medium ${STATUS_COLOR[v.status] || "text-white/45"}`}>
                        {t(`vacancy.status.${v.status}`)}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-2">
                      {v.company} {v.city ? `· ${v.city}` : ""}
                    </p>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <LinkChip onClick={() => openUserById(row?.telegram_id, { telegram_username: row?.telegram_username })}>
                        {row?.telegram_username ? `@${row.telegram_username}` : `id ${row?.telegram_id ?? "—"}`}
                      </LinkChip>
                      <span className="text-[11px] text-white/35 shrink-0">{t("admin.viewsCountShort")(row?.views_count || 0)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openVacancyPreview(v, row, "delete")}
                        className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2"
                      >
                        {t("admin.viewFull")}
                      </button>
                      <button
                        onClick={() => deleteVacancy(v.id)}
                        disabled={deletingId === v.id}
                        className="tap shrink-0 bg-red-500/90 text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                      >
                        {deletingId === v.id ? "…" : t("common.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "resumes" && (
              <div className="flex flex-col gap-3">
                <input
                  value={resumeSearch}
                  onChange={(e) => setResumeSearch(e.target.value)}
                  placeholder={t("admin.searchResumesPlaceholder")}
                  className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
                />
                <p className="text-xs text-white/40">{t("admin.foundCount")(filteredResumes.length)}</p>

                {filteredResumes.length === 0 && (
                  <p className="text-sm text-white/45 py-6 text-center">{t("admin.nothingFound")}</p>
                )}

                {filteredResumes.map(({ r, row }) => (
                  <button
                    key={row.id}
                    onClick={() => openResumePreview(r, row, "plain")}
                    className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
                  >
                    <Avatar
                      url={r.avatarUrl}
                      name={r.fullName || "?"}
                      accent={ACCENTS[r.template] || ACCENTS.minimal}
                      theme={getColorTheme(r.colorScheme)}
                      size={10}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.fullName || "—"}</p>
                      <p className="text-xs text-white/45 truncate">{r.role}</p>
                      <p className="text-[11px] text-white/35 truncate">
                        {row?.telegram_username ? `@${row.telegram_username}` : `id ${row?.telegram_id ?? "—"}`}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {tab === "reports" && (
              <div className="flex flex-col gap-3">
                {reports.length === 0 && <p className="text-sm text-white/45 py-6 text-center">{t("admin.noReports")}</p>}
                {reports.map((rep) => {
                  const vacancyTitle = rep.vacancies?.data?.position || rep.vacancy_applications?.vacancy_id || "—";
                  const isBusy = resolvingReportId === rep.id;
                  const resumeSnapshot = rep.vacancy_applications?.resume_snapshot || null;
                  return (
                    <div key={rep.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
                      <p className="font-semibold text-sm mb-1">
                        {rep.type === "vacancy" ? t("admin.reportOnVacancy") : t("admin.reportOnApplicant")}
                      </p>
                      <p className="text-xs text-white/50 mb-3">
                        {t(`report.reasons.${rep.reason}`)} · {vacancyTitle}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[11px] text-white/40">{t("admin.reportedBy")}:</span>
                        <LinkChip onClick={() => openUserById(rep.reporter?.telegram_id, rep.reporter)}>
                          {rep.reporter?.telegram_username ? `@${rep.reporter.telegram_username}` : rep.reporter?.telegram_id}
                        </LinkChip>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[11px] text-white/40">{t("admin.reportedTarget")}:</span>
                        <LinkChip onClick={() => openUserById(rep.target?.telegram_id, rep.target)}>
                          {rep.target?.telegram_username ? `@${rep.target.telegram_username}` : rep.target?.telegram_id}
                        </LinkChip>
                        {rep.target?.is_banned && (
                          <span className="text-[10px] text-red-400 font-semibold">{t("admin.banned")}</span>
                        )}
                      </div>

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

                      <div className="flex gap-2 mb-3">
                        {rep.vacancies && (
                          <button
                            onClick={() => openVacancyPreview(vacancyDocFromRaw(rep.vacancies), rep.vacancies, "delete")}
                            className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2"
                          >
                            {t("admin.viewVacancy")}
                          </button>
                        )}
                        {resumeSnapshot && (
                          <button
                            onClick={() => openResumePreview(resumeSnapshot, { telegram_id: rep.target?.telegram_id, telegram_username: rep.target?.telegram_username })}
                            className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2"
                          >
                            {t("admin.viewResume")}
                          </button>
                        )}
                      </div>

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
                    <div className="flex items-center gap-2 mb-2">
                      <LinkChip onClick={() => openUserById(a.telegram_id)}>id {a.telegram_id}</LinkChip>
                    </div>
                    {a.message && <p className="text-xs text-white/70">{a.message}</p>}
                  </div>
                ))}
              </div>
            )}

            {tab === "pricing" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-white/45">{t("admin.pricingIntro")}</p>
                <div className="bg-base-850 border border-base-700 rounded-xl p-4 flex flex-col gap-3">
                  <label className="text-xs text-white/60">
                    {t("admin.listingPriceLabel")}
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
                    {t("admin.topPriceLabel")}
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
                      {t("admin.currentPricingValues")(pricing.listingPrice, pricing.topPrice)}
                    </p>
                  )}
                  <button
                    onClick={savePricing}
                    disabled={savingPricing}
                    className="tap bg-accent-500 text-base-950 text-xs font-semibold rounded-lg py-2.5 disabled:opacity-50"
                  >
                    {savingPricing ? t("admin.saving") : pricingSaved ? t("admin.saved") : t("admin.savePrices")}
                  </button>
                </div>
              </div>
            )}

            {tab === "users" && (
              <div className="flex flex-col gap-2">
                {users.map((u) => {
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
                          @{u.telegram_username || "—"} · {u.telegram_id} · {uVacancyCount} {t("admin.vacCountSuffix")}
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

      {/* Vacancy / resume preview sheet — used from moderation, stats, vacancies tab and reports */}
      {preview && (
        <Sheet onClose={() => setPreview(null)}>
          <div className="flex-1 overflow-y-auto pb-2">
            {preview.type === "vacancy" ? <VacancyDocument vacancy={preview.data} /> : <ResumeDoc resume={preview.data} t={t} />}
          </div>

          {preview.row?.telegram_id && (
            <div className="pt-2 shrink-0">
              <LinkChip
                onClick={() => {
                  const row = preview.row;
                  setPreview(null);
                  openUserById(row.telegram_id, { telegram_username: row.telegram_username });
                }}
              >
                {t("admin.goToUser")(preview.row.telegram_username ? `@${preview.row.telegram_username}` : preview.row.telegram_id)}
              </LinkChip>
            </div>
          )}

          {preview.type === "vacancy" && preview.mode === "moderation" && (
            <div className="flex gap-2 pt-3 shrink-0">
              <button
                onClick={() => {
                  approve(preview.data.id);
                  setPreview(null);
                }}
                className="tap flex-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-lg py-2.5"
              >
                {t("common.approve")}
              </button>
              <button
                onClick={() => {
                  setRejectingId(preview.data.id);
                  setPreview(null);
                }}
                className="tap flex-1 bg-base-800 border border-base-700 text-white/80 text-xs font-semibold rounded-lg py-2.5"
              >
                {t("common.reject")}
              </button>
            </div>
          )}

          {preview.type === "vacancy" && preview.mode === "delete" && (
            <div className="flex gap-2 pt-3 shrink-0">
              <button
                onClick={() => deleteVacancy(preview.data.id)}
                disabled={deletingId === preview.data.id}
                className="tap flex-1 bg-red-500/90 text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-50"
              >
                {deletingId === preview.data.id ? "…" : t("admin.deleteVacancyBtn")}
              </button>
            </div>
          )}

          <button
            onClick={() => setPreview(null)}
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
              <Row label={t("admin.userFieldTelegramId")} value={activeUser.telegram_id} />
              <Row label={t("admin.userFieldFirstName")} value={activeUser.first_name} />
              <Row label={t("admin.userFieldLastName")} value={activeUser.last_name} />
              <Row label={t("admin.userFieldUsername")} value={activeUser.telegram_username && `@${activeUser.telegram_username}`} />
              <Row label={t("admin.userFieldLanguage")} value={activeUser.language_code} />
              <Row label={t("admin.userFieldRegistered")} value={fmtDate(activeUser.created_at)} />
              <Row label={t("admin.userFieldLastSeen")} value={fmtDate(activeUser.last_seen_at || activeUser.updated_at)} />
              <Row label={t("admin.userFieldStatus")} value={activeUser.is_banned ? t("admin.banned") : t("admin.statusActive")} />
              <Row label={t("admin.userFieldResumesCount")} value={activeUser.resumes_count} />
              <Row label={t("admin.userFieldStarsSpent")} value={activeUser.stars_spent} />
            </div>

            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              {t("admin.resumesCount")(activeUserResumes.length)}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {activeUserResumes.length === 0 && <p className="text-xs text-white/35 mb-2">{t("admin.noSavedResumes")}</p>}
              {activeUserResumes.map(({ r, row }) => (
                <button
                  key={row.id}
                  onClick={() => openResumePreview(r, row, "plain")}
                  className="tap flex items-center gap-3 bg-base-850 border border-base-700 rounded-lg px-3 py-2.5 text-left"
                >
                  <Avatar
                    url={r.avatarUrl}
                    name={r.fullName || "?"}
                    accent={ACCENTS[r.template] || ACCENTS.minimal}
                    theme={getColorTheme(r.colorScheme)}
                    size={8}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{r.fullName || "—"}</p>
                    <p className="text-[11px] text-white/45 truncate">{r.role}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              {t("admin.vacanciesCount")(activeUserVacancies.length)}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {activeUserVacancies.length === 0 && <p className="text-xs text-white/35 mb-2">{t("admin.noVacanciesShort")}</p>}
              {activeUserVacancies.map(({ v, row }) => (
                <button
                  key={v.id}
                  onClick={() => openVacancyPreview(v, row, "delete")}
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
              {t("admin.applicationsCount")(activeUserApplications.length)}
            </p>
            <div className="flex flex-col gap-2">
              {activeUserApplications.length === 0 && <p className="text-xs text-white/35">{t("admin.noApplicationsShort")}</p>}
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
