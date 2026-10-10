// ==================== EXPORT ====================
function exportCSV() {
    const y=S.monthYear, m=S.monthIdx, days=daysIn(y,m);
    let csv='Habitude';
    for(let d=1;d<=days;d++) csv+=`,Jour ${d}`;
    csv+=',Progression %\n';
    for(const h of S.habits) {
        csv+=`"${h.name.replace(/"/g,'""')}"`;
        for(let d=1;d<=days;d++) { const v=getCellVal(h.id,y,m,d); csv+=`,${v===true?'✓':v==='missed'?'✗':''}`; }
        csv+=`,${getHabitPct(h.id,y,m)}%\n`;
    }
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`habitudes_${MONTHS[m]}_${y}.csv`; a.click();
    toast('CSV exporté ✓');
}

function exportJSON() {
    const dataStr = JSON.stringify(S, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde_handy_tracker_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast('Sauvegarde JSON générée ✓');
}

function importJSON(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.habits && !parsed.transactions && !parsed.subscriptions) {
                toast("Fichier invalide !");
                return;
            }
            if (!confirm("Restaurer cette sauvegarde ? Vos donnees actuelles seront remplacees.")) return;
            
            S.habits = parsed.habits || [];
            S.data = parsed.data || {};
            S.moods = parsed.moods || {};
            S.transactions = parsed.transactions || {};
            S.finAccounts = parsed.finAccounts || {cash:0, bank:0, mobile:0};
            S.fin2Accounts = parsed.fin2Accounts || {cash:0, bank:0, mobile:0};
            S.finance2Transactions = parsed.finance2Transactions || {};
            S.fin2Year = parsed.fin2Year || S.finYear;
            S.fin2Month = parsed.fin2Month || S.finMonth;
            S.fin2Type = parsed.fin2Type || 'income';
            S.blurAmounts = parsed.blurAmounts || false;
            S.subscriptions = parsed.subscriptions || [];
            S.subAccountNames = parsed.subAccountNames || {};
            S.calendarChecked = parsed.calendarChecked || {};
            S.calendarEvents = parsed.calendarEvents || {};
            S.fitness = parsed.fitness || { targetWeight: 82, height:1.81, records:{} };
              S.journal = parsed.journal || {};
            
            save();
            updateBlurState();
            renderAll();
            toast("Sauvegarde restauree avec succes !");
        } catch(err) {
            toast("Erreur : fichier JSON invalide !");
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = '';
}
