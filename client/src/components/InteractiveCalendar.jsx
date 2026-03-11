import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, getDay, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const InteractiveCalendar = ({ selectedDates, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const toggleDate = (dateStr) => {
        if (selectedDates.includes(dateStr)) {
            onChange(selectedDates.filter(d => d !== dateStr));
        } else {
            onChange([...selectedDates, dateStr]);
        }
    };

    const toggleWeekdayInMonth = (dayIndex) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(start);
        const daysInMonth = eachDayOfInterval({ start, end });
        const targetDaysStr = daysInMonth.filter(d => getDay(d) === dayIndex).map(d => format(d, 'yyyy-MM-dd'));

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const toggleWeek = (weekStartDay) => {
        const end = endOfWeek(weekStartDay, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStartDay, end: end });
        
        const targetDaysStr = weekDays
            .filter(d => isSameMonth(d, currentMonth))
            .map(d => format(d, 'yyyy-MM-dd'));

        if(targetDaysStr.length === 0) return;

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const toggleParity = (isEven) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(start);
        const daysInMonth = eachDayOfInterval({ start, end });
        
        const targetDaysStr = daysInMonth.filter(d => {
            const weekNum = getISOWeek(d);
            return isEven ? weekNum % 2 === 0 : weekNum % 2 !== 0;
        }).map(d => format(d, 'yyyy-MM-dd'));

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = [{label: 'Lun', idx: 1}, {label: 'Mar', idx: 2}, {label: 'Mer', idx: 3}, {label: 'Jeu', idx: 4}, {label: 'Ven', idx: 5}, {label: 'Sam', idx: 6}, {label: 'Dim', idx: 0}];

    const weeks = [];
    let currentWeek = [];
    days.forEach((day, i) => {
        currentWeek.push(day);
        if ((i + 1) % 7 === 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={prevMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronLeft/></button>
                    <h3 className="font-black text-car-dark text-lg capitalize w-32 text-center">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</h3>
                    <button type="button" onClick={nextMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronRight/></button>
                </div>
                
                <div className="flex gap-2">
                    <button type="button" onClick={() => toggleParity(true)} className="text-xs font-bold bg-car-purple/10 text-car-purple hover:bg-car-purple hover:text-white px-3 py-1.5 rounded-lg transition-colors">Sem. Paires</button>
                    <button type="button" onClick={() => toggleParity(false)} className="text-xs font-bold bg-car-teal/10 text-car-teal hover:bg-car-teal hover:text-white px-3 py-1.5 rounded-lg transition-colors">Sem. Impaires</button>
                </div>
            </div>
            
            <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-2">
                <div></div>
                {weekDays.map(wd => (
                    <button key={wd.label} type="button" onClick={() => toggleWeekdayInMonth(wd.idx)} className="text-center font-bold text-xs sm:text-sm text-car-blue bg-car-blue/10 hover:bg-car-blue hover:text-white rounded-lg py-2 transition-colors cursor-pointer">{wd.label}</button>
                ))}
            </div>
            
            <div className="space-y-1 sm:space-y-2">
                {weeks.map((week, index) => (
                    <div key={index} className="grid grid-cols-8 gap-1 sm:gap-2">
                        <button type="button" onClick={() => toggleWeek(week[0])} className="aspect-square flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold rounded-xl text-xs transition-colors">W</button>
                        {week.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isSelected = selectedDates.includes(dateStr);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            return (
                                <div key={dateStr} onClick={() => isCurrentMonth && toggleDate(dateStr)}
                                    className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold cursor-pointer transition-all ${!isCurrentMonth ? 'text-slate-300 opacity-30 cursor-not-allowed bg-transparent' : ''} ${isCurrentMonth && !isSelected ? 'bg-slate-50 text-slate-600 hover:bg-slate-200 hover:-translate-y-0.5' : ''} ${isCurrentMonth && isSelected ? 'bg-car-teal text-white shadow-md shadow-car-teal/30 hover:bg-teal-600 hover:scale-105' : ''}`}>
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            
            <div className="mt-4 text-center">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{selectedDates.length} date(s) sélectionnée(s) au total</span>
            </div>
        </div>
    );
};

export default InteractiveCalendar;