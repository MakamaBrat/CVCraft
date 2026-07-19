export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold text-white/90 select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
          <rect x="10" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.4" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 2C10.5 2 12.7 3 14.3 4.6L13 6C11.7 4.7 9.9 4 8 4C6.1 4 4.3 4.7 3 6L1.7 4.6C3.3 3 5.5 2 8 2Z" fill="currentColor" />
          <path d="M8 6.5C9.2 6.5 10.3 7 11.1 7.8L9.8 9.2C9.4 8.8 8.7 8.5 8 8.5C7.3 8.5 6.6 8.8 6.2 9.2L4.9 7.8C5.7 7 6.8 6.5 8 6.5Z" fill="currentColor" />
          <circle cx="8" cy="10.5" r="1.2" fill="currentColor" />
        </svg>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="currentColor" opacity="0.5" />
          <rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor" />
          <rect x="21.5" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
