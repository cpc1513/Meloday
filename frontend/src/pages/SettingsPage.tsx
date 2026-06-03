import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { clearRuntimeCache, deleteApiKey, getRecentEntries, getSettingsStatus, setApiKey } from '../api/client';
import { formatLocalDate } from '../utils/date';
import type { SettingsStatus } from '../types';

const GITHUB_REPO_URL = 'https://github.com/cpc1513/Meloday';

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [message, setMessage] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);

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

  const handleExport = () => {
    getRecentEntries()
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meloday-backup-${formatLocalDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage('备份已导出');
      });
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      await setApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      setMessage('API Key 已保存，当前会优先使用自有 Key');
      loadStatus(true);
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setRemovingKey(true);
    try {
      await deleteApiKey();
      setMessage('已移除自有 Key，后续会切回官方云端免费额度');
      loadStatus(true);
    } catch {
      setMessage('移除失败，请稍后重试');
    } finally {
      setRemovingKey(false);
    }
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

  const generationLeft = settings?.generation_left ?? 0;
  const generationLimit = settings?.generation_limit ?? 365;
  const quotaLabel = `剩余生成次数 ${generationLeft} / ${generationLimit}`;
  const providerInfo = getProviderInfo(settings);

  return (
    <div className="page page-narrow">
      <PageHeader title="设置" subtitle="管理你的 Meloday" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SettingCard title="数据导出" desc="将所有日记和歌单导出为 JSON 文件">
          <button onClick={handleExport} className="primary-button" style={{ minHeight: 36, borderRadius: 10 }}>
            导出备份
          </button>
        </SettingCard>

        <SettingCard title="服务状态" desc="检查本地后端服务与云端 AI 网关是否正常运行">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatusDot status={apiStatus} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 650 }}>
              {apiStatus === 'ok' ? '本地服务正常' : apiStatus === 'error' ? '本地连接失败' : '检测中...'}
            </span>
            <span style={{ fontSize: 12, color: settings?.cloud_ai_available ? 'var(--accent-green)' : '#B0544A', fontWeight: 700 }}>
              {settings?.cloud_ai_available ? '云端 AI 可用' : '云端 AI 未连接'}
            </span>
            <button onClick={() => loadStatus(true)} className="ghost-button" style={{ minHeight: 30, padding: '0 11px' }}>
              刷新
            </button>
          </div>
        </SettingCard>

        <SettingCard title="DeepSeek 配置" desc={providerInfo.desc}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ fontSize: 13, color: providerInfo.color, fontWeight: 760 }}>
              {providerInfo.label}
            </div>
            {settings?.ai_provider !== 'user_key' && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700 }}>
                {quotaLabel}
              </div>
            )}
            {settings?.device_id && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 650, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                设备 ID：{settings.device_id}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <input
                type="password"
                placeholder="输入你的 DeepSeek API Key"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  width: 240,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSaveApiKey}
                disabled={savingKey || !apiKeyInput.trim()}
                className="primary-button"
                style={{ minHeight: 30, padding: '0 14px', borderRadius: 8, fontSize: 12, opacity: savingKey ? 0.6 : 1 }}
              >
                {savingKey ? '保存中...' : '保存'}
              </button>
              {settings?.ai_provider === 'user_key' && (
                <button
                  onClick={handleRemoveApiKey}
                  disabled={removingKey}
                  className="ghost-button"
                  style={{ minHeight: 30, padding: '0 14px', borderRadius: 8, fontSize: 12, opacity: removingKey ? 0.6 : 1 }}
                >
                  {removingKey ? '移除中...' : '移除自有 Key'}
                </button>
              )}
            </div>
          </div>
        </SettingCard>

        <SettingCard title="数据目录" desc={settings?.database_path || '当前环境暂未返回数据库路径'}>
          <button onClick={handleOpenDataDir} className="ghost-button" style={{ minHeight: 34 }}>
            打开目录
          </button>
        </SettingCard>

        <SettingCard title="运行缓存" desc="清理在线歌词缓存，不会删除你的日记和歌单">
          <button onClick={handleClearCache} className="ghost-button" style={{ minHeight: 34 }}>
            清理缓存
          </button>
        </SettingCard>

        <SettingCard title="关于" desc="Meloday 音乐日记">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 700 }}>
            <span>版本 {settings?.version || '1.0.6'}</span>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>
              GitHub 仓库
            </a>
          </div>
        </SettingCard>

        <SettingCard title="外部音乐软件连接" desc="后续版本会探索与本地播放器或外部音乐服务连接">
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

function StatusDot({ status }: { status: 'checking' | 'ok' | 'error' }) {
  return (
    <span style={{
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: status === 'ok' ? 'var(--accent-green)' : status === 'error' ? '#B0544A' : '#C79A4F',
      boxShadow: status === 'checking' ? '0 0 0 4px rgba(199,154,79,0.14)' : 'none',
    }} />
  );
}

function getProviderInfo(settings: SettingsStatus | null) {
  if (!settings) {
    return {
      label: '检测中...',
      desc: '正在读取 DeepSeek 配置状态',
      color: 'var(--text-tertiary)',
    };
  }
  if (settings.ai_provider === 'user_key') {
    return {
      label: '正在使用自有 DeepSeek API Key',
      desc: '本机已保存自有 Key，生成时会优先使用它，不消耗官方云端免费额度。',
      color: 'var(--accent-green)',
    };
  }
  if (settings.ai_provider === 'cloud' || settings.ai_provider === 'proxy') {
    return {
      label: '官方云端免费额度',
      desc: `当前使用 Meloday 云端 AI 网关，剩余生成次数 ${settings.generation_left} / ${settings.generation_limit}。`,
      color: 'var(--accent-green)',
    };
  }
  return {
    label: '官方云端额度不可用',
    desc: '当前无法连接官方云端 AI 网关，请稍后重试，或配置你自己的 DeepSeek API Key。',
    color: '#B0544A',
  };
}

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel" style={{ borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, marginBottom: 5, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 760, color: 'var(--text-primary)' }}>{title}</div>
        {children}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>
    </section>
  );
}
