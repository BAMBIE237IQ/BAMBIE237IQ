// ==================== JOURNAL DE BORD ====================
function initJournalDate() {
    let dateInput = document.getElementById('journalDate');
    if (!dateInput.value) {
        let today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        dateInput.value = (new Date(today - offset)).toISOString().split('T')[0];
    }
}

function changeJournalDate(days) {
    let dateInput = document.getElementById('journalDate');
    if (!dateInput.value) initJournalDate();
    let d = new Date(dateInput.value);
    d.setUTCDate(d.getUTCDate() + days);
    dateInput.value = d.toISOString().split('T')[0];
    renderJournal();
}

function setJournalDateToday() {
    let dateInput = document.getElementById('journalDate');
    let today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    dateInput.value = (new Date(today - offset)).toISOString().split('T')[0];
    renderJournal();
}

function renderJournal() {
    initJournalDate();
    const dateStr = document.getElementById('journalDate').value;
    const listDiv = document.getElementById('journalTaskList');
    listDiv.innerHTML = '';
    
    if (!S.journal) S.journal = {};
    const tasks = S.journal[dateStr] || [];
    
    if (tasks.length === 0) {
        listDiv.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">Aucune tâche pour ce jour. Ajoutez-en une !</div>';
        return;
    }

    tasks.forEach((task, index) => {
        const isDone = task.done;
        const bg = isDone ? 'var(--bg-elevated)' : 'var(--bg-input)';
        const textDecoration = isDone ? 'line-through' : 'none';
        const color = isDone ? 'var(--text-muted)' : 'var(--text-primary)';
        const icon = isDone ? 'check_circle' : 'radio_button_unchecked';
        const iconColor = isDone ? 'var(--accent-teal)' : 'var(--text-secondary)';

        listDiv.innerHTML += `<div style="display:flex; align-items:center; background:${bg}; padding: 12px 15px; border-radius: 12px; border: 1px solid var(--border); gap: 15px;">
            <span class="material-icons-outlined" style="color:${iconColor}; cursor:pointer;" onclick="toggleJournalTask('${dateStr}', ${index})">${icon}</span>
            <span style="flex:1; text-decoration:${textDecoration}; color:${color}; font-size: 15px;">${escHtml(task.text)}</span>
            <span class="material-icons-outlined" style="color:var(--danger); cursor:pointer; opacity: 0.7;" onclick="deleteJournalTask('${dateStr}', ${index})" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">delete</span>
        </div>`;
    });
}

function addJournalTask() {
    const input = document.getElementById('journalNewTask');
    const text = input.value.trim();
    if (!text) return;
    
    const dateStr = document.getElementById('journalDate').value;
    if (!S.journal) S.journal = {};
    if (!S.journal[dateStr]) S.journal[dateStr] = [];
    
    S.journal[dateStr].push({ text: text, done: false });
    input.value = '';
    save();
    renderAll();
}

function toggleJournalTask(dateStr, index) {
    if (!S.journal || !S.journal[dateStr]) return;
    S.journal[dateStr][index].done = !S.journal[dateStr][index].done;
    save();
    renderAll();
}

function deleteJournalTask(dateStr, index) {
    if (!S.journal || !S.journal[dateStr]) return;
    if (confirm("Supprimer cette tâche ?")) {
        S.journal[dateStr].splice(index, 1);
        save();
        renderAll();
    }
}

// ==================== HISTORIQUE DES TO-DO LISTS ====================
let journalHistoryFilter = 'all';
let journalHistoryLimit = 14;

function setJournalHistoryFilter(f) {
    journalHistoryFilter = f;
    journalHistoryLimit = 14;
    document.querySelectorAll('.jh-filters button').forEach(b => b.classList.toggle('active', b.dataset.f === f));
    renderJournalHistory();
}

function journalDayLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d), t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const diff = Math.round((date - today) / 86400000);
    const base = `${DAYS_FULL[date.getDay()]} ${d} ${MONTHS[m - 1].toLowerCase()}${y !== t.getFullYear() ? ' ' + y : ''}`;
    if (diff === 0) return 'Aujourd’hui · ' + base;
    if (diff === -1) return 'Hier · ' + base;
    if (diff === 1) return 'Demain · ' + base;
    return base;
}

function openJournalDay(dateStr) {
    document.getElementById('journalDate').value = dateStr;
    renderJournal();
    const mc = document.querySelector('.main-content'); if (mc) mc.scrollTop = 0;
    window.scrollTo(0, 0);
}

function renderJournalHistory() {
    const box = document.getElementById('journalHistory');
    if (!box) return;
    const j = S.journal || {};
    let days = Object.keys(j).filter(k => Array.isArray(j[k]) && j[k].length).sort().reverse();
    days = days.filter(k => {
        const done = j[k].filter(t => t.done).length;
        if (journalHistoryFilter === 'open') return done < j[k].length;
        if (journalHistoryFilter === 'done') return done === j[k].length;
        return true;
    });
    if (!days.length) {
        box.innerHTML = '<div class="jh-empty">Aucune liste pour ce filtre.</div>';
        return;
    }
    const shown = days.slice(0, journalHistoryLimit);
    box.innerHTML = shown.map(k => {
        const tasks = j[k], done = tasks.filter(t => t.done).length, pct = Math.round(done / tasks.length * 100);
        return `<div class="jh-day">
            <button class="jh-head" onclick="openJournalDay('${k}')" title="Ouvrir ce jour">
                <span class="jh-date">${journalDayLabel(k)}</span>
                <span class="jh-count${done === tasks.length ? ' all' : ''}">${done}/${tasks.length}</span>
            </button>
            <div class="jh-bar"><div style="width:${pct}%"></div></div>
            ${tasks.map((t, i) => `<div class="jh-task${t.done ? ' done' : ''}">
                <button onclick="toggleJournalTask('${k}', ${i})" aria-pressed="${!!t.done}" aria-label="Cocher : ${escAttr(t.text)}"><span class="material-icons-outlined">${t.done ? 'check_circle' : 'radio_button_unchecked'}</span></button>
                <span>${escHtml(t.text)}</span>
            </div>`).join('')}
        </div>`;
    }).join('') + (days.length > shown.length ? `<button class="btn jh-more" onclick="journalHistoryLimit += 14; renderJournalHistory()">Afficher plus (${days.length - shown.length} jours)</button>` : '');
}

// Hook into renderAll

function renderAll() {
renderNotifications();
renderJournal();
    if (S.currentView==='today') renderToday();
    else if (S.currentView==='weekly') renderWeekly();
    else if (S.currentView==='calendar') { renderCalendar(); renderJournalHistory(); }
    else if (S.currentView==='fitness') renderFitness();
    else if (S.currentView==='monthly') renderMonthly();
    else if (S.currentView==='finance' || S.currentView==='finance2') renderFinance();
    else if (S.currentView==='subscriptions') renderSubscriptions();
}
