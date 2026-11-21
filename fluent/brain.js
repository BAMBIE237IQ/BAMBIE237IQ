// FLUENT 90 — COACH BRAIN
// Makes a light model (Gemini Flash) behave like a strict personal coach:
//   1. a LEARNER DOSSIER built from the app database (level, metrics, recurring mistakes, weak phrases, story so far)
//   2. a CONSTITUTION of non-negotiable rules + level rules (i+1)
//   3. a forced JSON SCHEMA per task, with a hidden "analysis" field filled first (the model thinks before answering)
//   4. a QUALITY CHECK in code after every answer; if it fails, one REPAIR pass with the exact list of problems
//   5. multi-step tasks: the daily episode is PLANNED (objectives, phrases, scene) before it is WRITTEN
//   6. a weekly DIAGNOSIS that sets the coach's focus; every other prompt then pushes on that focus

const ERR_TYPES = ['past tense', 'present tense', 'future/conditional', 'subject-verb agreement', 'articles (a/the)', 'prepositions', 'word order', 'question form', 'word choice', 'french false friend', 'literal translation from french', 'plural/countable', 'pronouns', 'missing word', 'collocation', 'politeness/register', 'other'];

// ---------- schema helpers (Gemini responseSchema, OpenAPI subset) ----------
const Sch = {
    s: d => ({ type: 'STRING', description: d }),
    i: (d, min, max) => Object.assign({ type: 'INTEGER', description: d }, min != null ? { minimum: min } : {}, max != null ? { maximum: max } : {}),
    b: d => ({ type: 'BOOLEAN', description: d }),
    e: (vals, d) => ({ type: 'STRING', enum: vals, description: d }),
    a: (items, d, min, max) => Object.assign({ type: 'ARRAY', items, description: d }, min != null ? { minItems: min } : {}, max != null ? { maxItems: max } : {}),
    o: (props, opt = {}) => Object.assign({ type: 'OBJECT', properties: props, required: Object.keys(props).filter(k => !(opt.optional || []).includes(k)), propertyOrdering: Object.keys(props) }, opt.nullable ? { nullable: true } : {})
};
const ANALYSIS = Sch.s('HIDDEN notes, max 60 words, written FIRST: what you noticed in the data, what you chose and why. The learner never sees it.');
const FIX = Sch.o({
    wrong: Sch.s("EXACT quote of the learner's words (3 to 10 words)"),
    right: Sch.s('smallest change that makes it correct and natural'),
    why: Sch.s('max 12 simple English words, no grammar jargon'),
    type: Sch.e(ERR_TYPES, 'mistake category'),
    recurring: Sch.b('true if this type is in the RECURRING MISTAKES of the dossier')
});
const PHRASE = Sch.o({ en: Sch.s('natural English phrase, 2 to 8 words'), fr: Sch.s('French meaning') });

// ---------- text checks ----------
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const cleanChunk = s => String(s || '').replace(/\.\.\.|…/g, ' ').replace(/\b(sb|sth|someone|something)\b/gi, ' ');
// Does `needle` appear (almost word for word) somewhere in `hay`? Sliding window + word LCS.
function appears(hay, needle, thr = 0.75) {
    const n = words(cleanChunk(needle)), h = words(hay);
    if (!n.length || !h.length) return false;
    if (` ${h.join(' ')} `.includes(` ${n.join(' ')} `)) return true;
    const win = n.length + 2;
    for (let i = 0; i <= Math.max(0, h.length - n.length); i++) {
        if (matchScore(n.join(' '), h.slice(i, i + win).join(' ')).pct >= thr * 100) return true;
    }
    return false;
}
const GENERIC = /\b(great job|good job|well done|excellent work|keep it up|amazing work|nice work|you did great)\b/i;
const FRENCH = /\b(le|la|les|une|des|est|avec|pour|dans|nous|vous|mais|très|c'est|je suis)\b/i;
function sentenceLens(text) { return sentences(text).map(s => countWords(s)); }

// ---------- level rules (i+1: one small step above the learner) ----------
function levelRules(v) {
    if (v < 2.5) return { tag: 'A2', max: 12, rules: 'A2 level: sentences of 6 to 12 words; only the 1500 most common English words; present simple, past simple, "going to", "can"; no idioms except the target phrases; numbers said simply.' };
    if (v < 3.3) return { tag: 'B1', max: 16, rules: 'B1 level: sentences of 8 to 16 words; the 2500 most common words; common phrasal verbs are fine; present perfect is fine; at most one idiom, made clear by the context.' };
    if (v < 4) return { tag: 'B1+/B2', max: 20, rules: 'B1+/B2 level: sentences up to 20 words; natural spoken English; phrasal verbs and common idioms are fine; conditionals are fine.' };
    return { tag: 'B2+', max: 24, rules: 'B2+ level: natural, fast spoken English between colleagues; idioms are fine.' };
}
function contentLevel(n) {
    const c = cefr(), ph = phaseOf(Math.max(1, n || dayNum() || 1));
    return Math.min(4.2, Math.max(c.value + 0.3, ph === 3 ? 3.2 : ph === 2 ? 2.8 : 2.3));
}

// ---------- the learner dossier (facts only, from the database) ----------
function weakPhrases(max = 6) {
    return Object.entries(S.cards).filter(([, c]) => (c.lapses || 0) >= 2 || c.ease <= 1.9)
        .sort((a, b) => (b[1].lapses || 0) - (a[1].lapses || 0)).map(([id]) => cardContent(id)).filter(Boolean).slice(0, max).map(x => x.en);
}
function recentPhrases(max = 8) {
    const from = addDays(today(), -6);
    return Object.entries(S.cards).filter(([, c]) => (c.added || '') >= from).map(([id]) => cardContent(id)).filter(Boolean).slice(-max).map(x => x.en);
}
function recurring(days = 14) {
    return topMistakeTypes(days).slice(0, 3).map(([t, cnt]) => {
        const ex = S.mistakes.filter(m => m.type === t).slice(-2).map(m => `"${clip(m.wrong, 60)}" → "${clip(m.right, 60)}"`).join('; ');
        return { type: t, count: cnt, line: `${t} ×${cnt}${ex ? ` (e.g. ${ex})` : ''}` };
    });
}
function storySoFar(n, max = 4) {
    const out = [];
    for (let d = n - 1; d >= 31 && out.length < max; d--) { const a = S.aiDays[d]; if (a && a.sum) out.unshift(`Day ${d} "${clip(a.story && a.story.t, 60)}": ${clip(a.sum, 220)}`); }
    return out;
}
function dossier() {
    const n = dayNum(), c = cefr(), ph = phaseOf(Math.max(1, n));
    const parts = c.parts.map(([k, v]) => `${k} ${v == null ? 'no data yet' : `${cefrLabel(v)} ${v.toFixed(1)}`}`).join(' · ');
    const have = c.parts.filter(p => p[1] != null).sort((a, b) => a[1] - b[1]);
    const sp = S.metrics.speak.filter(m => m.words >= 15).slice(-5);
    const ls = S.metrics.listen.slice(-10);
    const rec = recurring();
    const weak = weakPhrases(), fresh = recentPhrases();
    const notes = S.notebook.slice(0, 4).map(x => clip(x.en, 80));
    const focus = S.coach && S.coach.focus;
    const lines = [
        'LEARNER DOSSIER (facts from the app database. Never invent other facts about the learner.)',
        '- Who: a French speaker from Cameroon. Goals: talk with business clients, travel or live abroad, make friends and create content in English. Interests: tech, AI, apps, business, money.',
        '- Fears that made them quit before: boredom, no visible progress, fear of being laughed at. So: make progress visible, never mock, keep it energetic.',
        `- Program: ${n >= 1 ? `day ${n} of 90, phase ${ph} (${PHASES[ph].name})` : 'not started yet'} · streak ${streak()} days · ${Math.round(c.hours * 10) / 10} hours practised.`,
        `- Estimated level: ${c.label} (${c.value.toFixed(2)} on 1–5) · started at ${cefrLabel(c.prior)} · ${parts}.`,
        have.length ? `- Weakest skill: ${have[0][0]}.` : '- Weakest skill: unknown yet.',
        sp.length ? `- Speaking data (last ${sp.length} rounds): ${Math.round(avg(sp.map(m => m.wpm)))} words/min, ${avg(sp.map(m => m.pauses || 0)).toFixed(1)} long pauses and ${avg(sp.map(m => m.fillers || 0)).toFixed(1)} fillers per round. B1 speakers reach about 90–110 words/min.` : '- Speaking data: none yet.',
        ls.length ? `- Listening: ${Math.round(avg(ls.map(m => m.acc)) * 100)}% of questions right at first try (last ${ls.length} episodes).` : '',
        rec.length ? `- RECURRING MISTAKES (last 14 days): ${rec.map(r => r.line).join(' | ')}` : '- Recurring mistakes: none logged yet.',
        focus ? `- COACH FOCUS THIS WEEK: ${focus}${S.coach.focusWhy ? ` (${clip(S.coach.focusWhy, 140)})` : ''}. Push on it every time it appears.` : '',
        weak.length ? `- Phrases they keep forgetting: ${weak.map(x => `"${x}"`).join(', ')}` : '',
        fresh.length ? `- Phrases learned this week: ${fresh.map(x => `"${x}"`).join(', ')}` : '',
        notes.length ? `- Phrases they wrote in their notebook: ${notes.map(x => `"${x}"`).join(', ')}` : ''
    ];
    return lines.filter(Boolean).join('\n');
}

function constitution(lvl) {
    return `You are COACH 90, the brain of FLUENT 90: a 90-day program that makes ONE specific learner speak English fluently. You are strict, precise and warm.
NON-NEGOTIABLE RULES
1. Ground every decision in the LEARNER DOSSIER below. Never invent facts about the learner (job details, family, past). Stay general when you do not know.
2. Level: one small step above the learner (i+1). ${lvl.rules}
3. Natural spoken English: contractions, everyday words, the way people really talk at work and with friends. No textbook phrases, no rare words, no British/American slang that a client would not use.
4. Corrections are direct but kind. NEVER generic praise ("great job", "well done", "keep it up"). A compliment must quote the learner's own words and say exactly why it works.
5. Choose at most 3 fixes, by impact: (a) errors that change the meaning or block understanding, (b) mistakes in the RECURRING list or the COACH FOCUS, (c) French-sounding constructions, (d) the rest. Ignore spelling, punctuation and capital letters.
6. Each fix: "wrong" is an EXACT quote of the learner (3 to 10 words), "right" is the smallest change that makes it natural, "why" is max 12 simple words. If the type is recurring, start "why" with "Again:".
7. Everything the learner reads is in simple English. French only in fields called "fr".
8. Think first: fill "analysis" before anything else, in short notes. Then make every other field consistent with it.
9. Return exactly the JSON schema. No markdown, no extra keys.`;
}

// ---------- AI tasks ----------
const KIND_DESC = {
    speak432: 'talking about one topic three times with less time each round (4, 3, then 2 minutes): the goal is speed and flow',
    teach: 'explaining a topic simply, like to a 12-year-old',
    retell: 'retelling a story from memory, without notes',
    shadow: 'repeating sentences right after a native voice',
    bench: 'one-minute self-introduction'
};
const AITASKS = {
    // Feedback after a speaking exercise (transcript from speech recognition)
    speak({ kind, text, extra = '' }) {
        return {
            temp: 0.4, think: 'low',
            task: `The learner just did a "${kind}" speaking exercise: ${KIND_DESC[kind] || 'free speaking'}.
The text is a SPEECH-RECOGNITION TRANSCRIPT: it has no punctuation and may contain recognition errors (wrong words that sound alike). Ignore those; judge only real language mistakes.
Judge in this order: 1) flow (did they keep talking, link ideas with "so, because, but, then"), 2) clarity for a client, 3) accuracy.`,
            user: `${extra ? extra + '\n' : ''}TRANSCRIPT: """${clip(text, 3000)}"""`,
            schema: Sch.o(Object.assign({
                analysis: ANALYSIS,
                win: Sch.s("one specific strength, quoting the learner's words"),
                fixes: Sch.a(FIX, '0 to 3 fixes, most important first', 0, 3),
                better: Sch.s('a natural version of 2 or 3 of their sentences, same ideas, max 50 words'),
                tip: Sch.s('one concrete action for the next round, max 20 words'),
                scores: Sch.o({ flow: Sch.i('0-10', 0, 10), clarity: Sch.i('0-10', 0, 10), accuracy: Sch.i('0-10', 0, 10) })
            }, kind === 'retell' ? { missed: Sch.s('the most important point of the story they forgot, or empty') } : {}))
                , check: j => checkFixes(j.fixes, text).concat(checkWin(j.win, text), countWords(j.better) > 70 ? ['"better" is too long: max 50 words.'] : []),
            clean: j => { j.fixes = validFixes(j.fixes, text); return j; }
        };
    },
    // Correction of a written text
    write({ task, text, story }) {
        return {
            temp: 0.35, think: 'low',
            task: `Correct a short text the learner wrote for this task: "${clip(task, 300)}". Keep their ideas and their voice; make it sound like a natural, confident speaker at their level + 1.`,
            user: `${story ? `The episode they had to retell: """${clip(story, 1600)}"""\n` : ''}LEARNER TEXT: """${clip(text, 3000)}"""`,
            schema: Sch.o({
                analysis: ANALYSIS,
                score: Sch.i('0-10: 10 = natural and correct, 5 = understandable with several errors', 0, 10),
                win: Sch.s("one specific strength, quoting the learner's words"),
                fixes: Sch.a(FIX, '0 to 3 fixes, most important first', 0, 3),
                corrected: Sch.s('their full text, corrected and natural, same ideas, same length'),
                tip: Sch.s('one concrete tip for the next text, max 20 words'),
                chunk: PHRASE
            }),
            check: j => {
                const out = checkFixes(j.fixes, text).concat(checkWin(j.win, text));
                if (countWords(j.corrected) < countWords(text) * 0.6) out.push('"corrected" must keep the whole text, not a summary.');
                if ((j.fixes || []).length >= 3 && j.score > 8) out.push('Score is too high for 3 real mistakes.');
                if (j.chunk && FRENCH.test(j.chunk.en || '')) out.push('chunk.en must be English.');
                return out;
            },
            clean: j => { j.fixes = validFixes(j.fixes, text); j.score = Math.max(0, Math.min(10, parseInt(j.score, 10) || 0)); return j; }
        };
    },
    // Step 1 of the daily episode: decide WHAT to teach today
    episodePlan({ n }) {
        const th = themeOf(n), lvl = levelRules(contentLevel(n));
        const review = weakPhrases(5).concat(recentPhrases(5)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 6);
        const reviewList = review.length ? review : th.c.slice(0, 5).map(c => c[0]);
        const sofar = storySoFar(n);
        const known = th.c.map(c => c[0]).concat(recentPhrases(10));
        return {
            temp: 0.5, think: 'high', reviewList,
            task: `Plan day ${n} of 90 (phase ${phaseOf(n)}). You are the curriculum designer. Decide what this learner must practise today, based on the dossier. Theme of the day: "${th.t}".
Story: season 2 of "Sam's Big Pitch". Sam Ndongo, a founder from Douala, runs PayLink (an app that sends bills paid by mobile money). Season 1 ended with Sam speaking confidently to clients in London, his video going viral and friends abroad (Grace in Douala, Lucia from Brazil, Priya and her 60 UK shops, Daniel from Kenya). In season 2 he grows PayLink abroad.
${sofar.length ? `Last episodes:\n${sofar.join('\n')}` : 'This is the first episode of season 2.'}
Rules for the plan:
- objective: what the learner will be able to SAY after today, linked to the theme AND to their goals.
- grammar_focus: one structure the story will show 3 times. Take it from the COACH FOCUS or the RECURRING MISTAKES if any, else from the theme.
- new_chunks: exactly 8 NEW ready-to-use phrases for the theme, 2 to 8 words, useful with clients, when travelling or with friends. Not these: ${known.map(x => `"${x}"`).join(', ')}.
- recycle: pick 2 or 3 phrases from this REVIEW LIST, copied exactly: ${reviewList.map(x => `"${x}"`).join(', ')}.
- scene: continue the story logically from the last episodes; one problem, one turn, a small cliffhanger. Level for the story: ${lvl.tag}.`,
            user: '(Make the plan for today.)',
            schema: Sch.o({
                analysis: ANALYSIS,
                objective: Sch.s('Can-do statement, starts with "Say" or "Explain" or "Ask"'),
                grammar_focus: Sch.s('one structure, with a short example'),
                new_chunks: Sch.a(Sch.o({ en: Sch.s('phrase, 2 to 8 words'), fr: Sch.s('French meaning'), use: Sch.s('one example sentence in context') }), 'exactly 8', 8, 8),
                recycle: Sch.a(Sch.s('phrase copied exactly from the REVIEW LIST'), '2 or 3', 2, 3),
                scene: Sch.o({ setting: Sch.s('where and when'), characters: Sch.s('who is there'), problem: Sch.s('the problem'), turn: Sch.s('what changes'), cliffhanger: Sch.s('last line hook') })
            }),
            check: j => {
                const out = [];
                const ch = (j.new_chunks || []).filter(c => c && c.en);
                if (ch.length !== 8) out.push(`new_chunks must have exactly 8 items (now ${ch.length}).`);
                const seen = new Set();
                ch.forEach(c => {
                    const k = words(c.en).join(' ');
                    if (seen.has(k)) out.push(`Duplicate phrase: "${c.en}".`); seen.add(k);
                    if (countWords(c.en) > 9) out.push(`Too long: "${c.en}" (max 8 words).`);
                    if (known.some(x => words(x).join(' ') === k)) out.push(`Already known: "${c.en}". Replace it.`);
                    if (FRENCH.test(c.en)) out.push(`Not English: "${c.en}".`);
                });
                const rc = (j.recycle || []).filter(x => reviewList.some(r => words(r).join(' ') === words(x).join(' ')));
                if (rc.length < 2) out.push('recycle must contain 2 or 3 phrases copied EXACTLY from the REVIEW LIST.');
                return out;
            },
            clean: j => { j.new_chunks = (j.new_chunks || []).filter(c => c && c.en).slice(0, 8); j.recycle = (j.recycle || []).filter(Boolean).slice(0, 3); return j; }
        };
    },
    // Step 2 of the daily episode: WRITE it from the plan
    episodeWrite({ n, plan }) {
        const ph = phaseOf(n), lvl = levelRules(contentLevel(n));
        const [minW, maxW] = ph === 2 ? [160, 200] : [200, 240];
        const must = plan.new_chunks.slice(0, 5).map(c => c.en);
        return {
            temp: 0.85, think: 'low', range: [minW, maxW],
            task: `Write today's episode from the PLAN below. Graded reader for listening practice (it will be read aloud by a voice).
- Length: ${minW} to ${maxW} words. ${lvl.rules} Never more than ${lvl.max} words in one sentence.
- Mostly dialogue in quotes, like a podcast drama. Short narration between lines.
- Use these new phrases word for word: ${must.map(x => `"${x}"`).join(', ')}. Use the recycled phrases too: ${plan.recycle.map(x => `"${x}"`).join(', ')}.
- Show the grammar focus 3 times, naturally, never explain it.
- End with the cliffhanger.
- summary: one sentence for the story memory (who did what, what is open).
- 3 listening questions: one gist, one detail, one inference. Answers must be similar in length and style; wrong answers must be believable (mention real names or facts from the story) but clearly false.
PLAN: ${JSON.stringify({ objective: plan.objective, grammar_focus: plan.grammar_focus, scene: plan.scene, recycle: plan.recycle, new: plan.new_chunks.map(c => c.en) })}`,
            user: '(Write the episode now.)',
            schema: Sch.o({
                analysis: ANALYSIS,
                title: Sch.s('short episode title, max 6 words'),
                story: Sch.s(`the episode, ${minW}-${maxW} words`),
                summary: Sch.s('one sentence'),
                questions: Sch.a(Sch.o({ skill: Sch.e(['gist', 'detail', 'inference'], 'type'), q: Sch.s('question'), answer: Sch.s('correct answer'), wrong1: Sch.s('believable wrong answer'), wrong2: Sch.s('believable wrong answer') }), 'exactly 3', 3, 3)
            }),
            check: j => {
                const out = [], x = String(j.story || ''), wc = countWords(x);
                if (wc < minW * 0.9 || wc > maxW * 1.15) out.push(`Story has ${wc} words: it must have ${minW} to ${maxW}.`);
                const missing = must.filter(c => !appears(x, c, 0.8));
                if (missing.length > 1) out.push(`These phrases are missing from the story (use them word for word): ${missing.map(c => `"${c}"`).join(', ')}.`);
                if (!plan.recycle.some(r => appears(x, r, 0.8))) out.push(`Use at least one recycled phrase: ${plan.recycle.map(c => `"${c}"`).join(', ')}.`);
                const long = sentenceLens(x).filter(l => l > lvl.max + 4);
                if (long.length > 2) out.push(`${long.length} sentences are too long: max ${lvl.max} words per sentence.`);
                if (!/["“]/.test(x)) out.push('The story needs dialogue in quotes.');
                const qs = Array.isArray(j.questions) ? j.questions : [];
                if (qs.length !== 3) out.push('Exactly 3 questions.');
                qs.forEach((q, i) => {
                    const a = countWords(q.answer), w = (countWords(q.wrong1) + countWords(q.wrong2)) / 2;
                    if (a > w * 1.7 + 2) out.push(`Question ${i + 1}: the correct answer is much longer than the wrong ones. Make them similar.`);
                    if ([q.wrong1, q.wrong2].some(o => words(o).join(' ') === words(q.answer).join(' '))) out.push(`Question ${i + 1}: a wrong answer equals the right one.`);
                });
                return out;
            },
            hard: issues => issues.some(m => /words: it must/.test(m) && /Story has (\d+)/.test(m) && +m.match(/Story has (\d+)/)[1] < minW * 0.6)
        };
    },
    // One turn of a role-play (fast: no repair pass)
    rpTurn({ sc, turn, turns, lastUser }) {
        const lvl = levelRules(contentLevel());
        const targets = recentPhrases(6).concat(weakPhrases(3)).slice(0, 6);
        return {
            temp: 0.8, think: 'off', repair: false,
            task: `ROLE-PLAY. You play: ${sc.role}
Learner's goal: ${sc.goal}. Turn ${turn} of ${turns}.
Partner rules:
- Stay in character. Reply in 1 to 3 short sentences (max 40 words), ${lvl.tag} level, and end with ONE question that makes the learner talk.
- Adapt: if the last answer was very short or unclear, ask an easier either/or question. If it was long and good, raise the challenge a little (a complication, a "why", a number).
- Around turns ${Math.ceil(turns / 2)} and ${turns - 1}, add a realistic complication from the scenario.
- Create chances for the learner to use: ${targets.length ? targets.map(x => `"${x}"`).join(', ') : 'phrases about the theme'}. Never say them yourself first.
- If the learner wrote French, answer in simple English and put their idea in English in "fix".
- fix: check ONLY the learner's LAST message. Use null if it is fine or the only issues are typos. Otherwise one fix following rule 6.`,
            schema: Sch.o({ analysis: Sch.s('HIDDEN, max 30 words: how good was the last answer, what you do next'), reply: Sch.s('your line in character'), fix: Object.assign({}, FIX, { nullable: true }) }, { optional: ['fix'] }),
            clean: j => {
                j.reply = clip(j.reply || '…', 400);
                if (j.fix && (!j.fix.wrong || !j.fix.right || !(appears(lastUser, j.fix.wrong, 0.7) || /[àâçéèêëîïôûùüÿœ]/i.test(lastUser)) || words(j.fix.wrong).join(' ') === words(j.fix.right).join(' '))) j.fix = null;
                return j;
            }
        };
    },
    rpSummary({ sc, transcript, learnerText }) {
        return {
            temp: 0.4, think: 'low',
            task: `Talk · Notice · Improve. Review the whole role-play "${sc.t}" (goal: ${sc.goal}). Was the goal reached? What phrases did the learner NEED but not have? Which mistakes repeat?`,
            user: transcript,
            schema: Sch.o({
                analysis: ANALYSIS,
                goal_reached: Sch.b('did the learner reach the goal'),
                wins: Sch.a(Sch.s("specific strength quoting the learner's words"), 'exactly 2', 2, 2),
                mistakes: Sch.a(FIX, '0 to 3, recurring or important first', 0, 3),
                notes: Sch.a(PHRASE, 'exactly 3 phrases the learner needed or should reuse', 3, 3),
                next: Sch.s('one sentence: what to work on next time'),
                scores: Sch.o({ flow: Sch.i('0-10', 0, 10), clarity: Sch.i('0-10', 0, 10), accuracy: Sch.i('0-10', 0, 10) })
            }),
            check: j => checkFixes(j.mistakes, learnerText).concat((j.wins || []).some(w => GENERIC.test(w)) ? ['wins must be specific, no generic praise.'] : []),
            clean: j => { j.mistakes = validFixes(j.mistakes, learnerText); j.notes = (j.notes || []).filter(x => x && x.en).slice(0, 3); return j; }
        };
    },
    // Weekly diagnosis: sets the coach focus for the next 7 days
    weekly() {
        const last7 = []; for (let i = 7; i >= 1; i--) { const d = addDays(today(), -i), n = dayNum(d); if (n >= 1) last7.push(`${d}: ${isComplete(d) ? 'complete' : 'MISSED'}, ${Math.round((S.days[d] || {}).minutes || 0)} min`); }
        const mist = S.mistakes.slice(-25).map(m => `[${m.type}] "${clip(m.wrong, 70)}" → "${clip(m.right, 70)}"`);
        return {
            temp: 0.4, think: 'high',
            task: `WEEKLY DIAGNOSIS. You are the learner's personal coach. Study all the data and decide the plan for the next 7 days.
- diagnosis: 2 or 3 sentences, honest, with numbers from the data.
- focus: the ONE mistake type that will give the biggest gain this week (most frequent and most harmful for talking with clients).
- priorities: exactly 3. Priority 1 targets the weakest skill. Each has evidence (a number or a quote from the data) and a daily action of max 10 minutes that fits in the app (cards, episode, reflex, write, shadowing, 4/3/2, role-play).
- drill: 5 short sentences about tech, business or travel that contain the focus mistake THE WAY THIS LEARNER MAKES IT, with the corrected version.
- phrases: 3 phrases that would make the learner sound more natural, based on their goals.`,
            user: `LAST 7 DAYS:\n${last7.join('\n') || 'no data'}\nLAST MISTAKES:\n${mist.join('\n') || 'none logged yet'}`,
            schema: Sch.o({
                analysis: Sch.s('HIDDEN notes, max 100 words, written first: patterns you see in the data'),
                diagnosis: Sch.s('2-3 sentences with numbers'),
                strengths: Sch.a(Sch.s('real strength from the data'), 'exactly 2', 2, 2),
                focus: Sch.e(ERR_TYPES, 'the one mistake type to fix this week'),
                focus_why: Sch.s('max 20 words'),
                priorities: Sch.a(Sch.o({ what: Sch.s('short title'), evidence: Sch.s('number or quote from the data'), action: Sch.s('daily action, max 10 minutes') }), 'exactly 3', 3, 3),
                drill: Sch.a(Sch.o({ wrong: Sch.s('sentence with the mistake'), right: Sch.s('corrected sentence') }), 'exactly 5', 5, 5),
                phrases: Sch.a(PHRASE, 'exactly 3', 3, 3)
            }),
            check: j => {
                const out = [];
                if ((j.priorities || []).length !== 3) out.push('Exactly 3 priorities.');
                const dr = (j.drill || []).filter(d => d && d.wrong && d.right && words(d.wrong).join(' ') !== words(d.right).join(' '));
                if (dr.length < 5) out.push('drill needs 5 items where "wrong" really differs from "right".');
                if (GENERIC.test(JSON.stringify(j.strengths || []))) out.push('strengths must be specific.');
                return out;
            },
            clean: j => { j.drill = (j.drill || []).filter(d => d && d.wrong && d.right && words(d.wrong).join(' ') !== words(d.right).join(' ')).slice(0, 5); return j; }
        };
    },
    // Month 3: prepares a real-world mission
    mission({ m }) {
        return {
            temp: 0.6, think: 'low',
            task: `REAL-WORLD MISSION: "${m.t}" — ${m.do}
Prepare the learner to do it today, at their level. Their content must sound like them: a young tech and business person from Cameroon. Do not invent personal facts: use [brackets] for details they must fill in (e.g. [your app's name]).`,
            user: '(Prepare me.)',
            schema: Sch.o({
                analysis: ANALYSIS,
                steps: Sch.a(Sch.s('one short step'), '3 steps', 3, 3),
                script: Sch.s('what to say or write, ready to use, max 90 words, with [brackets] for personal details'),
                phrases: Sch.a(PHRASE, 'exactly 3 key phrases', 3, 3),
                rescue: Sch.s('what to say if they get stuck or do not understand')
            }),
            check: j => countWords(j.script) > 120 ? ['script is too long: max 90 words.'] : []
        };
    }
};
function checkFixes(fixes, src) {
    const out = [];
    (fixes || []).forEach(f => {
        if (!f || !f.wrong) return;
        if (!appears(src, f.wrong, 0.7)) out.push(`Fix "${clip(f.wrong, 60)}" is not an exact quote of the learner. Quote their exact words or remove this fix.`);
        else if (words(f.wrong).join(' ') === words(f.right).join(' ')) out.push(`Fix "${clip(f.wrong, 60)}": "right" is the same as "wrong". Remove it.`);
    });
    return out;
}
function checkWin(win, src) {
    if (!win) return ['"win" is empty.'];
    if (GENERIC.test(win)) return ['"win" is generic praise. Quote the learner and say why it works.'];
    const q = (String(win).match(/["“']([^"”']{4,})["”']/) || [])[1];
    if (q && !appears(src, q, 0.7)) return ['"win" quotes words the learner did not say.'];
    return [];
}
function validFixes(fixes, src) {
    return (Array.isArray(fixes) ? fixes : []).filter(f => f && f.wrong && f.right && appears(src, f.wrong, 0.7) && words(f.wrong).join(' ') !== words(f.right).join(' ')).slice(0, 3)
        .map(f => Object.assign(f, { type: ERR_TYPES.includes(String(f.type).toLowerCase()) ? String(f.type).toLowerCase() : 'other' }));
}

const Brain = {
    log: [],
    async run(name, input = {}, extraMessages = null) {
        const spec = AITASKS[name](input);
        const lvl = levelRules(contentLevel());
        const system = `${constitution(lvl)}\n\nTASK\n${spec.task}\n\n${dossier()}`;
        const messages = extraMessages || [{ role: 'user', text: spec.user || '(Go.)' }];
        const opts = { system, messages, json: true, schema: spec.schema, temp: spec.temp, think: spec.think };
        let j = await AI.ask(opts);
        let issues = spec.check ? spec.check(j) : [];
        let repaired = false;
        if (issues.length && spec.repair !== false) {
            try {
                const j2 = await AI.ask(Object.assign({}, opts, { temp: 0.3, messages: messages.concat([
                    { role: 'model', text: JSON.stringify(j) },
                    { role: 'user', text: `QUALITY CHECK FAILED:\n- ${issues.join('\n- ')}\nReturn the complete JSON again with these problems fixed. Keep everything that was already correct.` }
                ]) }));
                const i2 = spec.check(j2);
                if (i2.length <= issues.length) { j = j2; issues = i2; repaired = true; }
            } catch (e) { /* keep the first answer */ }
        }
        if (spec.hard && spec.hard(issues)) throw new Error('The AI answer did not pass the quality check. Try again.');
        if (spec.clean) j = spec.clean(j);
        this.log.unshift({ at: new Date().toLocaleTimeString(), task: name, issues: issues.length, repaired });
        this.log = this.log.slice(0, 20);
        delete j.analysis;
        return j;
    }
};

// ---------- daily AI episode (days 31–90): PLAN → WRITE → CHECK → REPAIR ----------
const aiDayPending = {};
async function ensureAIDay(n) {
    if (phaseOf(n) < 2 || !AI.hasKey()) return null;
    if (S.aiDays[n] && S.aiDays[n].story) return S.aiDays[n];
    if (aiDayPending[n]) return aiDayPending[n];
    aiDayPending[n] = (async () => {
        const plan = await Brain.run('episodePlan', { n });
        if (!plan.new_chunks || plan.new_chunks.length < 4) throw new Error('bad plan');
        const ep = await Brain.run('episodeWrite', { n, plan });
        if (!ep.story || countWords(ep.story) < 80) throw new Error('bad episode');
        const q = (ep.questions || []).filter(x => x && x.q && x.answer && x.wrong1 && x.wrong2).slice(0, 3).map(x => [x.q, x.answer, x.wrong1, x.wrong2]);
        const day = {
            story: { t: clip(ep.title, 60) || themeOf(n).t, x: String(ep.story).trim(), q },
            chunks: plan.new_chunks.map(c => ({ en: clip(c.en, 80), fr: clip(c.fr, 120), use: clip(c.use, 160) })),
            sum: clip(ep.summary, 240), objective: clip(plan.objective, 160), focus: clip(plan.grammar_focus, 160), v: 2
        };
        if (S.aiDays[n] && S.aiDays[n].story) return S.aiDays[n];   // the other device was faster
        S.aiDays[n] = day; save();
        return day;
    })().finally(() => { delete aiDayPending[n]; });
    return aiDayPending[n];
}

// ---------- weekly coach report (cached per week, synced) ----------
function weekKey(d = today()) { const n = dayNum(d); return n >= 1 ? 'w' + Math.ceil(n / 7) : 'w0-' + d.slice(0, 7); }
let weeklyPending = null;
async function ensureWeekly(force = false) {
    if (!AI.hasKey()) return null;
    const wk = weekKey();
    if (!force && S.coach.week === wk && S.coach.report) return S.coach.report;
    if (weeklyPending) return weeklyPending;
    weeklyPending = Brain.run('weekly').then(r => {
        S.coach = { week: wk, at: today(), focus: r.focus, focusWhy: r.focus_why, report: r };
        save();
        return r;
    }).finally(() => { weeklyPending = null; });
    return weeklyPending;
}
function logMistakes(list, src) {
    (list || []).slice(0, 4).forEach(m => { if (m && m.wrong && m.right) S.mistakes.push({ wrong: String(m.wrong).slice(0, 200), right: String(m.right).slice(0, 200), why: String(m.why || '').slice(0, 200), type: String(m.type || 'other').toLowerCase().slice(0, 40), date: today(), src }); });
    if (S.mistakes.length > 300) S.mistakes = S.mistakes.slice(-300);
}
function topMistakeTypes(days = 14) {
    const from = addDays(today(), -days), cnt = {};
    S.mistakes.filter(m => m.date >= from).forEach(m => { cnt[m.type] = (cnt[m.type] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
}
