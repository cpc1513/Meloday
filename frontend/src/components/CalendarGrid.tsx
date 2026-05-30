import { useState, useEffect, useMemo } from 'react';
import { getCalendar } from '../api/client';
import type { CalendarDay } from '../types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface Props {
  onSelectDay?: (day: CalendarDay) => void;
  selectedDate?: string | null;
}

interface CalendarCell {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  hasEntry: boolean;
  emotions: string[] | null;
  songCover: string | null;
  emotionColor: string | null;
  emotionKeyword: string | null;
  holiday: string | null;
  isFavorite: boolean;
}

export default function CalendarGrid({ onSelectDay, selectedDate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entryDays, setEntryDays] = useState<Record<string, CalendarDay>>({});

  useEffect(() => {
    getCalendar(year, month).then(data => {
      const map: Record<string, CalendarDay> = {};
      data.days.forEach(d => { map[d.date] = d; });
      setEntryDays(map);
    });
  }, [year, month]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const result: CalendarCell[] = [];

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateStr = formatDate(new Date(year, month - 2, d));
      const entry = entryDays[dateStr];
      result.push(toCell(dateStr, d, false, entry));
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDate(new Date(year, month - 1, d));
      const entry = entryDays[dateStr];
      result.push(toCell(dateStr, d, true, entry));
    }

    const remaining = (7 - (result.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatDate(new Date(year, month, d));
      const entry = entryDays[dateStr];
      result.push(toCell(dateStr, d, false, entry));
    }

    return result;
  }, [year, month, entryDays]);

  const goPrev = () => {
    setYear(y => month === 1 ? y - 1 : y);
    setMonth(m => m === 1 ? 12 : m - 1);
  };

  const goNext = () => {
    setYear(y => month === 12 ? y + 1 : y);
    setMonth(m => m === 12 ? 1 : m + 1);
  };

  const goToday = () => {
    const next = new Date();
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  const handleClick = (cell: CalendarCell) => {
    onSelectDay?.({
      date: cell.date,
      has_entry: cell.hasEntry,
      emotions: cell.emotions,
      song_cover: cell.songCover,
      emotion_color: cell.emotionColor,
      emotion_keyword: cell.emotionKeyword,
      holiday: cell.holiday,
      is_favorite: cell.isFavorite,
    });
  };

  return (
    <section className="glass-panel" style={{ borderRadius: 18, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 760, marginBottom: 4 }}>MONTH VIEW</div>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, fontWeight: 760, color: 'var(--text-primary)' }}>
            {year} 年 {month} 月
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={goPrev} aria-label="上个月" className="icon-button"><ChevronLeft /></button>
          <button onClick={goNext} aria-label="下个月" className="icon-button"><ChevronRight /></button>
          <button onClick={goToday} className="ghost-button">今天</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 10, textAlign: 'center' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 760 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(64px, 1fr))', gap: 8 }}>
        {cells.map(cell => {
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === formatDate(new Date());
          return (
            <button
              key={cell.date}
              onClick={() => handleClick(cell)}
              style={{
                aspectRatio: '1 / 0.9',
                minHeight: 68,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                opacity: cell.isCurrentMonth ? 1 : 0.38,
                borderRadius: 14,
                padding: 10,
                background: isSelected ? 'var(--accent-dark)' : isToday ? 'var(--bg-hover)' : 'rgba(255,255,255,0.44)',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${isSelected ? 'var(--accent-dark)' : 'var(--border-light)'}`,
                transition: 'transform 0.16s ease, background 0.16s ease',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 760 }}>
                {cell.dayOfMonth}
              </span>
              {(cell.holiday || cell.emotionKeyword) && (
                <span style={{
                  maxWidth: '100%',
                  fontSize: 10,
                  lineHeight: 1.15,
                  fontWeight: 760,
                  color: isSelected ? 'rgba(255,255,255,0.78)' : 'var(--text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {cell.emotionKeyword || cell.holiday}
                </span>
              )}
              {cell.hasEntry ? (
                <span style={{
                  alignSelf: 'flex-end',
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: cell.songCover ? `url(${cell.songCover}) center/cover` : cell.emotionColor || 'var(--accent-soft)',
                  border: '1px solid rgba(255,255,255,0.72)',
                  boxShadow: '0 8px 16px rgba(37,35,31,0.10)',
                  position: 'relative',
                }} />
              ) : (
                <span style={{
                  alignSelf: 'flex-end',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent)' : 'transparent',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function toCell(date: string, dayOfMonth: number, isCurrentMonth: boolean, entry?: CalendarDay): CalendarCell {
  return {
    date,
    dayOfMonth,
    isCurrentMonth,
    hasEntry: !!entry,
    emotions: entry?.emotions || null,
    songCover: entry?.song_cover || null,
    emotionColor: entry?.emotion_color || null,
    emotionKeyword: entry?.emotion_keyword || null,
    holiday: entry?.holiday || null,
    isFavorite: Boolean(entry?.is_favorite),
  };
}

function ChevronLeft() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}

function ChevronRight() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
