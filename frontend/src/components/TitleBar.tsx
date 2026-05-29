export default function TitleBar() {
  const windowControls = window.melodayWindow;

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
            aria-label="最大化或还原"
            onClick={() => windowControls.toggleMaximize()}
          >
            <MaximizeIcon />
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

function CloseIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="m3.3 3.3 6.4 6.4M9.7 3.3 3.3 9.7" /></svg>;
}
