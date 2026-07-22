import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { confirmDialog } from "../lib/telegram.js";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

// Екран "Чорний список" — усі, кого поточний юзер заблокував (незалежно від
// того, чи блокував як роботодавець кандидата, чи навпаки — /api/block GET
// повертає єдиний список для будь-якого напрямку). Дозволяє розблокувати.
export default function BlockedUsers({ onBack }) {
  const { lang, t } = useLanguage();
  const [blocked, setBlocked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await apiFetch("/api/block");
        if (!cancelled) setBlocked(res?.blocked || []);
      } catch (err) {
        console.error("[BlockedUsers] failed to load", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnblock = async (item) => {
    if (unblockingId) return;
    const name = item.firstName || item.telegramUsername || item.telegramId;
    if (!(await confirmDialog(t("block.unblockConfirm", { name })))) return;
    setUnblockingId(item.telegramId);
    try {
      await apiFetch("/api/block", {
        method: "POST",
        body: { action: "unblock", targetTelegramId: item.telegramId },
      });
      setBlocked((prev) => (prev || []).filter((x) => x.telegramId !== item.telegramId));
    } catch (err) {
      console.error("[BlockedUsers] unblock failed", err);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{t("block.blockedListTitle")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-white/40 text-sm py-10 text-center">{t("common.loading")}</div>
        ) : error ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("block.loadFailed")}</p>
          </div>
        ) : !blocked || blocked.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("block.blockedListEmpty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {blocked.map((item) => {
              const displayName = item.firstName || item.telegramUsername || item.telegramId;
              return (
                <div
                  key={item.telegramId}
                  className="flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-base-700 text-white/70 font-semibold text-sm flex items-center justify-center shrink-0">
                    {initials(displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    {item.telegramUsername && (
                      <p className="text-xs text-white/45 truncate">@{item.telegramUsername}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblock(item)}
                    disabled={unblockingId === item.telegramId}
                    className="tap shrink-0 text-[11px] font-medium text-white/60 disabled:text-white/30 border border-base-700 rounded-full px-2.5 py-1"
                  >
                    {unblockingId === item.telegramId ? t("common.loading") : t("block.unblock")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
