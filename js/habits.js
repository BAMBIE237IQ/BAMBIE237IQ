// ==================== HABITS CRUD ====================
function addHabit(name, color) {
    S.habits.push({id:genId(), name, color: color||COLORS[S.habits.length%COLORS.length]});
}

function openAddHabitModal() {
    document.getElementById('modalTitle').textContent='Nouvelle habitude';
    document.getElementById('modalInput').value='';
    document.getElementById('modalInput').style.display='';
    document.getElementById('modalDesc').style.display='none';
    document.getElementById('modalConfirm').textContent='Ajouter';
    document.getElementById('modalConfirm').className='modal-btn confirm';
    document.getElementById('modalOverlay').classList.add('active');
    window._modalMode='add';
    setTimeout(()=>document.getElementById('modalInput').focus(),50);
}

function openRenameModal(id) {
    const h=S.habits.find(x=>x.id===id); if(!h) return;
    document.getElementById('modalTitle').textContent='Renommer';
    document.getElementById('modalInput').value=h.name;
    document.getElementById('modalInput').style.display='';
    document.getElementById('modalDesc').style.display='none';
    document.getElementById('modalConfirm').textContent='Renommer';
    document.getElementById('modalConfirm').className='modal-btn confirm';
    document.getElementById('modalOverlay').classList.add('active');
    window._modalMode='rename'; window._renameId=id;
    setTimeout(()=>{document.getElementById('modalInput').focus();document.getElementById('modalInput').select();},50);
}

function confirmClear() {
    document.getElementById('modalTitle').textContent='Tout effacer ?';
    document.getElementById('modalDesc').textContent='Cette action supprimera toutes vos habitudes et données.';
    document.getElementById('modalDesc').style.display='';
    document.getElementById('modalInput').style.display='none';
    document.getElementById('modalConfirm').textContent='Effacer';
    document.getElementById('modalConfirm').className='modal-btn danger';
    document.getElementById('modalOverlay').classList.add('active');
    window._modalMode='clear';
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function confirmModal() {
    if (window._modalMode==='clear') { pushUndo(); S.habits=[]; S.data={}; S.moods={}; S.transactions={}; save(); renderAll(); toast('Données effacées'); closeModal(); return; }
    const v = document.getElementById('modalInput').value.trim(); if(!v) return;
    if (window._modalMode==='add') { pushUndo(); addHabit(v); save(); renderAll(); toast('Habitude ajoutée ✓'); }
    else if (window._modalMode==='rename') { pushUndo(); const h=S.habits.find(x=>x.id===window._renameId); if(h){h.name=v;save();renderAll();toast('Renommée ✓');} }
    closeModal();
}

function deleteHabitById(id) {
    pushUndo();
    S.habits=S.habits.filter(h=>h.id!==id);
    for (const k of Object.keys(S.data)) delete S.data[k][id];
    save(); renderAll(); toast('Habitude supprimée — Ctrl+Z pour annuler');
}

// ==================== CONTEXT MENU ====================
function showCtx(e,id) { e.preventDefault(); e.stopPropagation(); S.ctxHabitId=id;
    const m=document.getElementById('contextMenu');
    m.style.left=Math.min(e.clientX,innerWidth-200)+'px';
    m.style.top=Math.min(e.clientY,innerHeight-200)+'px';
    m.classList.add('active');
}
function hideCtx() { document.getElementById('contextMenu').classList.remove('active'); }
function ctxRename() { hideCtx(); if(S.ctxHabitId) openRenameModal(S.ctxHabitId); }
function ctxDelete() { hideCtx(); if(S.ctxHabitId) deleteHabitById(S.ctxHabitId); }
function ctxMoveUp() { hideCtx(); const i=S.habits.findIndex(h=>h.id===S.ctxHabitId); if(i>0){pushUndo();[S.habits[i-1],S.habits[i]]=[S.habits[i],S.habits[i-1]];save();renderAll();} }
function ctxMoveDown() { hideCtx(); const i=S.habits.findIndex(h=>h.id===S.ctxHabitId); if(i>=0&&i<S.habits.length-1){pushUndo();[S.habits[i+1],S.habits[i]]=[S.habits[i],S.habits[i+1]];save();renderAll();} }

// ==================== MARK ALL TODAY ====================
function markAllToday(done) {
    const t=new Date(); pushUndo();
    const k=monthKey(t.getFullYear(),t.getMonth());
    if(!S.data[k]) S.data[k]={};
    for(const h of S.habits){if(!S.data[k][h.id])S.data[k][h.id]={};if(done)S.data[k][h.id][t.getDate()]=true;else delete S.data[k][h.id][t.getDate()];}
    save(); renderAll(); toast(done?'Tout coché ✓':'Tout décoché');
}

// ==================== STATS ====================
function getHabitPct(id,y,m) {
    const days=daysIn(y,m), t=new Date(), isCur=t.getFullYear()===y&&t.getMonth()===m, max=isCur?t.getDate():days;
    let done=0; for(let d=1;d<=max;d++) if(getCellVal(id,y,m,d)===true) done++;
    return max>0?Math.round(done/max*100):0;
}

function getStreak(id) {
    let streak=0, d=new Date();
    for(let i=0;i<365;i++){
        if(S.data[monthKey(d.getFullYear(),d.getMonth())]?.[id]?.[d.getDate()]===true) { streak++; d.setDate(d.getDate()-1); }
        else break;
    }
    return streak;
}

function getBestStreakAll() {
    let best=0;
    for(const h of S.habits) { const s=getStreak(h.id); if(s>best) best=s; }
    return best;
}

// ==================== RENDER ALL ====================
