import { useState } from 'react';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const handleExport = () => {
    fetch('http://localhost:3000/api/entries/recent')
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meloday-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const handleCheckApi = () => {
    setApiStatus('checking');
    fetch('http://localhost:3000/api/health')
      .then(r => r.ok ? setApiStatus('ok') : setApiStatus('error'))
      .catch(() => setApiStatus('error'));
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="设置" subtitle="管理你的 Meloday" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SettingCard title="数据导出" desc="将所有日记和歌单导出为 JSON 文件">
          <button onClick={handleExport} className="primary-button" style={{ minHeight: 36, borderRadius: 10 }}>
            导出备份
          </button>
        </SettingCard>

        <SettingCard title="服务状态" desc="检查后端服务是否正常运行">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: apiStatus === 'ok' ? 'var(--accent-green)' : apiStatus === 'error' ? '#B0544A' : '#C79A4F',
              boxShadow: apiStatus === 'checking' ? '0 0 0 4px rgba(199,154,79,0.14)' : 'none',
            }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 650 }}>
              {apiStatus === 'ok' ? '运行正常' : apiStatus === 'error' ? '连接失败' : '检测中...'}
            </span>
            <button onClick={handleCheckApi} className="ghost-button" style={{ minHeight: 30, padding: '0 11px' }}>
              刷新
            </button>
          </div>
        </SettingCard>

        <SettingCard title="关于" desc="Meloday 音乐日记">
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 700 }}>版本 1.0.0</div>
        </SettingCard>
      </div>
    </div>
  );
}

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel" style={{ borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, marginBottom: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 760, color: 'var(--text-primary)' }}>{title}</div>
        {children}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>
    </section>
  );
}
