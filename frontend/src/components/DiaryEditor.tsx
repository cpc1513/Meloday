interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const prompts = ['一段心情', '一个画面', '一句没说出口的话'];

export default function DiaryEditor({ value, onChange, onSubmit, isLoading }: Props) {
  const hasText = Boolean(value.trim());

  return (
    <section>
      <div className="diary-workbench" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: 18,
        alignItems: 'stretch',
      }}>
        <div className="glass-panel" style={{
          borderRadius: 18,
          padding: 22,
          minHeight: 360,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.2, fontWeight: 750 }}>
                今天的日记
              </h2>
              <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                写下今天，Meloday 会把它变成一张私人歌单。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {prompts.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChange(value ? `${value}\n${item}：` : `${item}：`)}
                  className="ghost-button"
                  style={{ minHeight: 30, padding: '0 10px' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(180deg, rgba(248,245,240,0.84), rgba(255,255,255,0.72))',
            border: '1px solid var(--border-light)',
            borderRadius: 16,
            flex: 1,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
          }}>
            <textarea
              value={value}
              onChange={e => onChange(e.target.value.slice(0, 1000))}
              placeholder="今天发生了什么呢？可以写天气、情绪、某个瞬间，或只是一个很短的念头..."
              style={{
                width: '100%',
                flex: 1,
                minHeight: 220,
                background: 'transparent',
                fontSize: 16,
                lineHeight: 1.8,
                color: 'var(--text-primary)',
                resize: 'none',
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              paddingTop: 14,
              color: 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span>{hasText ? '草稿会自动保存' : '空白也可以慢慢来'}</span>
              <span>{value.length} / 1000</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginTop: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-secondary)', fontSize: 13 }}>
              <WaveMini active={hasText || isLoading} />
              {isLoading ? '正在分析情绪与音乐线索' : '输入后生成今日音乐'}
            </div>
            <button
              onClick={onSubmit}
              disabled={isLoading || !hasText}
              className="primary-button"
            >
              <SparkIcon />
              <span>{isLoading ? '生成中...' : '生成音乐'}</span>
            </button>
          </div>
        </div>

        <aside className="glass-panel diary-insight" style={{
          borderRadius: 18,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 360,
        }}>
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 750, marginBottom: 12 }}>
              TODAY MOOD
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.24, fontWeight: 760, color: 'var(--text-primary)' }}>
              把今天的噪音，整理成一首歌。
            </div>
            <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              Meloday 会根据文字里的情绪、节奏和场景，生成更贴近当下的音乐陪伴。
            </p>
          </div>

          <div style={{
            borderRadius: 16,
            padding: 16,
            background: 'linear-gradient(135deg, #2A2723, #536B82)',
            color: '#fff',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'end', gap: 5, height: 54, marginBottom: 12 }}>
              {Array.from({ length: 22 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: 4,
                    height: `${18 + ((index * 13) % 34)}px`,
                    borderRadius: 999,
                    background: index % 3 === 0 ? '#E8D8C8' : 'rgba(255,255,255,0.64)',
                    animation: hasText || isLoading ? `pulseLine ${0.9 + (index % 5) * 0.12}s ease-in-out infinite` : undefined,
                    animationDelay: `${index * 0.04}s`,
                    transformOrigin: 'bottom',
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.76, fontWeight: 650 }}>预计生成</div>
            <div style={{ marginTop: 3, fontSize: 18, fontWeight: 760 }}>3 首今日歌单</div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2Z" />
      <path d="M19 3v4M21 5h-4M5 17v3M6.5 18.5h-3" />
    </svg>
  );
}

function WaveMini({ active }: { active: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'end', gap: 3, height: 18 }}>
      {[10, 16, 12, 18, 9].map((height, index) => (
        <span
          key={index}
          style={{
            width: 3,
            height,
            borderRadius: 999,
            background: active ? 'var(--accent)' : 'var(--text-tertiary)',
            animation: active ? `pulseLine ${0.8 + index * 0.08}s ease-in-out infinite` : undefined,
            animationDelay: `${index * 0.05}s`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </span>
  );
}
