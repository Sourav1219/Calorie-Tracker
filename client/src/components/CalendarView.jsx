import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarView({ currentDate, onDateChange, onSelectDate, logs = {} }) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["S","M","T","W","T","F","S"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onDateChange(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const isToday = (day) => day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  const getDateKey = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-background"><ChevronLeft className="w-4 h-4 text-muted" /></button>
        <h3 className="font-bold text-sm text-text">{monthNames[month]} {year}</h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-background"><ChevronRight className="w-4 h-4 text-muted" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d, i) => (<div key={i} className="text-center text-[10px] font-medium text-muted py-1">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const key = day ? getDateKey(day) : null;
          const hasLog = key && logs[key];
          return (
            <button key={i} onClick={() => day && onSelectDate?.(key)} disabled={!day}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs transition-all ${
                !day ? "" : isToday(day) ? "bg-primary text-white font-bold" : hasLog ? "bg-primary/10 text-primary font-medium" : "text-text hover:bg-background"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
