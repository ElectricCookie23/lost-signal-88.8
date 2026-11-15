const ICONS = {
  Instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  TikTok: "M14 3h3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3z",
  YouTube: "M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8zM10 15V9l5.2 3L10 15z",
};
export function SocialLinks() {
  return (
    <div className="social">
      {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map((k) => (
        <a key={k} href="#" className="social-btn" aria-label={`Lost Signal 88.8 on ${k}`} onClick={(e) => e.preventDefault()}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d={ICONS[k]} fill="currentColor" fillRule="evenodd" /></svg>
        </a>
      ))}
    </div>
  );
}
