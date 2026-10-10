// ==================== WEEKLY VIEW ====================
function renderWeekly() {
    const dates = getWeekDates();
    const startDay = dates[0];

    // Week label
    document.getElementById('weekLabel').innerHTML = `Semaine du ${startDay.getDate()} ${MONTHS[startDay.getMonth()]}<br><span class="period-sublabel">${startDay.getFullYear()}</span>`;

    // Stats
    let totalDone=0, totalCells=0, totalMissed=0;
    for(const d of dates) {
        if(d>new Date()) continue;
        for(const h of S.habits) {
            totalCells++;
            const v=getCellVal(h.id,d.getFullYear(),d.getMonth(),d.getDate());
            if(v===true) totalDone++;
            if(v==='missed') totalMissed++;
        }
    }
    const weekPct = totalCells>0?Math.round(totalDone/totalCells*100):0;

    document.getElementById('weeklyStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-teal-bg)"><span class="material-icons-outlined" style="color:var(--accent-teal)">check_circle</span></div>
            <div class="stat-info"><div class="stat-label">Complétées</div><div class="stat-value" style="color:var(--accent-teal)">${totalDone}</div><div class="stat-sub">sur ${totalCells} total</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-pink-bg)"><span class="material-icons-outlined" style="color:var(--accent-pink)">cancel</span></div>
            <div class="stat-info"><div class="stat-label">Manquées</div><div class="stat-value" style="color:var(--accent-pink)">${totalMissed}</div><div class="stat-sub">cette semaine</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-blue-bg)"><span class="material-icons-outlined" style="color:var(--accent-blue)">trending_up</span></div>
            <div class="stat-info"><div class="stat-label">Progression</div><div class="stat-value" style="color:var(--accent-blue)">${weekPct}%</div><div class="stat-sub">de la semaine</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-yellow-bg)"><span class="material-icons-outlined" style="color:var(--accent-yellow)">local_fire_department</span></div>
            <div class="stat-info"><div class="stat-label">Meilleure Série</div><div class="stat-value" style="color:var(--accent-yellow)">${getBestStreakAll()}</div><div class="stat-sub">jours consécutifs</div></div>
        </div>
    `;

    // Overall donut
    renderOverallDonut(weekPct);

    // Overall bars
    let barsHTML = '';
    for (const h of S.habits) {
        let done=0, total=0;
        for(const d of dates) { if(d>new Date()) continue; total++; if(getCellVal(h.id,d.getFullYear(),d.getMonth(),d.getDate())===true) done++; }
        const pct = total>0?Math.round(done/total*100):0;
        barsHTML += `<div class="bar-item">
            <span class="bar-label">${escHtml(h.name).substring(0,10)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${COLOR_HEX[h.color]}"></div></div>
            <span class="bar-value" style="color:${COLOR_HEX[h.color]}">${pct}%</span>
        </div>`;
    }
    document.getElementById('overallBars').innerHTML = barsHTML;
    document.getElementById('overallPct').textContent = weekPct+'%';

    // Mindset chart
    renderMindsetChart(dates);

    // Weekly day cards
    let gridHTML = '';
    for (const d of dates) {
        const isTd = isToday(d);
        const isFuture = d > new Date();
        let dayDone=0;

        gridHTML += `<div class="day-card${isTd?' today':''}">
            <div class="day-card-header">
                <span class="day-name">${DAYS_FULL[d.getDay()]}</span>
                <span class="day-date">${d.getDate()}/${d.getMonth()+1}</span>
            </div>`;

        // Day donut
        let dTotal=S.habits.length, dDone=0;
        if(!isFuture) { for(const h of S.habits) if(getCellVal(h.id,d.getFullYear(),d.getMonth(),d.getDate())===true) dDone++; }
        const dPct = (!isFuture&&dTotal>0)?Math.round(dDone/dTotal*100):0;
        const donutColor = dPct>=80?'var(--accent-teal)':dPct>=50?'var(--accent-yellow)':'var(--accent-pink)';

        gridHTML += `<div class="day-donut">
            <svg viewBox="0 0 36 36" width="60" height="60">
                <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--bg-elevated)" stroke-width="3"/>
                <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="${donutColor}" stroke-width="3" stroke-dasharray="${dPct}, 100" stroke-linecap="round" style="transition:stroke-dasharray 600ms ease"/>
            </svg>
            <div class="day-donut-center" style="color:${donutColor}">${dPct}%</div>
        </div>`;

        // Tasks
        gridHTML += '<div class="day-tasks">';
        for(const h of S.habits) {
            const v = isFuture?null:getCellVal(h.id,d.getFullYear(),d.getMonth(),d.getDate());
            const checked = v===true;
            gridHTML += `<div class="day-task-item" onclick="${isFuture?'':`toggleCell('${h.id}',${d.getFullYear()},${d.getMonth()},${d.getDate()})`}">
                <div class="day-task-dot" style="background:${COLOR_HEX[h.color]}"></div>
                <span class="day-task-text" style="${checked?'text-decoration:line-through;opacity:.5':''}">${escHtml(h.name)}</span>
                <div class="day-task-check${checked?' checked':''}">${checked?'✓':''}</div>
            </div>`;
            if(checked) dayDone++;
        }
        gridHTML += '</div>';

        // Footer
        gridHTML += `<div class="day-footer">
            <span>✓ ${dDone} complétées</span>
            <span>${S.habits.length-dDone} restantes</span>
        </div></div>`;
    }
    document.getElementById('weeklyGrid').innerHTML = gridHTML;
}

// ==================== MONTHLY VIEW ====================
function renderMonthly() {
    const y=S.monthYear, m=S.monthIdx, days=daysIn(y,m);
    const today=new Date(), isCurMonth=today.getFullYear()===y&&today.getMonth()===m;
    const todayDay=today.getDate();
    const maxDay = isCurMonth?todayDay:days;

    // Month label
    document.getElementById('monthLabel').innerHTML = `${MONTHS[m]}<br><span class="period-sublabel">${y}</span>`;

    // Stats
    let totalDone=0, totalCells=0;
    for(const h of S.habits) for(let d=1;d<=maxDay;d++) { totalCells++; if(getCellVal(h.id,y,m,d)===true) totalDone++; }
    const monthPct = totalCells>0?Math.round(totalDone/totalCells*100):0;

    document.getElementById('monthlyStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-purple-bg)"><span class="material-icons-outlined" style="color:var(--accent-purple)">format_list_bulleted</span></div>
            <div class="stat-info"><div class="stat-label">Nombre d'habitudes</div><div class="stat-value" style="color:var(--accent-purple)">${S.habits.length}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-teal-bg)"><span class="material-icons-outlined" style="color:var(--accent-teal)">task_alt</span></div>
            <div class="stat-info"><div class="stat-label">Habitudes complétées</div><div class="stat-value" style="color:var(--accent-teal)">${totalDone}</div><div class="stat-sub">sur ${totalCells}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-blue-bg)"><span class="material-icons-outlined" style="color:var(--accent-blue)">speed</span></div>
            <div class="stat-info"><div class="stat-label">Progress</div><div class="stat-value" style="color:var(--accent-blue)">${monthPct}%</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--accent-yellow-bg)"><span class="material-icons-outlined" style="color:var(--accent-yellow)">emoji_events</span></div>
            <div class="stat-info"><div class="stat-label">Meilleure Série</div><div class="stat-value" style="color:var(--accent-yellow)">${getBestStreakAll()}</div><div class="stat-sub">jours</div></div>
        </div>
    `;

    document.getElementById('habitCount').textContent = S.habits.length;
    document.getElementById('bestStreak').textContent = getBestStreakAll();

    // Habit grid header
    let headHTML = '<tr><th class="habit-name-col">Habitude</th>';
    for(let d=1;d<=days;d++) {
        const dt=new Date(y,m,d);
        const isTd=isCurMonth&&d===todayDay;
        const isWe=dt.getDay()===0||dt.getDay()===6;
        headHTML += `<th class="day-num${isTd?' today':''}${isWe?' weekend':''}">${d}<br><span style="font-size:8px;opacity:.6">${DAYS_SHORT[dt.getDay()]}</span></th>`;
    }
    headHTML += '<th class="pct-col">%</th></tr>';
    document.getElementById('habitGridHead').innerHTML = headHTML;

    // Habit grid body
    let bodyHTML = '';
    S.habits.forEach(h => {
        bodyHTML += `<tr><td class="habit-name-cell" oncontextmenu="showCtx(event,'${h.id}')" ondblclick="openRenameModal('${h.id}')">
            <div class="habit-name-inner">
                <div class="habit-color-dot" style="background:${COLOR_HEX[h.color]}"></div>
                <span class="habit-label">${escHtml(h.name)}</span>
                <span class="material-icons-outlined habit-remove" onclick="event.stopPropagation();deleteHabitById('${h.id}')">close</span>
            </div>
        </td>`;
        for(let d=1;d<=days;d++) {
            const isFuture=isCurMonth&&d>todayDay;
            const isTd=isCurMonth&&d===todayDay;
            const v=getCellVal(h.id,y,m,d);
            let cls='day-cell';
            if(isFuture) cls+=' future';
            if(isTd) cls+=' today-cell';
            if(v===true) cls+=' done';
            if(v==='missed') cls+=' missed';
            bodyHTML += `<td class="${cls}" ${!isFuture?`onclick="toggleCell('${h.id}',${y},${m},${d})"`:''} title="${DAYS_FULL[new Date(y,m,d).getDay()]} ${d}"></td>`;
        }
        const pct=getHabitPct(h.id,y,m);
        const pctColor = pct>=70?'var(--accent-teal)':pct>=40?'var(--accent-yellow)':'var(--accent-pink)';
        bodyHTML += `<td class="pct-cell" style="color:${pctColor}">${pct}%</td></tr>`;
    });

    // Summary row
    bodyHTML += '<tr class="summary-row"><td class="habit-name-cell" style="background:var(--bg-elevated);font-weight:600;color:var(--text-secondary)">TOTAL</td>';
    for(let d=1;d<=days;d++) {
        const isFuture=isCurMonth&&d>todayDay;
        if(isFuture||!S.habits.length) { bodyHTML+='<td></td>'; continue; }
        let done=0;
        for(const h of S.habits) if(getCellVal(h.id,y,m,d)===true) done++;
        const perfect=done===S.habits.length&&S.habits.length>0;
        bodyHTML += `<td style="font-size:10px"><span class="summary-val${perfect?' perfect':''}">${done}/${S.habits.length}</span></td>`;
    }
    bodyHTML += `<td class="pct-cell" style="font-weight:700;color:var(--accent-teal)">${monthPct}%</td></tr>`;
    document.getElementById('habitGridBody').innerHTML = bodyHTML;

    // Charts
    renderProgressChart(y,m,days,isCurMonth,todayDay);
    renderBarChart(y,m);

    // Mood grid
    renderMoodGrid(y,m,days,isCurMonth,todayDay);
    renderMoodLineChart(y,m,days,isCurMonth,todayDay);

    // Analysis
    renderAnalysis(y,m);
    renderTopHabits(y,m);

    // Scroll to today
    setTimeout(()=>{
        const todayTh = document.querySelector('.day-num.today');
        if(todayTh) todayTh.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },100);
}
