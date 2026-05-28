interface Props {
  title?: string;
  subtitle?: string;
  showDate?: boolean;
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export default function PageHeader({
  title = 'Meloday·日聆',
  subtitle = '日记 · 音乐 · 你',
  showDate = false,
}: Props) {
  const today = new Date();
  const date = `${today.getFullYear()} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${String(today.getDate()).padStart(2, '0')} 周${weekdays[today.getDay()]}`;

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 20,
      marginBottom: 28,
    }}>
      <div>
        <h1 style={{
          margin: 0,
          color: 'var(--text-primary)',
          fontSize: 34,
          lineHeight: 1.08,
          fontWeight: 760,
          letterSpacing: 0,
        }}>
          {title}
        </h1>
        <p style={{
          marginTop: 8,
          color: 'var(--text-secondary)',
          fontSize: 14,
          fontWeight: 500,
        }}>
          {subtitle}
        </p>
      </div>
      {showDate && (
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 14,
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 650,
          whiteSpace: 'nowrap',
        }}>
          <SunIcon />
          {date}
        </div>
      )}
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B97842" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" fill="#F0C16E" stroke="#B97842" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
