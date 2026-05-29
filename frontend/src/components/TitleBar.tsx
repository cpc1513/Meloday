import { useEffect, useState } from 'react';

export default function TitleBar() {
  const windowControls = window.melodayWindow;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!windowControls) return;
    windowControls.isMaximized().then(setIsMaximized).catch(() => setIsMaximized(false));
  }, [windowControls]);

  const handleToggleMaximize = async () => {
    if (!windowControls) return;
    const nextState = await windowControls.toggleMaximize();
    setIsMaximized(nextState);
  };

  return (
    <header className="titlebar">
      <div className="titlebar-brand">
        <div className="titlebar-name">Meloday</div>
      </div>

      <div className="titlebar-drag" />

      {windowControls && (
        <div className="titlebar-controls" aria-label="窗口控制">
          <button
            type="button"
            className="titlebar-button"
            aria-label="最小化"
            onClick={() => windowControls.minimize()}
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            className="titlebar-button"
            aria-label={isMaximized ? '还原窗口' : '最大化'}
            onClick={handleToggleMaximize}
          >
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
          <button
            type="button"
            className="titlebar-button titlebar-button-close"
            aria-label="关闭"
            onClick={() => windowControls.close()}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </header>
  );
}

function MinimizeIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="M2.2 6.5h8.6" /></svg>;
}

function MaximizeIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.4" /></svg>;
}

function RestoreIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <path d="M4.2 3.1h5.7v5.7" />
      <rect x="2.9" y="4.4" width="5.7" height="5.7" rx="1.2" />
    </svg>
  );
}

function CloseIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="m3.3 3.3 6.4 6.4M9.7 3.3 3.3 9.7" /></svg>;
}
