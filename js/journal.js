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
    renderJournal();
}

function toggleJournalTask(dateStr, index) {
    if (!S.journal || !S.journal[dateStr]) return;
    S.journal[dateStr][index].done = !S.journal[dateStr][index].done;
    save();
    renderJournal();
}

function deleteJournalTask(dateStr, index) {
    if (!S.journal || !S.journal[dateStr]) return;
    if (confirm("Supprimer cette tâche ?")) {
        S.journal[dateStr].splice(index, 1);
        save();
        renderJournal();
    }
}

// Hook into renderAll

function renderAll() {
renderJournal();
    if (S.currentView==='weekly') renderWeekly();
    else if (S.currentView==='calendar') renderCalendar();
    else if (S.currentView==='fitness') renderFitness();
    else if (S.currentView==='monthly') renderMonthly();
    else if (S.currentView==='finance' || S.currentView==='finance2') renderFinance();
    else if (S.currentView==='subscriptions') renderSubscriptions();
}
