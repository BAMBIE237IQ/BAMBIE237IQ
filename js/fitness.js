// ==================== FITNESS VIEW ====================
let fitnessChartInst = null;


function changeFitnessDate(days) {
    let dateInput = document.getElementById('fitnessDate');
    if (!dateInput.value) {
        setFitnessDateToday();
        return;
    }
    let d = new Date(dateInput.value);
    d.setUTCDate(d.getUTCDate() + days);
    dateInput.value = d.toISOString().split('T')[0];
    renderFitness();
}

function setFitnessDateToday() {
    let dateInput = document.getElementById('fitnessDate');
    let today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today - offset)).toISOString().split('T')[0];
    dateInput.value = localISOTime;
    renderFitness();
}

function renderFitness() {
    let dateInput = document.getElementById('fitnessDate');
    if (!dateInput.value) {
        let today = new Date();
        dateInput.value = localDateStr(today);
    }
    const dStr = dateInput.value;
    
    if (!S.fitness) S.fitness = { targetWeight: 82, height: 1.81, records: {} };
    if (!S.fitness.records) S.fitness.records = {};
    
    const rec = S.fitness.records[dStr] || { weightAM: '', weightPM: '', thighAM: '', thighPM: '', foodLog: '', dailyLog: '' };
    
    document.getElementById('fitWeightAM').value = rec.weightAM || '';
    document.getElementById('fitWeightPM').value = rec.weightPM || '';
    document.getElementById('fitThighAM').value = rec.thighAM || '';
    document.getElementById('fitThighPM').value = rec.thighPM || '';
    document.getElementById('fitFoodLog').value = rec.foodLog || '';
    document.getElementById('fitDailyLog').value = rec.dailyLog || '';
    
    let wAM = parseFloat(rec.weightAM) || 0;
    let wPM = parseFloat(rec.weightPM) || 0;
    let w = 0;
    if (wAM > 0 && wPM > 0) w = (wAM + wPM) / 2;
    else if (wAM > 0) w = wAM;
    else if (wPM > 0) w = wPM;
    let h = S.fitness.height || 1.81;
    
    let bmiBadge = document.getElementById('fitnessBMIBadge');
    let bmiVal = document.getElementById('fitnessBMIValue');
    
    // Target & Progress math
    let targetW = S.fitness.targetWeight || 82;
    let startW = S.fitness.startWeight || 95; 
    
    if (w > 0 && h > 0) {
        let bmi = w / (h * h);
        bmiVal.innerText = bmi.toFixed(1);
        let color = '';
        if (bmi < 18.5) color = 'var(--accent-blue)';
        else if (bmi < 25) color = 'var(--accent-green)';
        else if (bmi < 30) color = 'var(--accent-orange)';
        else color = 'var(--accent-red)';
        
        bmiBadge.style.borderColor = color;
        bmiBadge.style.boxShadow = `0 0 15px ${color}`;
        
        // Progress Calculation
        let totalDiff = startW - targetW;
        let currentDiff = startW - w;
        let progress = 0;
        if (totalDiff > 0) {
            progress = (currentDiff / totalDiff) * 100;
            if (progress < 0) progress = 0;
            if (progress > 100) progress = 100;
        }
        document.getElementById('fitProgressText').innerText = Math.round(progress) + '%';
        
        // Bonhomme scale (Red is dynamic, Green is static 82kg)
        let scaleX = 1.0;
        if (w > 0) {
            let refWeight = 82;
            let weightDiff = w - refWeight;
            scaleX = 1 + (weightDiff * 0.04);
            if (scaleX < 0.4) scaleX = 0.4;
            if (scaleX > 2.0) scaleX = 2.0;
        }
        // Scale ONLY the Red pantin (Background/Dynamic)
        document.getElementById('bonhommeRedBody').style.transform = `scaleX(${scaleX})`;
        
    } else {
        bmiVal.innerText = '--';
        bmiBadge.style.borderColor = 'var(--border)';
        bmiBadge.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        document.getElementById('fitProgressText').innerText = '--%';
        document.getElementById('bonhommeRedBody').style.transform = 'scaleX(1)';
    }
    
    drawFitnessChart();
}

function saveFitnessData() {
    const dStr = document.getElementById('fitnessDate').value;
    if (!dStr) return;
    
    if (!S.fitness) S.fitness = { targetWeight: 82, height: 1.81, records: {} };
    if (!S.fitness.records) S.fitness.records = {};
    
    S.fitness.records[dStr] = {
        weightAM: document.getElementById('fitWeightAM').value,
        weightPM: document.getElementById('fitWeightPM').value,
        thighAM: document.getElementById('fitThighAM').value,
        thighPM: document.getElementById('fitThighPM').value,
        foodLog: document.getElementById('fitFoodLog').value,
        dailyLog: document.getElementById('fitDailyLog').value,
    };
    
    save();
    drawFitnessChart();
}

function drawFitnessChart() {
    const ctx = document.getElementById('fitnessChart');
    if (!ctx) return;
    
    if (!S.fitness || !S.fitness.records) return;
    
    let labels = [];
    let weightData = [];
    let thighData = [];
    
    let endD = new Date();
    let startD = new Date();
    startD.setDate(endD.getDate() - 30);
    
    let curr = new Date(startD);
    while (curr <= endD) {
        let dStr = localDateStr(curr);
        labels.push(curr.getDate() + '/' + (curr.getMonth()+1));
        
        let r = S.fitness.records[dStr];
        if (r) {
            let wA = parseFloat(r.weightAM) || 0;
              let wP = parseFloat(r.weightPM) || 0;
              let w = null;
              if (wA > 0 && wP > 0) w = (wA + wP) / 2;
              else if (wA > 0) w = wA;
              else if (wP > 0) w = wP;
            weightData.push(w);
            let tA = parseFloat(r.thighAM) || 0;
              let tP = parseFloat(r.thighPM) || 0;
              let t = null;
              if (tA > 0 && tP > 0) t = (tA + tP) / 2;
              else if (tA > 0) t = tA;
              else if (tP > 0) t = tP;
            thighData.push(t);
        } else {
            weightData.push(null);
            thighData.push(null);
        }
        
        curr.setDate(curr.getDate() + 1);
    }
    
    if (fitnessChartInst) {
        fitnessChartInst.destroy();
    }
    
    fitnessChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Poids (kg)',
                    data: weightData,
                    borderColor: '#f48fb1',
                    backgroundColor: '#f48fb1',
                    yAxisID: 'y',
                    spanGaps: true,
                    tension: 0.3
                },
                {
                    label: 'Cuisses (cm)',
                    data: thighData,
                    borderColor: '#81c784',
                    backgroundColor: '#81c784',
                    yAxisID: 'y1',
                    spanGaps: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#a0a0a0', font: { size: 10 } } }
            },
            scales: {
                x: { ticks: { color: '#a0a0a0', maxTicksLimit: 7 }, grid: { color: '#2a2a2a' } },
                y: { type: 'linear', display: true, position: 'left', ticks: { color: '#f48fb1' }, grid: { color: '#2a2a2a' } },
                y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#81c784' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}
