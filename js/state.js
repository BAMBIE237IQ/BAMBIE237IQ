// ==================== STATE ====================
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const DAYS_FULL = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const COLORS = ['teal','pink','purple','yellow','orange','green','blue','red'];
const COLOR_HEX = {teal:'#2dd4bf',pink:'#f472b6',purple:'#a78bfa',yellow:'#fbbf24',orange:'#fb923c',green:'#34d399',blue:'#60a5fa',red:'#f87171'};
const EXTENDED_MOOD_EMOJIS = ['😭','😫','😞','🙁','😕','😐','🙂','😊','😄','😁','🤩'];
const STORAGE_KEY = 'qp-habit-tracker-v2';

let S = { habits:[], data:{}, moods:{}, transactions:{}, currentView:'today', weekStart:null, monthYear:null, monthIdx:null, finYear:null, finMonth:null, finType:'income', ctxHabitId:null, finAccounts:{cash:0, bank:0, mobile:0}, fin2Accounts:{cash:0, bank:0, mobile:0}, finance2Transactions:{}, activeLedger:'dashboard', fin2Year:null, fin2Month:null, fin2Type:'income', blurAmounts:false, subscriptions:[], subAccountNames:{}, calendarChecked:{}, calendarEvents:{}, fitness:{ targetWeight: 82, height:1.81, records:{} } };
let subFilter = 'netflix';
let editingSubId = null;

const activeS = new Proxy(S, {
    get: function(target, prop) {
        if (target.activeLedger === 'finance2') {
            if (prop === 'transactions') return target.finance2Transactions;
            if (prop === 'finAccounts') return target.fin2Accounts;
            if (prop === 'finYear') return target.fin2Year;
            if (prop === 'finMonth') return target.fin2Month;
            if (prop === 'finType') return target.fin2Type;
        }
        return target[prop];
    },
    set: function(target, prop, value) {
        if (target.activeLedger === 'finance2') {
            if (prop === 'transactions') { target.finance2Transactions = value; return true; }
            if (prop === 'finAccounts') { target.fin2Accounts = value; return true; }
            if (prop === 'finYear') { target.fin2Year = value; return true; }
            if (prop === 'finMonth') { target.fin2Month = value; return true; }
            if (prop === 'finType') { target.fin2Type = value; return true; }
        }
        target[prop] = value;
        return true;
    }
});

let charts = {};
let undoStack = [], redoStack = [];
let dbRef;
let isInitialLoad = true;

const firebaseConfig = {
  apiKey: "AIzaSyCqZhTn6fA7lHwN5JHwaowDzGWohA9rOQ0",
  authDomain: "bambie237iq.firebaseapp.com",
  databaseURL: "https://bambie237iq-default-rtdb.firebaseio.com",
  projectId: "bambie237iq",
  storageBucket: "bambie237iq.firebasestorage.app",
  messagingSenderId: "730310282369",
  appId: "1:730310282369:web:fa4cc5068a718be30c5180",
  measurementId: "G-RQGHZ9RQLR"
};

function init() {
    // 1. Charger depuis le stockage local (Sauvetage des données existantes)
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
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
        } catch(e) {}
    } else {
        // Uniquement si c'est la toute première fois de leur vie sur l'app
        if (!S.habits.length) {
            addHabit('🏃 Exercice physique','teal');
            addHabit('📚 Lecture 30 min','blue');
            addHabit('🧘 Méditation','purple');
            addHabit('💧 Boire 2L d\'eau','green');
        }
    }

    
    // Init dates if missing
    const today = new Date();
    if (S.monthYear == null) { S.monthYear = today.getFullYear(); S.monthIdx = today.getMonth(); }
    if (S.finYear == null) { S.finYear = today.getFullYear(); S.finMonth = today.getMonth(); }
    if (S.fin2Year == null) { S.fin2Year = today.getFullYear(); S.fin2Month = today.getMonth(); }
    if (!S.weekStart) setWeekStartFromDate(today);
    let fd = document.getElementById('finDate');
    if (fd && !fd.value) fd.value = localDateStr(today);
    
    // 2. Initialiser Firebase
    try {
        firebase.initializeApp(firebaseConfig);
        dbRef = firebase.database().ref('userData');

        dbRef.on('value', (snapshot) => {
            isInitialLoad = false;
            const data = snapshot.val();
            if (data) {
                S.habits = data.habits || [];
                S.data = data.data || {};
                S.moods = data.moods || {};
                S.transactions = data.transactions || {};
                S.finAccounts = data.finAccounts || {cash:0, bank:0, mobile:0};
                S.fin2Accounts = data.fin2Accounts || {cash:0, bank:0, mobile:0};
                S.finance2Transactions = data.finance2Transactions || {};
                S.fin2Year = data.fin2Year || S.finYear;
                S.fin2Month = data.fin2Month || S.finMonth;
                S.fin2Type = data.fin2Type || 'income';
                S.blurAmounts = data.blurAmounts || false;
                S.subscriptions = data.subscriptions || [];
                S.subAccountNames = data.subAccountNames || {};
            S.calendarChecked = data.calendarChecked || {};
            S.calendarEvents = data.calendarEvents || {};
            S.fitness = data.fitness || { targetWeight: 82, height:1.81, records:{} };
                S.journal = data.journal || {};
                
                saveLocal();
                updateBlurState();
                renderAll();
            } else if (S.habits.length > 0 || Object.keys(S.data).length > 0) {
                save();
            }
        });
    } catch (e) {
        console.error("Firebase init error", e);
    }

    updateBlurState();
    renderAll();
}

// ==================== PERSISTENCE ====================
function getPersistedState() {
    return {
        habits: S.habits,
        data: S.data,
        moods: S.moods,
        transactions: S.transactions,
        finAccounts: S.finAccounts, fin2Accounts: S.fin2Accounts, finance2Transactions: S.finance2Transactions, fin2Year: S.fin2Year, fin2Month: S.fin2Month, fin2Type: S.fin2Type,
        blurAmounts: S.blurAmounts,
        subscriptions: S.subscriptions,
        subAccountNames: S.subAccountNames, calendarChecked: S.calendarChecked, calendarEvents: S.calendarEvents, fitness: S.fitness, journal: S.journal
    };
}

function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistedState()));
}

function save() {
    // Sauvegarde locale (Garantie de ne rien perdre)
    saveLocal();

    // Sauvegarde Cloud : seulement après avoir reçu les données Firebase,
    // sinon un clic pendant le chargement écraserait le cloud avec un état vide/par défaut.
    if (dbRef && !isInitialLoad) {
        dbRef.set(getPersistedState()).catch(e => console.error("Firebase save error", e));
    }
}

function loadState() {
    // Remplacé par on('value') dans init()
}

function pushUndo() {
    undoStack.push(JSON.stringify({habits:S.habits,data:S.data,moods:S.moods,transactions:S.transactions,finAccounts:S.finAccounts,blurAmounts:S.blurAmounts}));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
}
