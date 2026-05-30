import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { clearRuntimeCache, getRecentEntries, getSettingsStatus } from '../api/client';
import type { SettingsStatus } from '../types';

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [message, setMessage] = useState('');

  const handleExport = () => {
    getRecentEntries()
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meloday-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage('备份已导出');
      });
  };

  const loadStatus = useCallback((showChecking: boolean) => {
    if (showChecking) setApiStatus('checking');
    getSettingsStatus()
      .then(data => {
        setSettings(data);
        setApiStatus('ok');
      })
      .catch(() => {
        setSettings(null);
        setApiStatus('error');
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadStatus(false), 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  const handleCheckApi = () => {
    loadStatus(true);
  };

  const handleOpenDataDir = async () => {
    try {
      const result = await window.melodayWindow?.openDataDirectory();
      setMessage(result?.ok ? '已打开数据目录' : '只能在 Electron 应用中打开数据目录');
    } catch {
      setMessage('打开数据目录失败');
    }
  };

  const handleClearCache = async () => {
    await clearRuntimeCache();
    setMessage('歌词缓存已清理');
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

        <SettingCard title="DeepSeek 配置" desc={settings?.deepseek_configured ? 'API Key 已配置，生成音乐可正常使用。' : '未检测到 API Key，请在 backend/.env 中配置 DEEPSEEK_API_KEY。'}>
          <div style={{ fontSize: 13, color: settings?.deepseek_configured ? 'var(--accent-green)' : '#B0544A', fontWeight: 760 }}>
            {settings?.deepseek_configured ? '已配置' : '待配置'}
          </div>
        </SettingCard>

        <SettingCard title="音乐源" desc={settings?.music_source_mode || '当前生成歌单使用 QQ 音乐源。'}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 760 }}>
            {settings?.music_source_label || 'QQ 音乐'}
          </div>
        </SettingCard>

        <SettingCard title="数据目录" desc={settings?.database_path || '当前环境暂未返回数据库路径'}>
          <button onClick={handleOpenDataDir} className="ghost-button" style={{ minHeight: 34 }}>
            打开目录
          </button>
        </SettingCard>

        <SettingCard title="运行缓存" desc="清理在线歌词缓存。封面来自网易云 CDN，不会删除你的日记和歌单。">
          <button onClick={handleClearCache} className="ghost-button" style={{ minHeight: 34 }}>
            清理缓存
          </button>
        </SettingCard>

        <SettingCard title="关于" desc="Meloday 音乐日记">
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 700 }}>版本 {settings?.version || '1.0.0'}</div>
        </SettingCard>

        <SettingCard title="外部音乐软件" desc="后续版本会让用户选择网易云、QQ 音乐或其他本地播放器进行连接。">
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 700 }}>规划中</div>
        </SettingCard>

        {message && (
          <div className="glass-panel" style={{ borderRadius: 14, padding: 14, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 650 }}>
            {message}
          </div>
        )}
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
