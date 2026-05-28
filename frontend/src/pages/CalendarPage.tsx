import { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import DayDetail from '../components/DayDetail';
import PageHeader from '../components/PageHeader';
import type { CalendarDay } from '../types';

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  return (
    <div className="page page-narrow">
      <PageHeader title="日历" subtitle="把每一天的心情，留成一格音乐记忆" />

      <CalendarGrid
        onSelectDay={setSelectedDay}
        selectedDate={selectedDay?.date || null}
      />

      {selectedDay && (
        <DayDetail date={selectedDay.date} />
      )}
    </div>
  );
}
