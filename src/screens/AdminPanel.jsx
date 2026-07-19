import { useEffect, useState } from "react";
import StatusBar from "../components/StatusBar.jsx";
import { supabase } from "../lib/supabase.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { vacancyFromRow, VACANCY_STATUS } from "../lib/vacancy.js";

const TABS = ["stats", "moderation", "applications", "users"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function AdminPanel({ onBack, adminId }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const today = startOfToday();

    const [{ count: totalUsers }, { count: usersToday }, { count: activeToday }, { count: totalVacancies }, { count: pendingCount }, pendingRows, appRows, usersRows] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("users").select("*", { count: "exact", head: true }).gte("last_active_at", today),
        supabase.from("vacancies").select("*", { count: "exact", head: true }),
        supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", VACANCY_STATUS.PENDING_REVIEW),
        supabase.from("vacancies").select("*").eq("status", VACANCY_STATUS.PENDING_REVIEW).order("created_at", { ascending: true }),
        supabase
          .from("vacancy_applications")
          .select("id, message, contact, created_at, telegram_id, vacancy_id, vacancies(data)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

    setStats({ totalUsers, usersToday, activeToday, totalVacancies, pendingCount });
    setPending((pendingRows.data || []).map(vacancyFromRow));
    setApplications(appRows.data || []);
    setUsers(usersRows.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const approve = async (id) => {
    await supabase
      .from("vacancies")
      .update({ status: VACANCY_STATUS.APPROVED, moderated_by: adminId, moderated_at: new Date().toISOString(), reject_reason: null })
      .eq("id", id);
    setPending((prev) => prev.filter((v) => v.id !== id));
  };

  const reject = async (id) => {
    await supabase
      .from("vacancies")
      .update({ status: VACANCY_STATUS.REJECTED, moderated_by: adminId, moderated_at: new Date().toISOString(), reject_reason: rejectReason || null })
      .eq("id", id);
    setPending((prev) => prev.filter((v) => v.id !== id));
    setRejectingId(null);
    setRejectReason("");
  };

  const toggleBan = async (u) => {
    const nextBanned = !u.is_banned;
    await supabase.from("users").update({ is_banned: nextBanned }).eq("telegram_id", u.telegram_id);
    setUsers((prev) => prev.map((x) => (x.telegram_id === u.telegram_id ? { ...x, is_banned: nextBanned } : x)));
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />
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
            {t(`admin.${tb === "moderation" ? "moderationQueue" : tb}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-white/40 text-sm py-10 text-center">{t("common.loading")}</div>
        ) : (
          <>
            {tab === "stats" && stats && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  [t("admin.usersToday"), stats.usersToday],
                  [t("admin.activeToday"), stats.activeToday],
                  [t("admin.totalUsers"), stats.totalUsers],
                  [t("admin.totalVacancies"), stats.totalVacancies],
                  [t("admin.pendingModeration"), stats.pendingCount],
                ].map(([label, value]) => (
                  <div key={label} className="bg-base-850 border border-base-700 rounded-xl p-4">
                    <p className="text-2xl font-bold">{value ?? 0}</p>
                    <p className="text-xs text-white/50 mt-1">{label}</p>
                  </div>
                ))}
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

            {tab === "users" && (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <div key={u.telegram_id} className="flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {u.first_name || u.telegram_username || u.telegram_id}
                        {u.is_banned && <span className="ml-2 text-[10px] text-red-400 font-semibold">{t("admin.banned")}</span>}
                      </p>
                      <p className="text-xs text-white/40">@{u.telegram_username || "—"} · {u.telegram_id}</p>
                    </div>
                    <button
                      onClick={() => toggleBan(u)}
                      className={`tap shrink-0 text-xs font-semibold rounded-lg px-3 py-1.5 ${
                        u.is_banned ? "bg-base-800 border border-base-700 text-white/70" : "bg-red-500/90 text-white"
                      }`}
                    >
                      {u.is_banned ? t("admin.unban") : t("admin.ban")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
