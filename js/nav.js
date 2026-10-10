// ==================== VIEW & NAV ====================
function toggleMobileMenu() {
    if (window.innerWidth <= 768) {
        document.getElementById('mainTabs').classList.toggle('show');
        document.getElementById('mainLogo').classList.toggle('menu-open');
    }
}

function switchView(v) {
    // Mobile nav update
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    let targetNav = v;
    // Onglets absents de la barre du bas -> le bouton "Plus" s'allume
    const activeMobNav = document.getElementById('mobNav-' + targetNav) || document.getElementById('mobNav-more');
    if (activeMobNav) activeMobNav.classList.add('active');
    document.querySelectorAll('.more-list button').forEach(b => b.classList.toggle('active', b.dataset.view === v));

    S.currentView = v;
    if (v === 'finance') S.activeLedger = 'dashboard';
    else if (v === 'finance2') S.activeLedger = 'finance2';
    
    document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
    let viewId = (v === 'finance' || v === 'finance2') ? 'finance' : v;
    let vEl = document.getElementById(viewId + 'View');
    if (vEl) vEl.classList.add('active');
    
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    let activeTab = document.querySelector(`.nav-tab[onclick*="'${targetNav}'"]`);
    if (activeTab) activeTab.classList.add('active');
    
    window.scrollTo(0, 0);
    const mc = document.querySelector('.main-content'); if (mc) mc.scrollTop = 0;

    let blurBtn = document.getElementById('blurBtnContainer');
    if (blurBtn) blurBtn.style.display = (v === 'finance' || v === 'finance2') ? 'flex' : 'none';
    
    let mainTabs = document.getElementById('mainTabs');
    if (mainTabs) mainTabs.classList.remove('show');
    const logo = document.getElementById('mainLogo');
    if(logo) logo.classList.remove('menu-open');
    
    if (v === 'finance' || v === 'finance2') {
        const titleEl = document.querySelector('#financeView .section-title');
        if (titleEl) {
            titleEl.innerHTML = v === 'finance' ? '<span class="material-icons-outlined">account_balance_wallet</span> Dashboard Financier' : '<span class="material-icons-outlined">query_stats</span> Finance Pro';
        }
    }
    
    renderAll();
}

function changeWeek(dir) { S.weekStart.setDate(S.weekStart.getDate()+dir*7); renderAll(); }
function goToCurrentWeek() { setWeekStartFromDate(new Date()); renderAll(); }
function changeMonth(dir) { S.monthIdx+=dir; if(S.monthIdx>11){S.monthIdx=0;S.monthYear++;} if(S.monthIdx<0){S.monthIdx=11;S.monthYear--;} renderAll(); }
function goToCurrentMonth() { const t=new Date(); S.monthYear=t.getFullYear(); S.monthIdx=t.getMonth(); renderAll(); }
