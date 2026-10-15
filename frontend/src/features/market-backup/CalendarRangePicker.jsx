import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function displayFormatted(str) {
  const d = parseDate(str);
  if (!d) return str || '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function CalendarRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickingTarget, setPickingTarget] = useState('start'); // 'start' | 'end'
  const [hoverDate, setHoverDate] = useState(null);

  // Calendar month/year navigation state
  const initialDate = parseDate(endDate) || parseDate(startDate) || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef(null);

  const parsedStart = parseDate(startDate);
  const parsedEnd = parseDate(endDate);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate days for viewMonth / viewYear
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(viewYear, viewMonth - 1, dayNum);
    calendarDays.push({
      date: dateObj,
      dayNum,
      isCurrentMonth: false,
      dateStr: formatDate(dateObj),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(viewYear, viewMonth, i);
    calendarDays.push({
      date: dateObj,
      dayNum: i,
      isCurrentMonth: true,
      dateStr: formatDate(dateObj),
    });
  }

  // Next month leading days (to complete week rows)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const dateObj = new Date(viewYear, viewMonth + 1, i);
    calendarDays.push({
      date: dateObj,
      dayNum: i,
      isCurrentMonth: false,
      dateStr: formatDate(dateObj),
    });
  }

  // Handle day click
  const handleDayClick = (dateStr) => {
    const clickedDate = parseDate(dateStr);
    if (!clickedDate) return;

    if (pickingTarget === 'start') {
      onStartDateChange(dateStr);
      if (parsedEnd && clickedDate > parsedEnd) {
        onEndDateChange(dateStr);
      }
      setPickingTarget('end');
    } else {
      if (parsedStart && clickedDate < parsedStart) {
        onEndDateChange(startDate);
        onStartDateChange(dateStr);
      } else {
        onEndDateChange(dateStr);
      }
      setPickingTarget('start');
    }
  };

  // Presets
  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
    setViewYear(end.getFullYear());
    setViewMonth(end.getMonth());
  };

  const applyYTD = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
    setViewYear(end.getFullYear());
    setViewMonth(end.getMonth());
  };

  // Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  const handleStartFieldClick = () => {
    if (isOpen && pickingTarget === 'start') {
      setIsOpen(false);
    } else {
      setPickingTarget('start');
      if (parsedStart) {
        setViewYear(parsedStart.getFullYear());
        setViewMonth(parsedStart.getMonth());
      }
      setIsOpen(true);
    }
  };

  const handleEndFieldClick = () => {
    if (isOpen && pickingTarget === 'end') {
      setIsOpen(false);
    } else {
      setPickingTarget('end');
      if (parsedEnd) {
        setViewYear(parsedEnd.getFullYear());
        setViewMonth(parsedEnd.getMonth());
      }
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', marginBottom: '4px' }}>
      {/* Date Input Boxes Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Start Date Field */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px', fontWeight: 600 }}>
            START DATE
          </label>
          <div
            id="market-backup-start-date-input"
            onClick={handleStartFieldClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card, rgba(15, 23, 42, 0.6))',
              border: '1px solid',
              borderColor: isOpen && pickingTarget === 'start' ? '#38bdf8' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
              color: 'var(--text-primary, #ffffff)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isOpen && pickingTarget === 'start' ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color={isOpen && pickingTarget === 'start' ? '#38bdf8' : '#94a3b8'} />
              <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {displayFormatted(startDate) || 'Select start date'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748b)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 5px', borderRadius: '4px' }}>
                {startDate}
              </span>
              {isOpen && pickingTarget === 'start' ? (
                <ChevronUp size={14} color="#38bdf8" />
              ) : (
                <ChevronDown size={14} color="#64748b" />
              )}
            </div>
          </div>
        </div>

        {/* End Date Field */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px', fontWeight: 600 }}>
            END DATE
          </label>
          <div
            id="market-backup-end-date-input"
            onClick={handleEndFieldClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card, rgba(15, 23, 42, 0.6))',
              border: '1px solid',
              borderColor: isOpen && pickingTarget === 'end' ? '#38bdf8' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
              color: 'var(--text-primary, #ffffff)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isOpen && pickingTarget === 'end' ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color={isOpen && pickingTarget === 'end' ? '#38bdf8' : '#94a3b8'} />
              <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {displayFormatted(endDate) || 'Select end date'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748b)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 5px', borderRadius: '4px' }}>
                {endDate}
              </span>
              {isOpen && pickingTarget === 'end' ? (
                <ChevronUp size={14} color="#38bdf8" />
              ) : (
                <ChevronDown size={14} color="#64748b" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Accordion (In-flow, never clipped) */}
      {isOpen && (
        <div
          id="calendar-range-popover"
          style={{
            marginTop: '12px',
            background: 'var(--bg-card, #0b0f19)',
            border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
            padding: '14px 16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Quick Presets Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginRight: '4px' }}>
              PRESETS:
            </span>
            {[
              { label: 'Today', action: () => applyPreset(0) },
              { label: 'Last 7D', action: () => applyPreset(7) },
              { label: 'Last 30D', action: () => applyPreset(30) },
              { label: 'Last 90D', action: () => applyPreset(90) },
              { label: 'YTD', action: applyYTD },
              { label: '1 Year', action: () => applyPreset(365) },
            ].map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={p.action}
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month & Year Navigation Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                borderRadius: '6px',
                padding: '4px 8px',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Previous Month"
            >
              <ChevronLeft size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                style={{
                  background: 'var(--bg-surface-elevated, #1e293b)',
                  color: 'var(--text-primary, #ffffff)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                style={{
                  background: 'var(--bg-surface-elevated, #1e293b)',
                  color: 'var(--text-primary, #ffffff)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                borderRadius: '6px',
                padding: '4px 8px',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Next Month"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
            {DAYS_SHORT.map((d, idx) => (
              <span
                key={d}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: idx === 0 || idx === 6 ? '#f43f5e' : 'var(--text-muted, #64748b)',
                  padding: '3px 0',
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calendarDays.map(({ date, dayNum, isCurrentMonth, dateStr }, idx) => {
              const isStart = dateStr === startDate;
              const isEnd = dateStr === endDate;
              const dateObj = parseDate(dateStr);
              const isInRange = parsedStart && parsedEnd && dateObj >= parsedStart && dateObj <= parsedEnd;
              const isHovered = pickingTarget === 'end' && parsedStart && hoverDate && dateObj >= parsedStart && dateObj <= hoverDate;

              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateObj)}
                  style={{
                    height: '30px',
                    width: '100%',
                    border: 'none',
                    borderRadius: isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : '4px',
                    background: isStart || isEnd
                      ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                      : (isInRange || isHovered)
                      ? 'rgba(56, 189, 248, 0.18)'
                      : 'transparent',
                    color: isStart || isEnd
                      ? '#ffffff'
                      : !isCurrentMonth
                      ? 'var(--text-disabled, #475569)'
                      : isWeekend
                      ? '#f87171'
                      : 'var(--text-primary, #ffffff)',
                    fontSize: '0.78rem',
                    fontWeight: isStart || isEnd ? 800 : isCurrentMonth ? 500 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.1s ease',
                  }}
                  title={dateStr}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Target Switcher & Done Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Target:
              </span>
              <button
                type="button"
                onClick={() => setPickingTarget('start')}
                style={{
                  background: pickingTarget === 'start' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: '1px solid',
                  borderColor: pickingTarget === 'start' ? '#38bdf8' : 'var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: pickingTarget === 'start' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Date
              </button>
              <button
                type="button"
                onClick={() => setPickingTarget('end')}
                style={{
                  background: pickingTarget === 'end' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: '1px solid',
                  borderColor: pickingTarget === 'end' ? '#38bdf8' : 'var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: pickingTarget === 'end' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                End Date
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 14px',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={13} />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
