// ==================== HELPERS ====================
function monthKey(y,m) { return `${y}-${String(m+1).padStart(2,'0')}`; }
function daysIn(y,m) { return new Date(y,m+1,0).getDate(); }
function genId() { return 'h'+Date.now().toString(36)+'_'+Math.random().toString(36).substr(2,4); }
// Local YYYY-MM-DD (toISOString() is UTC and can be off by one day around midnight)
function localDateStr(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function escHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function setWeekStartFromDate(d) {
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday start
    S.weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
}

function getWeekDates() {
    const dates = [];
    for (let i=0;i<7;i++) {
        const d = new Date(S.weekStart);
        d.setDate(d.getDate()+i);
        dates.push(d);
    }
    return dates;
}

function isToday(d) {
    const t = new Date();
    return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}

function getCellVal(habitId, y, m, d) {
    const k = monthKey(y,m);
    return S.data[k]?.[habitId]?.[d] || null;
}

function setCellVal(habitId, y, m, d, val) {
    const k = monthKey(y,m);
    if (!S.data[k]) S.data[k]={};
    if (!S.data[k][habitId]) S.data[k][habitId]={};
    if (val === null) delete S.data[k][habitId][d];
    else S.data[k][habitId][d] = val;
}

function toggleCell(habitId, y, m, d) {
    pushUndo();
    const cur = getCellVal(habitId,y,m,d);
    if (!cur) setCellVal(habitId,y,m,d,true);
    else if (cur===true) setCellVal(habitId,y,m,d,'missed');
    else setCellVal(habitId,y,m,d,null);
    save();
    renderAll();
}
