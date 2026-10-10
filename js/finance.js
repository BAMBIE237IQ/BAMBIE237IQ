// ==================== FINANCE ====================
function toggleBlur() {
    activeS.blurAmounts = !activeS.blurAmounts;
    save();
    updateBlurState();
}

function updateBlurState() {
    const icon = document.getElementById('blurIcon');
    if (activeS.blurAmounts) {
        document.body.classList.add('blur-amounts');
        if (icon) icon.textContent = 'visibility';
    } else {
        document.body.classList.remove('blur-amounts');
        if (icon) icon.textContent = 'visibility_off';
    }
}

function updateInitBals() {
    activeS.finAccounts.cash = parseFloat(document.getElementById('finInitCash').value) || 0;
    activeS.finAccounts.bank = parseFloat(document.getElementById('finInitBank').value) || 0;
    activeS.finAccounts.mobile = parseFloat(document.getElementById('finInitMobile').value) || 0;
    save();
    renderAll();
    toast('Fonds initiaux mis à jour ✓');
}

function getAllTimeTransactions() {
    let all = [];
    for (const k in activeS.transactions) all = all.concat(activeS.transactions[k]);
    return all;
}

function setFinType(type) {
    activeS.finType = type;
    document.getElementById('finTypeIncome').className = 'fin-type-btn' + (type==='income'?' active-income':'');
    document.getElementById('finTypeExpense').className = 'fin-type-btn' + (type==='expense'?' active-expense':'');
}

let editingTxInfo = null;

function addTransaction() {
    const amount = parseFloat(document.getElementById('finAmount').value);
    const label = document.getElementById('finLabel').value.trim();
    const justif = document.getElementById('finJustif').value.trim();
    const dateStr = document.getElementById('finDate').value;
    if (!amount || amount <= 0) { toast('⚠ Entr&eacute;ez un montant valide'); return; }
    if (!label) { toast('⚠ Entr&eacute;ez un libellé'); return; }
    if (!dateStr) { toast('⚠ Sélectionnez une date'); return; }
    pushUndo();
    const d = new Date(dateStr);
    const newMk = monthKey(d.getFullYear(), d.getMonth());

    if (editingTxInfo) {
        const oldMk = editingTxInfo.mk;
        const oldId = editingTxInfo.txId;
        if (activeS.transactions[oldMk]) {
            activeS.transactions[oldMk] = activeS.transactions[oldMk].filter(t => t.id !== oldId);
            if (!activeS.transactions[oldMk].length) delete activeS.transactions[oldMk];
        }
        if (!activeS.transactions[newMk]) activeS.transactions[newMk] = [];
        activeS.transactions[newMk].push({
            id: oldId, type: activeS.finType, amount, label, justification: justif, day: d.getDate(), date: dateStr
        });
        editingTxInfo = null;
        document.getElementById('finSubmitBtn').innerHTML = '<span class="material-icons-outlined">add_circle</span> Ajouter la transaction';
        toast('Transaction mise à jour ✓');
    } else {
        if (!activeS.transactions[newMk]) activeS.transactions[newMk] = [];
        activeS.transactions[newMk].push({
            id: 't'+Date.now().toString(36)+'_'+Math.random().toString(36).substr(2,4),
            type: activeS.finType,
            amount,
            label,
            justification: justif,
            day: d.getDate(),
            date: dateStr
        });
        toast(activeS.finType==='income' ? '💰 Entrée ajoutée ✓' : '💸 Sortie ajoutée ✓');
    }
    
    save();
    // Reset form
    document.getElementById('finAmount').value = '';
    document.getElementById('finLabel').value = '';
    document.getElementById('finJustif').value = '';
    renderAll();
}

function editTransaction(mk, txId) {
    if (!activeS.transactions[mk]) return;
    const tx = activeS.transactions[mk].find(t => t.id === txId);
    if (!tx) return;
    editingTxInfo = { mk, txId };
    setFinType(tx.type);
    document.getElementById('finAmount').value = tx.amount;
    document.getElementById('finLabel').value = tx.label;
    document.getElementById('finJustif').value = tx.justification || '';
    document.getElementById('finDate').value = tx.date;
    
    document.getElementById('finSubmitBtn').innerHTML = '<span class="material-icons-outlined">save</span> Mettre à jour la transaction';
    document.querySelector('.fin-form-card').scrollIntoView({behavior:'smooth'});
}

function deleteTransaction(mk, txId) {
    pushUndo();
    if (activeS.transactions[mk]) {
        activeS.transactions[mk] = activeS.transactions[mk].filter(t => t.id !== txId);
        if (!activeS.transactions[mk].length) delete activeS.transactions[mk];
    }
    if (editingTxInfo && editingTxInfo.txId === txId) {
        editingTxInfo = null;
        document.getElementById('finSubmitBtn').innerHTML = '<span class="material-icons-outlined">add_circle</span> Ajouter la transaction';
    }
    save(); renderAll();
    toast('Transaction supprimée — Ctrl+Z pour annuler');
}

function changeFinMonth(dir) {
    activeS.finMonth += dir;
    if (activeS.finMonth > 11) { activeS.finMonth = 0; activeS.finYear++; }
    if (activeS.finMonth < 0) { activeS.finMonth = 11; activeS.finYear--; }
    renderAll();
}

function goToCurrentFinMonth() {
    const t = new Date();
    activeS.finYear = t.getFullYear();
    activeS.finMonth = t.getMonth();
    renderAll();
}

function getMonthTransactions(y, m) {
    const mk = monthKey(y, m);
    return activeS.transactions[mk] || [];
}

function getWeekTransactions(y, m, weekNum) {
    const txs = getMonthTransactions(y, m);
    return txs.filter(t => {
        const d = new Date(t.date);
        const firstDay = new Date(y, m, 1);
        const dayOfMonth = d.getDate();
        const weekOfMonth = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
        return weekOfMonth === weekNum;
    });
}

function getYearTransactions(y) {
    let all = [];
    for (let m = 0; m < 12; m++) {
        const mk = monthKey(y, m);
        if (activeS.transactions[mk]) all = all.concat(activeS.transactions[mk]);
    }
    return all;
}

function sumTx(txs, type) {
    return txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
}

function formatMoney(n) {
    return n.toLocaleString('fr-FR') + ' FCFA';
}

function formatMoneyShort(n) {
    if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + 'k';
    return n.toLocaleString('fr-FR');
}

function getDayTransactions(y, m, d) {
    const txs = getMonthTransactions(y, m);
    return txs.filter(t => t.day === d);
}

function getWeekNumber(y, m, d) {
    const firstDay = new Date(y, m, 1);
    return Math.ceil((d + firstDay.getDay()) / 7);
}

function getCurrentWeekTransactions(y, m) {
    const today = new Date();
    const wn = getWeekNumber(today.getFullYear(), today.getMonth(), today.getDate());
    if (y === today.getFullYear() && m === today.getMonth()) {
        return getWeekTransactions(y, m, wn);
    }
    // For other months, use the last week of that month
    const days = daysIn(y, m);
    const lastWn = getWeekNumber(y, m, days);
    return getWeekTransactions(y, m, lastWn);
}

function getPrevWeekTransactions(y, m) {
    const today = new Date();
    const wn = getWeekNumber(today.getFullYear(), today.getMonth(), today.getDate());
    if (y === today.getFullYear() && m === today.getMonth()) {
        if (wn > 1) return getWeekTransactions(y, m, wn - 1);
        // Previous week is in previous month
        const pm = m === 0 ? 11 : m - 1;
        const py = m === 0 ? y - 1 : y;
        const prevDays = daysIn(py, pm);
        const prevLastWn = getWeekNumber(py, pm, prevDays);
        return getWeekTransactions(py, pm, prevLastWn);
    }
    const days = daysIn(y, m);
    const lastWn = getWeekNumber(y, m, days);
    if (lastWn > 1) return getWeekTransactions(y, m, lastWn - 1);
    return [];
}

function calcPctChange(current, previous) {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return current > 0 ? 100 : -100;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function buildCompareCard(title, currentLabel, prevLabel, currentBal, prevBal) {
    const diff = currentBal - prevBal;
    const pct = calcPctChange(currentBal, prevBal);
    const isUp = diff > 0;
    const isDown = diff < 0;
    const badgeClass = isUp ? 'up' : isDown ? 'down' : 'neutral';
    const badgeIcon = isUp ? 'arrow_upward' : isDown ? 'arrow_downward' : 'remove';
    const diffClass = isUp ? 'positive' : isDown ? 'negative' : 'zero';
    const curColor = currentBal >= 0 ? 'var(--accent-teal)' : 'var(--accent-pink)';
    const prevColor = prevBal >= 0 ? 'var(--text-secondary)' : 'var(--accent-pink)';

    return `<div class="compare-card">
        <div class="compare-header">
            <span class="compare-period">${title}</span>
            <span class="compare-badge ${badgeClass}">
                <span class="material-icons-outlined">${badgeIcon}</span>
                ${pct >= 0 ? '+' : ''}${pct}%
            </span>
        </div>
        <div class="compare-body">
            <div class="compare-col">
                <div class="compare-col-label">${prevLabel}</div>
                <div class="compare-col-val" style="color:${prevColor}">${formatMoneyShort(prevBal)}</div>
            </div>
            <div class="compare-col">
                <div class="compare-col-label">${currentLabel}</div>
                <div class="compare-col-val" style="color:${curColor}">${formatMoneyShort(currentBal)}</div>
            </div>
        </div>
        <div class="compare-diff">Différence : <strong class="${diffClass}">${diff >= 0 ? '+' : ''}${formatMoney(diff)}</strong></div>
    </div>`;
}

function renderFinComparisons(y, m, txs) {
    const today = new Date();
    let html = '';

    // 1. TODAY vs YESTERDAY
    const todayTxs = getDayTransactions(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTxs = getDayTransactions(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const todayBal = sumTx(todayTxs, 'income') - sumTx(todayTxs, 'expense');
    const yesterdayBal = sumTx(yesterdayTxs, 'income') - sumTx(yesterdayTxs, 'expense');
    html += buildCompareCard('Jour', "Aujourd'hui", 'Hier', todayBal, yesterdayBal);

    // 2. THIS WEEK vs LAST WEEK
    const curWeekTxs = getCurrentWeekTransactions(y, m);
    const prevWeekTxs = getPrevWeekTransactions(y, m);
    const curWeekBal = sumTx(curWeekTxs, 'income') - sumTx(curWeekTxs, 'expense');
    const prevWeekBal = sumTx(prevWeekTxs, 'income') - sumTx(prevWeekTxs, 'expense');
    html += buildCompareCard('Semaine', 'Sem. actuelle', 'Sem. passée', curWeekBal, prevWeekBal);

    // 3. THIS MONTH vs LAST MONTH
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    const prevMonthTxs = getMonthTransactions(prevY, prevM);
    const curMonthBal = sumTx(txs, 'income') - sumTx(txs, 'expense');
    const prevMonthBal = sumTx(prevMonthTxs, 'income') - sumTx(prevMonthTxs, 'expense');
    html += buildCompareCard('Mois', MONTHS[m].substring(0,3), MONTHS[prevM].substring(0,3), curMonthBal, prevMonthBal);

    // 4. THIS YEAR vs LAST YEAR
    const yearTxs = getYearTransactions(y);
    const prevYearTxs = getYearTransactions(y - 1);
    const curYearBal = sumTx(yearTxs, 'income') - sumTx(yearTxs, 'expense');
    const prevYearBal = sumTx(prevYearTxs, 'income') - sumTx(prevYearTxs, 'expense');
    html += buildCompareCard('Année', String(y), String(y - 1), curYearBal, prevYearBal);

    document.getElementById('finCompare').innerHTML = html;
    
}

function drawFinanceCurveChart() {
    const ctx = document.getElementById('financeCurveChart');
    if (!ctx) return;
    
    // Destroy old if exists
    if (window.financeCurveChartInst) {
        window.financeCurveChartInst.destroy();
    }

    // Get last 30 days data
    const labels = [];
    const incomes = [];
    const expenses = [];
    
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        let d = new Date(today);
        d.setDate(d.getDate() - i);
        let y = d.getFullYear();
        let m = d.getMonth();
        let dt = d.getDate();
        labels.push(dt + '/' + (m+1));
        
        let txs = getDayTransactions(y, m, dt);
        incomes.push(sumTx(txs, 'income'));
        expenses.push(sumTx(txs, 'expense'));
    }

    window.financeCurveChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Entrées',
                    data: incomes,
                    borderColor: '#2dd4bf', // Teal
                    backgroundColor: (context) => {
                        const chartCtx = context.chart.ctx;
                        const gradient = chartCtx.createLinearGradient(0, 0, 0, 250);
                        gradient.addColorStop(0, 'rgba(45, 212, 191, 0.4)');
                        gradient.addColorStop(1, 'rgba(45, 212, 191, 0.0)');
                        return gradient;
                    },
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2dd4bf',
                    pointRadius: 0,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Dépenses',
                    data: expenses,
                    borderColor: '#f472b6', // Pink
                    backgroundColor: (context) => {
                        const chartCtx = context.chart.ctx;
                        const gradient = chartCtx.createLinearGradient(0, 0, 0, 250);
                        gradient.addColorStop(0, 'rgba(244, 114, 182, 0.4)');
                        gradient.addColorStop(1, 'rgba(244, 114, 182, 0.0)');
                        return gradient;
                    },
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f472b6',
                    pointRadius: 0,
                    pointHoverRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24,24,27,0.9)',
                    titleColor: '#8b949e',
                    bodyColor: '#e6edf3',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e', maxTicksLimit: 10 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e', callback: v => formatMoneyShort(v) } }
            }
        }
    });
}

function renderFinance() {
    const y = activeS.finYear, m = activeS.finMonth;
    const mk = monthKey(y, m);
    const txs = getMonthTransactions(y, m);
    const yearTxs = getYearTransactions(y);

    // Label
    document.getElementById('finMonthLabel').innerHTML = `${MONTHS[m]}<br><span class="period-sublabel">${y}</span>`;
    document.getElementById('finInitCash').value = activeS.finAccounts.cash || '';
    document.getElementById('finInitBank').value = activeS.finAccounts.bank || '';
    document.getElementById('finInitMobile').value = activeS.finAccounts.mobile || '';

    // Totals
    const mIncome = sumTx(txs, 'income');
    const mExpense = sumTx(txs, 'expense');
    const mBalance = mIncome - mExpense;
    const allTxs = getAllTimeTransactions();
    const globalIncome = sumTx(allTxs, 'income');
    const globalExpense = sumTx(allTxs, 'expense');
    const initialTotal = (activeS.finAccounts.cash || 0) + (activeS.finAccounts.bank || 0) + (activeS.finAccounts.mobile || 0);
    const globalBalance = initialTotal + globalIncome - globalExpense;

    // Stats cards
    document.getElementById('finStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-green-bg)"><span class="material-icons-outlined" style="color:var(--accent-green)">trending_up</span></div>
            <div class="stat-info"><div class="stat-label">Entrées du mois</div><div class="stat-value" style="color:var(--accent-green)">${formatMoney(mIncome)}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-red-bg)"><span class="material-icons-outlined" style="color:var(--accent-red)">trending_down</span></div>
            <div class="stat-info"><div class="stat-label">Sorties du mois</div><div class="stat-value" style="color:var(--accent-red)">${formatMoney(mExpense)}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:${mBalance>=0?'var(--accent-teal-bg)':'var(--accent-pink-bg)'}"><span class="material-icons-outlined" style="color:${mBalance>=0?'var(--accent-teal)':'var(--accent-pink)'}">${mBalance>=0?'account_balance':'money_off'}</span></div>
            <div class="stat-info"><div class="stat-label">Solde mensuel</div><div class="stat-value" style="color:${mBalance>=0?'var(--accent-teal)':'var(--accent-pink)'}">${mBalance>=0?'+':''}${formatMoney(mBalance)}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:${globalBalance>=0?'var(--accent-blue-bg)':'var(--accent-orange-bg)'}"><span class="material-icons-outlined" style="color:${globalBalance>=0?'var(--accent-blue)':'var(--accent-orange)'}">${globalBalance>=0?'savings':'warning'}</span></div>
            <div class="stat-info"><div class="stat-label">Solde Global</div><div class="stat-value" style="color:${globalBalance>=0?'var(--accent-blue)':'var(--accent-orange)'}">${globalBalance>=0?'+':''}${formatMoney(globalBalance)}</div></div>
        </div>
    `;

    // Comparisons
    renderFinComparisons(y, m, txs);

    // Weekly summaries
    const days = daysIn(y, m);
    const firstDow = new Date(y, m, 1).getDay();
    const numWeeks = Math.ceil((days + firstDow) / 7);
    let summaryHTML = '';
    for (let w = 1; w <= numWeeks; w++) {
        const wTxs = getWeekTransactions(y, m, w);
        const wIn = sumTx(wTxs, 'income');
        const wOut = sumTx(wTxs, 'expense');
        const wBal = wIn - wOut;
        summaryHTML += `<div class="fin-summary-card">
            <div class="fin-summary-title">Semaine ${w}</div>
            <div class="fin-summary-row">
                <div class="fin-summary-item"><div class="fin-s-label">Entrées</div><div class="fin-s-val" style="color:var(--accent-green)">${formatMoney(wIn)}</div></div>
                <div class="fin-summary-item"><div class="fin-s-label">Sorties</div><div class="fin-s-val" style="color:var(--accent-red)">${formatMoney(wOut)}</div></div>
                <div class="fin-summary-item"><div class="fin-s-label">Solde</div><div class="fin-s-val" style="color:${wBal>=0?'var(--accent-teal)':'var(--accent-pink)'}">${wBal>=0?'+':''}${formatMoney(wBal)}</div></div>
            </div>
        </div>`;
    }
    document.getElementById('finSummary').innerHTML = summaryHTML;

    // Daily chart
    renderFinDailyChart(y, m, days, txs);
    renderFinPieCharts(txs);

    // Transaction list grouped by day (most recent first)
    const groupedByDay = {};
    for (const tx of txs) {
        if (!groupedByDay[tx.day]) groupedByDay[tx.day] = [];
        groupedByDay[tx.day].push(tx);
    }
    const sortedDays = Object.keys(groupedByDay).map(Number).sort((a,b) => b - a);

    let listHTML = '';
    if (!sortedDays.length) {
        listHTML = `<div class="fin-empty"><span class="material-icons-outlined">receipt_long</span><p>Aucune transaction pour ${MONTHS[m]} ${y}</p><p style="margin-top:8px;color:var(--text-secondary)">Ajoutez votre première entrée ou sortie !</p></div>`;
    } else {
        for (const day of sortedDays) {
            const dayTxs = groupedByDay[day];
            const dayIn = sumTx(dayTxs, 'income');
            const dayOut = sumTx(dayTxs, 'expense');
            const dayBal = dayIn - dayOut;
            const dt = new Date(y, m, day);
            const dayName = DAYS_FULL[dt.getDay()];
            const balClass = dayBal > 0 ? 'positive' : dayBal < 0 ? 'negative' : 'zero';

            listHTML += `<div class="fin-day-group">
                <div class="fin-day-header">
                    <div class="fin-day-header-left">
                        <span class="fin-day-date">${dayName} ${day} ${MONTHS[m]}</span>
                        <span class="fin-day-badge">${dayTxs.length} transaction${dayTxs.length>1?'s':''}</span>
                    </div>
                    <span class="fin-day-total ${balClass}">${dayBal>=0?'+':''}${formatMoney(dayBal)}</span>
                </div>
                <div class="fin-tx-list">`;

            for (const tx of dayTxs) {
                const isIncome = tx.type === 'income';
                listHTML += `<div class="fin-tx-item">
                    <div class="fin-tx-icon ${tx.type}">
                        <span class="material-icons-outlined">${isIncome?'arrow_upward':'arrow_downward'}</span>
                    </div>
                    <div class="fin-tx-info">
                        <div class="fin-tx-label">${escHtml(tx.label)}</div>
                        ${tx.justification ? `<div class="fin-tx-desc">📝 ${escHtml(tx.justification)}</div>` : ''}
                    </div>
                    <span class="fin-tx-amount ${tx.type}">${isIncome?'+':'-'}${formatMoney(tx.amount)}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="material-icons-outlined fin-tx-delete" title="Modifier" onclick="editTransaction('${mk}','${tx.id}')">edit</span>
                        <span class="material-icons-outlined fin-tx-delete" title="Supprimer" onclick="deleteTransaction('${mk}','${tx.id}')">close</span>
                    </div>
                </div>`;
            }
            listHTML += '</div></div>';
        }
    }
    document.getElementById('finTransactions').innerHTML = listHTML;
}

function renderFinDailyChart(y, m, days, txs) {
    if (charts.finDaily) charts.finDaily.destroy();
    const labels = [], incData = [], expData = [], balData = [];
    for (let d = 1; d <= days; d++) {
        labels.push(d);
        const dayTxs = txs.filter(t => t.day === d);
        const inc = sumTx(dayTxs, 'income');
        const exp = sumTx(dayTxs, 'expense');
        incData.push(inc);
        expData.push(-exp);
        balData.push(inc - exp);
    }
    const ctx = document.getElementById('finDailyChart').getContext('2d');
    charts.finDaily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Entrées', data: incData, backgroundColor: 'rgba(52,211,153,.6)', borderRadius: 3, barPercentage: 0.6 },
                { label: 'Sorties', data: expData, backgroundColor: 'rgba(248,113,113,.6)', borderRadius: 3, barPercentage: 0.6 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8b949e', font: { size: 10 }, usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8b949e', font: { size: 9 } } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8b949e', font: { size: 9 }, callback: v => (v/1000)+'k' } }
            }
        }
    });
}

function renderFinPieCharts(txs) {
    if (charts.finPieExp) charts.finPieExp.destroy();
    if (charts.finPieInc) charts.finPieInc.destroy();
    
    const expByLabel = {};
    const incByLabel = {};
    
    for (const tx of txs) {
        if (tx.type === 'expense') {
            expByLabel[tx.label] = (expByLabel[tx.label] || 0) + tx.amount;
        } else if (tx.type === 'income') {
            incByLabel[tx.label] = (incByLabel[tx.label] || 0) + tx.amount;
        }
    }
    
    const pieColors = ['#f472b6','#a78bfa','#60a5fa','#2dd4bf','#fbbf24','#fb923c','#f87171','#34d399'];
    
    function drawPie(canvasId, chartKey, dataObj, emptyText) {
        const labels = Object.keys(dataObj);
        const data = Object.values(dataObj);
        const ctx = document.getElementById(canvasId);
        if(!ctx) return;
        
        if (!labels.length) {
            charts[chartKey] = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: { labels: [emptyText], datasets: [{ data: [1], backgroundColor: ['#1e2538'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
            });
            return;
        }
        
        charts[chartKey] = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: pieColors.slice(0, labels.length), borderWidth: 0, borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { 
                legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 9 }, usePointStyle: true, pointStyle: 'circle', padding: 8 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ' : ';
                            }
                            let val = context.raw || 0;
                            let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            let percentage = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                            return label + val + ' (' + percentage + ')';
                        }
                    }
                }
            }
            }
        });
    }
    
    drawPie('finPieExpense', 'finPieExp', expByLabel, 'Aucune sortie');
    drawPie('finPieIncome', 'finPieInc', incByLabel, 'Aucune entr�e');
}
