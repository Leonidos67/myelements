import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, XCircle, Wallet, Lightbulb, Video, CalendarDays } from 'lucide-react';
import { api } from './api';

export default function CalendarView({ videos, ideas, reload, categories }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'

  // Группируем события по дням
  const eventsByDay = useMemo(() => {
    const map = {};
    const addEvent = (dateStr, type, payload) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({ type, payload });
    };

    videos.forEach(v => {
      const pubDate = format(parseISO(v.createdAt), 'yyyy-MM-dd');
      addEvent(pubDate, 'published', v);
      if (v.status === 'paid') addEvent(pubDate, 'paid', v);
      if (v.status === 'rejected') addEvent(pubDate, 'rejected', v);
    });

    ideas.forEach(i => addEvent(i.date, 'idea', i));

    return map;
  }, [videos, ideas]);

  // Логика навигации и расчета дней
  const isMonth = viewMode === 'month';
  const days = useMemo(() => {
    if (isMonth) {
      // Для месяца: с начала месяца по конец
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      // Добиваем до полной сетки (пн-вс), чтобы календарь был ровным
      const gridStart = startOfWeek(start, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    } else {
      // Для недели: с понедельника по воскресенье
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, isMonth]);

  const handlePrev = () => {
    setCurrentDate(isMonth ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const handleNext = () => {
    setCurrentDate(isMonth ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedEvents = eventsByDay[selectedDateStr] || [];

  const titleStr = isMonth 
    ? format(currentDate, 'LLLL yyyy', { locale: ru })
    : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: ru })} — ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ru })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Календарь (левая часть) */}
      <div className="lg:col-span-2 bg-surface border border-line rounded-2xl p-6">
        
        {/* Шапка календаря */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <h2 className="text-lg font-semibold capitalize">
            {titleStr}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Переключатель Месяц/Неделя */}
            <div className="flex bg-elevated border border-line rounded-lg p-1 mr-2">
              <button 
                onClick={() => setViewMode('month')} 
                className={`px-3 py-1 text-xs rounded-md transition-colors ${isMonth ? 'bg-elevated text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                Месяц
              </button>
              <button 
                onClick={() => setViewMode('week')} 
                className={`px-3 py-1 text-xs rounded-md transition-colors ${!isMonth ? 'bg-elevated text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                Неделя
              </button>
            </div>

            <button onClick={handlePrev} className="p-2 bg-elevated rounded-lg hover:bg-elevated"><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 bg-elevated text-xs rounded-lg hover:bg-elevated">Сегодня</button>
            <button onClick={handleNext} className="p-2 bg-elevated rounded-lg hover:bg-elevated"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Сетка */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
            <div key={d} className="text-center text-[10px] text-subtle uppercase py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[dayStr] || [];
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            
            const hasPaid = dayEvents.some(e => e.type === 'paid');
            const hasRejected = dayEvents.some(e => e.type === 'rejected');
            const hasPublished = dayEvents.some(e => e.type === 'published');
            const hasIdea = dayEvents.some(e => e.type === 'idea');

            return (
              <div 
                key={dayStr}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] p-1.5 rounded-lg border cursor-pointer transition-colors flex flex-col gap-1
                  ${isSelected ? 'bg-elevated border-foreground' : 'bg-elevated border-line hover:border-gray-600'}
                  ${isMonth && !isCurrentMonth ? 'opacity-40' : ''}
                `}
              >
                <span className={`text-xs font-mono ${isSelected ? 'text-foreground' : 'text-muted'}`}>{format(day, 'd')}</span>
                
                <div className="flex flex-wrap gap-1 mt-auto">
                  {hasPublished && <div title="Опубликовано" className="w-2 h-2 rounded-full bg-blue-500" />}
                  {hasPaid && <div title="Выплата" className="w-2 h-2 rounded-full bg-green-500" />}
                  {hasRejected && <div title="Отказ" className="w-2 h-2 rounded-full bg-red-500" />}
                  {hasIdea && <div title="Идея" className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Правая часть — детали дня */}
      <div className="bg-surface border border-line rounded-2xl p-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
            <CalendarDays size={16} className="text-muted" />
            {format(selectedDate, 'd MMMM, EEEE', { locale: ru })}
          </h3>
          <button onClick={() => setIsAddOpen(true)} className="p-1.5 bg-primary/10 text-foreground rounded-lg hover:bg-primary/20"><Plus size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {selectedEvents.length === 0 && (
            <div className="text-center text-subtle text-xs py-10">Нет событий. Добавьте идею.</div>
          )}
          
          {selectedEvents.map((ev, idx) => {
            if (ev.type === 'published') {
              return (
                <div key={idx} className="bg-elevated border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><Video size={12} /> Опубликовано</div>
                  <div className="text-xs text-foreground truncate">{ev.payload.title || ev.payload.url}</div>
                </div>
              );
            }
            if (ev.type === 'paid') {
              return (
                <div key={idx} className="bg-elevated border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><Wallet size={12} /> Выплачено</div>
                  <div className="text-xs text-foreground truncate">{ev.payload.title || ev.payload.url}</div>
                  <div className="text-sm font-mono text-green-400 mt-1">+${ev.payload.revenue.toFixed(2)}</div>
                </div>
              );
            }
            if (ev.type === 'rejected') {
              return (
                <div key={idx} className="bg-elevated border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1"><XCircle size={12} /> Отказано</div>
                  <div className="text-xs text-foreground truncate">{ev.payload.title || ev.payload.url}</div>
                </div>
              );
            }
            if (ev.type === 'idea') {
              return (
                <div key={idx} className="bg-elevated border border-foreground/30 rounded-lg p-3 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-foreground text-xs font-medium"><Lightbulb size={12} /> Идея</div>
                    <button onClick={async () => { if(confirm('Удалить?')) { await api.deleteIdea(ev.payload._id); reload(); } }} className="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 transition-opacity"><Trash2 size={12} /></button>
                  </div>
                  <div className="text-xs text-foreground">{ev.payload.title}</div>
                  {ev.payload.notes && <div className="text-[10px] text-subtle mt-1">{ev.payload.notes}</div>}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {isAddOpen && (
        <AddIdeaModal 
          dateStr={selectedDateStr} 
          categories={categories}
          onClose={() => setIsAddOpen(false)} 
          onAdd={() => { setIsAddOpen(false); reload(); }} 
        />
      )}
    </div>
  );
}

function AddIdeaModal({ dateStr, categories, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.addIdea({ title, date: dateStr, notes });
      onAdd();
    } finally { setBusy(false); }
  };

  const inputCls = 'bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground w-full mb-3';

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-surface border border-line rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-line flex justify-between items-center">
          <h2 className="text-sm font-semibold">Новая идея</h2>
          <button type="button" onClick={onClose} className="text-subtle hover:text-foreground">✕</button>
        </div>
        <div className="p-4">
          <label className="text-[10px] text-muted uppercase mb-1 block">Название</label>
          <input className={inputCls} placeholder="Например: Обзор нового скина" value={title} onChange={e => setTitle(e.target.value)} required />
          
          <label className="text-[10px] text-muted uppercase mb-1 block">Заметка (опционально)</label>
          <textarea className={inputCls} rows={3} placeholder="Что нужно сделать?" value={notes} onChange={e => setNotes(e.target.value)} />
          
          <button disabled={busy} className="w-full h-9 mt-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
            {busy ? '...' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}