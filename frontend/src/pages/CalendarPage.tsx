import { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import DayDetail from '../components/DayDetail';
import PageHeader from '../components/PageHeader';
import { formatLocalDate } from '../utils/date';
import type { CalendarDay } from '../types';

function todayAsCalendarDay(): CalendarDay {
  return {
    date: formatLocalDate(new Date()),
    has_entry: false,
    emotions: null,
    song_cover: null,
    emotion_color: null,
    emotion_keyword: null,
    holiday: null,
    is_favorite: false,
  };
}

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState<CalendarDay>(() => todayAsCalendarDay());

  return (
    <div className="page calendar-page">
      <PageHeader title="日历" subtitle="把每一天的心情，留成一格音乐记忆" />

      <div className="calendar-page-grid">
        <CalendarGrid
          onSelectDay={setSelectedDay}
          selectedDate={selectedDay.date}
        />

        <DayDetail date={selectedDay.date} />
      </div>
    </div>
  );
}
