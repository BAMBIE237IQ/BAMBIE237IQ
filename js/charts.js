// ==================== CHARTS ====================
function renderOverallDonut(pct) {
    if(charts.overallDonut) charts.overallDonut.destroy();
    const ctx = document.getElementById('overallDonut').getContext('2d');
    charts.overallDonut = new Chart(ctx, {
        type:'doughnut',
        data:{ datasets:[{data:[pct,100-pct], backgroundColor:['#2dd4bf','#1e2538'], borderWidth:0, borderRadius:6}] },
        options:{ cutout:'75%', responsive:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, animation:{animateRotate:true,duration:800} }
    });
}

function renderMindsetChart(dates) {
    if(charts.mindset) charts.mindset.destroy();
    const labels=[]; const data1=[], data2=[], data3=[];
    for(const d of dates) {
        labels.push(DAYS_SHORT[d.getDay()]);
        let done=0,missed=0;
        for(const h of S.habits) {
            const v=getCellVal(h.id,d.getFullYear(),d.getMonth(),d.getDate());
            if(v===true) done++; if(v==='missed') missed++;
        }
        data1.push(done); data2.push(missed);
        const mk=monthKey(d.getFullYear(),d.getMonth());
        const mood=S.moods[mk]?.[d.getDate()]||0;
        data3.push(mood);
    }
    const ctx=document.getElementById('mindsetChart').getContext('2d');
    charts.mindset = new Chart(ctx, {
        type:'line',
        data:{ labels,
            datasets:[
                {label:'Complétées',data:data1,borderColor:'#2dd4bf',backgroundColor:'rgba(45,212,191,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#2dd4bf',borderWidth:2},
                {label:'Manquées',data:data2,borderColor:'#f472b6',backgroundColor:'rgba(244,114,182,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#f472b6',borderWidth:2},
                {label:'Humeur',data:data3,borderColor:'#fbbf24',tension:.4,pointRadius:3,pointBackgroundColor:'#fbbf24',borderWidth:2,yAxisID:'y1'}
            ]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{
            x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:10}}},
            y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:10}},beginAtZero:true},
            y1:{position:'right',grid:{display:false},ticks:{color:'#fbbf24',font:{size:10}},min:0,max:6,display:true}
        }, plugins:{legend:{labels:{color:'#8b949e',font:{size:10},usePointStyle:true,pointStyle:'circle'}}} }
    });
}

function renderProgressChart(y,m,days,isCur,todayD) {
    if(charts.progress) charts.progress.destroy();
    const labels=[], data=[];
    const max=isCur?todayD:days;
    for(let d=1;d<=max;d++) {
        labels.push(d);
        let done=0;
        for(const h of S.habits) if(getCellVal(h.id,y,m,d)===true) done++;
        data.push(done);
    }
    const ctx=document.getElementById('progressChart').getContext('2d');
    charts.progress = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[{label:'Habitudes complétées',data,borderColor:'#2dd4bf',backgroundColor:'rgba(45,212,191,.15)',fill:true,tension:.4,pointRadius:2,borderWidth:2}] },
        options:{ responsive:true, maintainAspectRatio:false, scales:{
            x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:9}}},
            y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:9}},beginAtZero:true,max:S.habits.length||1}
        }, plugins:{legend:{display:false}} }
    });
}

function renderBarChart(y,m) {
    if(charts.bar) charts.bar.destroy();
    const labels=[], data=[], colors=[];
    for(const h of S.habits) {
        labels.push(h.name.substring(0,12));
        data.push(getHabitPct(h.id,y,m));
        colors.push(COLOR_HEX[h.color]);
    }
    const ctx=document.getElementById('barChart').getContext('2d');
    charts.bar = new Chart(ctx, {
        type:'bar',
        data:{ labels, datasets:[{data,backgroundColor:colors,borderRadius:4,barThickness:16}] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, scales:{
            x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:9}},max:100},
            y:{grid:{display:false},ticks:{color:'#e6edf3',font:{size:10}}}
        }, plugins:{legend:{display:false}} }
    });
}

function renderMoodGrid(y,m,days,isCur,todayD) {
    const mk=monthKey(y,m);
    let html='';
    for(let d=1;d<=days;d++) {
        const isFuture=isCur&&d>todayD;
        const moodVal=S.moods[mk]?.[d];
        const emoji=moodVal!==undefined?EXTENDED_MOOD_EMOJIS[moodVal + 5]:'';
        html += `<div class="mood-day">
            <span class="mood-day-num">${d}</span>
            <div class="mood-emoji${moodVal!==undefined?' set':''}" onclick="${isFuture?'':`openMoodModal(${y},${m},${d})`}">${emoji||'·'}</div>
        </div>`;
    }
    document.getElementById('moodGrid').innerHTML=html;
}

let currentMoodDate = null;
function openMoodModal(y,m,d) {
    const mk = monthKey(y, m);
    currentMoodDate = {y, m, d, mk};
    let val = S.moods[mk]?.[d];
    if (val === undefined) val = 0;
    document.getElementById('moodModalSlider').value = val;
    updateMoodModalUI();
    document.getElementById('moodModalOverlay').classList.add('active');
}

function updateMoodModalUI() {
    let val = parseInt(document.getElementById('moodModalSlider').value);
    document.getElementById('moodModalValueText').innerText = (val > 0 ? '+' : '') + val;
    document.getElementById('moodModalEmoji').innerText = EXTENDED_MOOD_EMOJIS[val + 5];
}

function closeMoodModal() {
    document.getElementById('moodModalOverlay').classList.remove('active');
}

function saveMoodModal() {
    if (!currentMoodDate) return;
    let val = parseInt(document.getElementById('moodModalSlider').value);
    const {mk, d} = currentMoodDate;
    if(!S.moods[mk]) S.moods[mk] = {};
    S.moods[mk][d] = val;
    save();
    renderAll();
    closeMoodModal();
}

function deleteMoodModal() {
    if (!currentMoodDate) return;
    const {mk, d} = currentMoodDate;
    if(S.moods[mk]) {
        delete S.moods[mk][d];
    }
    save();
    renderAll();
    closeMoodModal();
}

function renderMoodLineChart(y,m,days,isCur,todayD) {
    if(charts.mood) charts.mood.destroy();
    const mk=monthKey(y,m);
    const labels=[], data=[];
    const max=isCur?todayD:days;
    for(let d=1;d<=max;d++) {
        labels.push(d);
        data.push(S.moods[mk]?.[d]??null);
    }
    const ctx=document.getElementById('moodChart').getContext('2d');
    charts.mood = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[{label:'Humeur',data,borderColor:'#fbbf24',backgroundColor:'rgba(251,191,36,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#fbbf24',borderWidth:2,spanGaps:true}] },
        options:{ responsive:true, maintainAspectRatio:false, scales:{
            x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:9}}},
            y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8b949e',font:{size:9},callback:v=>EXTENDED_MOOD_EMOJIS[v + 5]||''},min:-5,max:5}
        }, plugins:{legend:{display:false}} }
    });
}

function renderAnalysis(y,m) {
    let html='';
    for(const h of S.habits) {
        const pct=getHabitPct(h.id,y,m);
        html += `<div class="analysis-item">
            <span class="analysis-label">${escHtml(h.name).substring(0,12)}</span>
            <div class="analysis-bar"><div class="analysis-fill" style="width:${pct}%;background:${COLOR_HEX[h.color]}"></div></div>
            <span class="analysis-pct" style="color:${COLOR_HEX[h.color]}">${pct}%</span>
        </div>`;
    }
    document.getElementById('analysisContent').innerHTML=html;
}

function renderTopHabits(y,m) {
    const sorted=[...S.habits].sort((a,b)=>getHabitPct(b.id,y,m)-getHabitPct(a.id,y,m));
    let html='';
    sorted.slice(0,5).forEach((h,i) => {
        const pct=getHabitPct(h.id,y,m);
        const medal=['🥇','🥈','🥉','4️⃣','5️⃣'][i];
        html += `<div class="analysis-item">
            <span style="font-size:16px;width:24px;flex-shrink:0">${medal}</span>
            <span class="analysis-label" style="width:auto;flex:1">${escHtml(h.name)}</span>
            <span class="analysis-pct" style="color:${COLOR_HEX[h.color]}">${pct}%</span>
        </div>`;
    });
    document.getElementById('topHabits').innerHTML=html;
}
