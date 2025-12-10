import { useMemo, useState, useEffect } from "react";
import Button from "./UI/Button";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function getKey(date) {
    return date.toISOString().slice(0, 10);
}

function toLocalDateKey(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildCalendarDays(reference) {
    const start = startOfMonth(reference);
    const end = endOfMonth(reference);
    const daysInMonth = end.getDate();
    const offset = (start.getDay() + 6) % 7; 
    const cells = [];
    for (let i = 0; i < offset; i += 1) {
        cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(day);
    }
    return cells;
}

export default function SessionMiniCalendar({
    sessions = [],
    selectedDate,
    onSelectDate,
    onMonthChange,
}) {
    const initial = selectedDate ? new Date(selectedDate) : new Date();
    const [visibleDate, setVisibleDate] = useState(
        Number.isNaN(initial.getTime()) ? new Date() : initial
    );

    useEffect(() => {
        if (!selectedDate) {
            return;
        }
        const next = new Date(selectedDate);
        if (!Number.isNaN(next.getTime())) {
            if (next.getMonth() !== visibleDate.getMonth() || next.getFullYear() !== visibleDate.getFullYear()) {
                setVisibleDate(next);
            }
        }
    }, [selectedDate]); 

    const monthLabel = new Intl.DateTimeFormat("es-MX", {
        month: "long",
        year: "numeric",
    }).format(visibleDate);
    const sessionsByDay = useMemo(() => {
        return sessions.reduce((acc, session) => {
            if (!session?.datetime) {
                return acc;
            }
            
            const key = toLocalDateKey(session.datetime); 

            if (!key) {
                return acc;
            }
            
            acc[key] = acc[key] ? acc[key] + 1 : 1;
            return acc;
        }, {});
    }, [sessions]);

    const cells = useMemo(() => buildCalendarDays(visibleDate), [visibleDate]);
    const selectedKey = selectedDate ? getKey(new Date(selectedDate)) : null;

    const handleSelect = (day) => {
        if (!day || !onSelectDate) {
            return;
        }
        const nextDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), day);
        onSelectDate(getKey(nextDate));
    };

    const navigateMonth = (direction) => {
        const next = new Date(visibleDate);
        next.setMonth(visibleDate.getMonth() + direction);
        setVisibleDate(next);
        
        onMonthChange?.(next); 
    };

    return (
        <section className="sessions-mini-calendar">
            <header className="sessions-mini-calendar__header">
                <div>
                    <p className="sessions-mini-calendar__label">Calendario rápido</p>
                    <strong className="sessions-mini-calendar__title">{monthLabel}</strong>
                </div>
                <div className="sessions-mini-calendar__actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth(-1)}
                        aria-label="Mes anterior"
                    >
                        ←
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth(1)}
                        aria-label="Mes siguiente"
                    >
                        →
                    </Button>
                </div>
            </header>
            <div className="sessions-mini-calendar__grid" role="grid">
                {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="sessions-mini-calendar__weekday" role="columnheader">
                        {label}
                    </span>
                ))}
                {cells.map((cell, index) => {
                    if (cell === null) {
                        return <span key={`empty-${index}`} className="sessions-mini-calendar__cell is-empty" aria-hidden="true" />;
                    }
                    const dateKey = getKey(new Date(visibleDate.getFullYear(), visibleDate.getMonth(), cell));
                    
                    const count = sessionsByDay[dateKey] || 0; 
                    
                    const isSelected = selectedKey === dateKey;
                    return (
                        <button
                            key={dateKey}
                            type="button"
                            className={`sessions-mini-calendar__cell${isSelected ? " is-selected" : ""}`}
                            onClick={() => handleSelect(cell)}
                            aria-pressed={isSelected}
                            aria-label={`${cell} de ${monthLabel}${count ? `, ${count} sesiones` : ""}`}
                        >
                            <span>{cell}</span>
                            {count ? <span className="sessions-mini-calendar__dot" aria-hidden="true">{count}</span> : null}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}