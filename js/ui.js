// ==================== TOAST ====================
function toast(msg) {
    const c=document.getElementById('toastContainer');
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; c.appendChild(t);
    setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),200);},2500);
}

// ==================== LISTENERS ====================
function setupListeners() {
    document.addEventListener('click',e=>{
        if(!e.target.closest('.context-menu')) hideCtx();
        if(window.innerWidth <= 768 && !e.target.closest('#mainLogo') && !e.target.closest('#mainTabs')) {
            document.getElementById('mainTabs').classList.remove('show');
            const logo = document.getElementById('mainLogo');
            if(logo) logo.classList.remove('menu-open');
        }
    });
    document.getElementById('modalInput').addEventListener('keydown',e=>{if(e.key==='Enter')confirmModal();if(e.key==='Escape')closeModal();});
    document.addEventListener('keydown',e=>{
        if(e.key==='Escape'){closeModal();hideCtx();}
        if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();if(undoStack.length){redoStack.push(JSON.stringify({habits:S.habits,data:S.data,moods:S.moods,transactions:S.transactions,finAccounts:S.finAccounts,blurAmounts:S.blurAmounts}));const p=JSON.parse(undoStack.pop());S.habits=p.habits;S.data=p.data;S.moods=p.moods;S.transactions=p.transactions||{};S.finAccounts=p.finAccounts||{cash:0,bank:0,mobile:0};S.blurAmounts=p.blurAmounts||false;save();updateBlurState();renderAll();toast('Annulé ↩');}}
        if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();if(redoStack.length){undoStack.push(JSON.stringify({habits:S.habits,data:S.data,moods:S.moods,transactions:S.transactions,finAccounts:S.finAccounts,blurAmounts:S.blurAmounts}));const n=JSON.parse(redoStack.pop());S.habits=n.habits;S.data=n.data;S.moods=n.moods;S.transactions=n.transactions||{};S.finAccounts=n.finAccounts||{cash:0,bank:0,mobile:0};S.blurAmounts=n.blurAmounts||false;save();updateBlurState();renderAll();toast('Rétabli ↪');}}
    });
    document.getElementById('modalOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('modalOverlay'))closeModal();});
}
