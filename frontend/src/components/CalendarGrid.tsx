import { useEffect, useMemo, useState } from 'react';
import { getCalendar } from '../api/client';
import { getEmotionBg, getEmotionBorder, getEmotionText } from '../utils/emotion';
import { formatLocalDate } from '../utils/date';
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
    let cancelled = false;
    getCalendar(year, month).then(data => {
      if (cancelled) return;
      const map: Record<string, CalendarDay> = {};
      data.days.forEach(d => { map[d.date] = d; });
      setEntryDays(map);
    });
    return () => { cancelled = true; };
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
      const dateStr = formatLocalDate(new Date(year, month - 2, d));
      result.push(toCell(dateStr, d, false, entryDays[dateStr]));
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatLocalDate(new Date(year, month - 1, d));
      result.push(toCell(dateStr, d, true, entryDays[dateStr]));
    }

    const remaining = (7 - (result.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatLocalDate(new Date(year, month, d));
      result.push(toCell(dateStr, d, false, entryDays[dateStr]));
    }

    return result;
  }, [year, month, entryDays]);

  const rowCount = Math.ceil(cells.length / 7);

  const goPrev = () => {
    const nextMonth = month === 1 ? 12 : month - 1;
    const nextYear = month === 1 ? year - 1 : year;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const goNext = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const selectDate = (dateStr: string) => {
    const parsed = parseDateParts(dateStr);
    if (!parsed) return;
    setYear(parsed.year);
    setMonth(parsed.month);
    onSelectDay?.(entryDays[dateStr] || toCalendarDay(dateStr));
  };

  const goToday = () => {
    selectDate(formatLocalDate(new Date()));
  };

  const handleClick = (cell: CalendarCell) => {
    onSelectDay?.(cellToCalendarDay(cell));
  };

  return (
    <section className="glass-panel calendar-panel">
      <div className="calendar-header">
        <div>
          <div className="calendar-kicker">MONTH VIEW</div>
          <h2 className="calendar-title">{year} 年 {month} 月</h2>
        </div>
        <div className="calendar-actions">
          <button onClick={goPrev} aria-label="上个月" className="icon-button"><ChevronLeft /></button>
          <button onClick={goNext} aria-label="下个月" className="icon-button"><ChevronRight /></button>
          <label className="calendar-date-input">
            <span>选择日期</span>
            <input
              aria-label="选择日期"
              type="date"
              value={selectedDate || formatLocalDate(now)}
              onChange={event => selectDate(event.target.value)}
            />
          </label>
          <button onClick={goToday} className="ghost-button">今天</button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div
        className={rowCount >= 6 ? 'calendar-cells calendar-cells-six' : 'calendar-cells'}
        style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
      >
        {cells.map(cell => {
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === formatLocalDate(new Date());
          const emotion = cell.emotionKeyword || cell.emotions?.[0] || '';
          return (
            <button
              key={cell.date}
              onClick={() => handleClick(cell)}
              className="calendar-cell"
              style={{
                opacity: cell.isCurrentMonth ? 1 : 0.36,
                background: isSelected ? '#E7E1CF' : isToday ? 'var(--bg-hover)' : 'rgba(255,255,255,0.52)',
                color: 'var(--text-primary)',
                borderColor: isSelected ? '#D5C9A9' : 'var(--border-light)',
                boxShadow: isSelected ? '0 14px 28px rgba(111, 98, 66, 0.12)' : 'none',
              }}
            >
              <span className="calendar-cell-day">{cell.dayOfMonth}</span>

              <span className="calendar-cell-tags">
                {cell.holiday && (
                  <span className="calendar-cell-tag calendar-holiday-tag">
                    {cell.holiday}
                  </span>
                )}
                {emotion && (
                  <span
                    className="calendar-cell-tag"
                    style={{
                      color: isSelected ? '#6F6242' : getEmotionText(emotion),
                      background: isSelected ? 'rgba(255,255,255,0.5)' : getEmotionBg(emotion),
                      borderColor: isSelected ? 'rgba(111,98,66,0.18)' : getEmotionBorder(emotion),
                    }}
                  >
                    {emotion}
                  </span>
                )}
              </span>

              {cell.hasEntry ? (
                <span
                  className="calendar-cover"
                  style={{
                    background: cell.songCover
                      ? `url(${cell.songCover}) center/cover`
                      : cell.emotionColor || getEmotionBg(emotion),
                  }}
                />
              ) : (
                <span className="calendar-empty-dot" style={{ background: isToday ? 'var(--accent)' : 'transparent' }} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function parseDateParts(date: string): { year: number; month: number } | null {
  const [year, month] = date.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function cellToCalendarDay(cell: CalendarCell): CalendarDay {
  return {
    date: cell.date,
    has_entry: cell.hasEntry,
    emotions: cell.emotions,
    song_cover: cell.songCover,
    emotion_color: cell.emotionColor,
    emotion_keyword: cell.emotionKeyword,
    holiday: cell.holiday,
    is_favorite: cell.isFavorite,
  };
}

function toCell(date: string, dayOfMonth: number, isCurrentMonth: boolean, entry?: CalendarDay): CalendarCell {
  return {
    date,
    dayOfMonth,
    isCurrentMonth,
    hasEntry: !!entry?.has_entry,
    emotions: entry?.emotions || null,
    songCover: entry?.song_cover || null,
    emotionColor: entry?.emotion_color || null,
    emotionKeyword: entry?.emotion_keyword || null,
    holiday: entry?.holiday || null,
    isFavorite: Boolean(entry?.is_favorite),
  };
}

function toCalendarDay(date: string): CalendarDay {
  return {
    date,
    has_entry: false,
    emotions: null,
    song_cover: null,
    emotion_color: null,
    emotion_keyword: null,
    holiday: null,
    is_favorite: false,
  };
}

function ChevronLeft() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}

function ChevronRight() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
}
