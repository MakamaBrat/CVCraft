import { useState } from "react";
import StatusBar from "./StatusBar.jsx";

export default function TelegramGate({ onSubmit }) {
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const cleanId = id.trim();
    if (!cleanId) {
      setError("Вкажіть ваш Telegram ID");
      return;
    }
    const cleanUsername = username.trim().replace(/^@/, "");
    onSubmit({ id: cleanId, username: cleanUsername });
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />
      <div className="flex-1 flex flex-col justify-center px-6 pb-10 fade-up">
        <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M20 2L2 9.5l6 2.2M20 2l-3.5 17-6-4.8M20 2L9.7 12.9m0 0L8 20l2.3-3.7"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-1.5">Вхід через Telegram</h1>
        <p className="text-sm text-white/50 mb-6">
          Схоже, застосунок відкрито поза Telegram. Усередині Telegram Mini App ці дані підтягуються автоматично — тут введіть їх вручну для перевірки.
        </p>

        <label className="block text-sm font-medium text-white/85 mb-1.5">Telegram ID</label>
        <input
          className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500 mb-4"
          placeholder="123456789"
          inputMode="numeric"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setError("");
          }}
        />

        <label className="block text-sm font-medium text-white/85 mb-1.5">
          Нікнейм <span className="text-white/40 font-normal">(необов'язково)</span>
        </label>
        <input
          className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500 mb-1.5"
          placeholder="@ivan_petrenko"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="text-xs text-white/35 mb-6">
          ID можна дізнатись у бота @userinfobot в Telegram.
        </p>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={submit}
          className="tap w-full flex items-center justify-center gap-2 bg-violet-500 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          Продовжити
        </button>
      </div>
    </div>
  );
}
