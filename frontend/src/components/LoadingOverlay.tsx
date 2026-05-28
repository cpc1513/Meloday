interface Props {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = '正在分析情绪，并为今天挑选旋律...' }: Props) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      background: 'rgba(245, 242, 238, 0.76)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    }}>
      <div className="glass-panel" style={{
        borderRadius: 22,
        padding: '24px 28px',
        minWidth: 290,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        <WaveSpinner />
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 650 }}>
          {message}
        </div>
      </div>
    </div>
  );
}

function WaveSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 5, height: 38 }}>
      {[18, 30, 24, 36, 22, 28, 16].map((height, index) => (
        <span
          key={index}
          style={{
            width: 5,
            height,
            borderRadius: 999,
            background: index % 2 ? 'var(--accent)' : 'var(--accent-dark)',
            animation: `pulseLine ${0.72 + index * 0.06}s ease-in-out infinite`,
            animationDelay: `${index * 0.05}s`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
