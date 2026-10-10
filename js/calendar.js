// ==================== CALENDAR VIEW ====================
let calDate = new Date();

function changeCalMonth(dir) {
    calDate.setMonth(calDate.getMonth() + dir);
    renderCalendar();
}

function toggleCalCheck(dateStr) {
    if (!S.calendarChecked) S.calendarChecked = {};
    if (S.calendarChecked[dateStr]) {
        delete S.calendarChecked[dateStr];
    } else {
        S.calendarChecked[dateStr] = true;
    }
    save();
    renderCalendar();
}

function editCalEvent(dateStr, ev) {
    if (ev) ev.stopPropagation();
    if (!S.calendarEvents) S.calendarEvents = {};
    let current = S.calendarEvents[dateStr] || '';
    let newVal = prompt("�v�nement pour le " + dateStr + " :", current);
    if (newVal !== null) {
        if (newVal.trim() === '') {
            delete S.calendarEvents[dateStr];
        } else {
            S.calendarEvents[dateStr] = newVal.trim();
        }
        save();
        renderCalendar();
    }
}

function renderCalendar() {
    const y = calDate.getFullYear();
    const m = calDate.getMonth();
    document.getElementById('calMonthLabel').innerText = MONTHS[m] + ' ' + y;

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    let startDow = firstDay - 1;
    if (startDow === -1) startDow = 6;

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    let html = '';
    const dowNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    for (let d of dowNames) {
        html += `<div class="cal-header">${d}</div>`;
    }

    for (let i = 0; i < startDow; i++) {
        html += `<div class="cal-day empty"></div>`;
    }

    let streak = 0;
    let checkedCount = 0;
    let startDate = new Date(2026, 8, 1); // Sept 1st 2026
    let currentDateForStreak = new Date(today);
    currentDateForStreak.setHours(0,0,0,0);
    
    while (currentDateForStreak >= startDate) {
        let sStr = currentDateForStreak.getFullYear() + '-' + String(currentDateForStreak.getMonth()+1).padStart(2,'0') + '-' + String(currentDateForStreak.getDate()).padStart(2,'0');
        if (S.calendarChecked && S.calendarChecked[sStr]) {
            streak++;
        } else {
            let tStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
            if (sStr !== tStr) break;
        }
        currentDateForStreak.setDate(currentDateForStreak.getDate() - 1);
    }

    if (S.calendarChecked) {
        checkedCount = Object.keys(S.calendarChecked).length;
    }

    document.getElementById('calStats').innerHTML = `?? Cha�ne : <strong>${streak} jours</strong> &nbsp;|&nbsp; ? Total : <strong>${checkedCount} jours</strong>`;

    for (let d = 1; d <= daysInMonth; d++) {
        let dStr = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        let isChecked = S.calendarChecked && S.calendarChecked[dStr];
        let hasEvent = S.calendarEvents && S.calendarEvents[dStr];
        let isToday = (dStr === todayStr);

        let classes = "cal-day";
        if (isChecked) classes += " checked";
        if (isToday) classes += " today";

        html += `<div class="${classes}" onclick="toggleCalCheck('${dStr}')">
            ${hasEvent ? `<div class="cal-event-badge"></div>` : ''}
            <div class="cal-num">${d}</div>
            ${hasEvent ? `<div class="cal-event-text">${escHtml(hasEvent)}</div>` : ''}
            <button class="icon-btn" style="position:absolute; bottom:2px; right:2px; width:20px; height:20px; padding:0; background:transparent; border:none; color:var(--text-secondary); opacity:0.5; z-index:2;" onclick="editCalEvent('${dStr}', event)">
               <span class="material-icons-outlined" style="font-size:12px;">edit</span>
            </button>
        </div>`;
    }

    document.getElementById('calGrid').innerHTML = html;
}
