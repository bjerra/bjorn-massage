import {
    MUSCLE_CARDS,
    buildQuiz,
    cardKicker,
    evidenceLabel,
    feedbackText,
    modeHelp,
    practiceResult,
    questionKicker,
    quizResult,
    scoreLine,
    shuffle,
    type MuscleCard,
    type QuizQuestion
} from '../data/muskelspel';

type Mode = 'quiz' | 'cards';

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function latinSpan(name: string, className?: string): HTMLSpanElement {
    const span = el('span', className, name);
    span.translate = false;
    return span;
}

function button(className: string, text: string): HTMLButtonElement {
    const node = el('button', className, text);
    node.type = 'button';
    return node;
}

function modeFromHash(hash: string): Mode {
    return hash === '#ovningslage' ? 'cards' : 'quiz';
}

function focusSoon(node: HTMLElement | null): void {
    if (!node) return;
    requestAnimationFrame(() => node.focus());
}

export function mountMuskelspel(doc: Document = document): void {
    if (doc.documentElement.dataset.muskelspel === 'ready') return;
    const stage = doc.getElementById('play-stage');
    const live = doc.getElementById('play-live');
    const heading = doc.getElementById('play-heading');
    const help = doc.querySelector<HTMLElement>('[data-help]');
    const modeButtons = [...doc.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    if (!(stage instanceof HTMLElement) || !(live instanceof HTMLElement) || !(heading instanceof HTMLElement)) return;
    if (modeButtons.length === 0 || !help) return;
    doc.documentElement.dataset.muskelspel = 'ready';

    let mode: Mode = modeFromHash(doc.location.hash);
    let sessionBest = 0;

    const setLive = (text: string) => {
        live.textContent = text;
    };

    const setMode = (next: Mode, updateHash: boolean) => {
        mode = next;
        heading.textContent = next === 'quiz' ? 'Snabbquiz' : 'Övningsläge';
        help.textContent = modeHelp(next);
        for (const item of modeButtons) {
            item.setAttribute('aria-pressed', item.dataset.mode === next ? 'true' : 'false');
        }
        if (updateHash) {
            const hash = next === 'cards' ? '#ovningslage' : '#snabbquiz';
            doc.defaultView?.history.replaceState(null, '', hash);
        }
        setLive('');
        if (next === 'quiz') renderQuiz();
        else renderCards(MUSCLE_CARDS);
    };

    const renderQuiz = () => {
        const questions = buildQuiz();
        let index = 0;
        let correct = 0;
        let streak = 0;
        let locked = false;

        const paint = (moveFocus: boolean) => {
            const question = questions[index];
            if (!question) {
                paintResult();
                return;
            }
            locked = false;
            const face = el('div', 'play-face');
            const meta = el('div', 'play-meta');
            meta.append(
                el('p', 'play-kicker', questionKicker(index + 1, questions.length, question.kind)),
                el('p', 'play-kicker', scoreLine(correct, streak))
            );
            const prompt = el('h3', 'play-prompt', question.prompt);
            prompt.id = 'play-q';
            prompt.tabIndex = -1;
            const lead = el('p', 'play-lead', question.lead);
            const group = el('div', 'play-choices');
            group.setAttribute('role', 'group');
            group.setAttribute('aria-labelledby', 'play-q');
            const choices = question.options.map((name) => {
                const choice = button('play-choice', '');
                choice.dataset.latin = name;
                choice.append(latinSpan(name));
                choice.addEventListener('click', () => answer(question, name, choices));
                return choice;
            });
            group.append(...choices);
            face.append(meta, prompt, lead, group);
            stage.replaceChildren(face);
            if (moveFocus) focusSoon(prompt);
        };

        const answer = (question: QuizQuestion, picked: string, choices: HTMLButtonElement[]) => {
            if (locked) return;
            locked = true;
            const ok = picked === question.answerLatin;
            if (ok) {
                correct += 1;
                streak += 1;
                sessionBest = Math.max(sessionBest, streak);
            } else {
                streak = 0;
            }
            for (const choice of choices) {
                const name = choice.dataset.latin ?? '';
                choice.disabled = true;
                if (name === question.answerLatin) {
                    choice.classList.add('is-correct');
                    choice.append(el('span', 'play-tag', 'Rätt svar'));
                } else if (name === picked) {
                    choice.classList.add('is-picked');
                    choice.append(el('span', 'play-tag', 'Ditt val'));
                }
            }
            const text = feedbackText(question, ok);
            const feedback = el('div', 'play-feedback');
            feedback.append(el('p', undefined, text));
            const next = button('btn', index === questions.length - 1 ? 'Visa resultat' : 'Nästa fråga');
            next.addEventListener('click', () => {
                index += 1;
                setLive('');
                paint(true);
            });
            feedback.append(next);
            stage.querySelector('.play-face')?.append(feedback);
            const score = stage.querySelector('.play-meta');
            const scoreNode = score?.lastElementChild;
            if (scoreNode) scoreNode.textContent = scoreLine(correct, streak);
            setLive(text);
            focusSoon(next);
        };

        const paintResult = () => {
            const result = quizResult(correct, questions.length, sessionBest);
            const face = el('div', 'play-face');
            const title = el('h3', 'play-prompt', 'Omgången är klar');
            title.tabIndex = -1;
            const score = el('p', 'play-result-score', result.score);
            const streakText = el('p', 'play-lead', result.streak);
            const note = el('p', 'play-note-inline', 'Övningen ställer ingen diagnos.');
            const actions = el('div', 'play-actions');
            const again = button('btn', 'Ny omgång');
            again.addEventListener('click', () => renderQuiz());
            const cards = button('play-ghost', 'Till övningsläge');
            cards.addEventListener('click', () => setMode('cards', true));
            actions.append(again, cards);
            face.append(title, score, streakText, note, actions);
            stage.replaceChildren(face);
            setLive(`${result.score}. ${result.streak} Övningen ställer ingen diagnos.`);
            focusSoon(title);
        };

        paint(false);
    };

    const renderCards = (source: readonly MuscleCard[]) => {
        const deck = shuffle(source, Math.random);
        let index = 0;
        const marks: Array<'known' | 'unsure'> = [];

        const knownCount = () => marks.filter((mark) => mark === 'known').length;

        const paint = (revealed: boolean, moveFocus: boolean) => {
            const card = deck[index];
            if (!card) {
                paintResult();
                return;
            }
            const face = el('div', 'play-face');
            const meta = el('p', 'play-kicker', cardKicker(index + 1, deck.length));
            if (marks.length > 0) meta.textContent = `${meta.textContent} · ${knownCount()} kunde`;
            const title = el('h3', 'play-prompt');
            title.tabIndex = -1;
            title.append(latinSpan(card.latin));
            face.append(meta, title);
            if (card.latinDetail) {
                const detail = el('p', 'play-detail');
                detail.append(latinSpan(card.latinDetail));
                face.append(detail);
            }
            if (!revealed) {
                face.append(el('p', 'play-lead', 'Försök säga utstrålning och stretch innan du vänder.'));
                const show = button('btn', 'Visa baksida');
                show.addEventListener('click', () => paint(true, true));
                face.append(show);
                stage.replaceChildren(face);
                if (moveFocus) focusSoon(title);
                return;
            }

            face.append(el('p', 'play-chip', evidenceLabel(card.evidence)));
            const referralLabel = el('h4', 'play-label', 'Utstrålning');
            referralLabel.tabIndex = -1;
            face.append(referralLabel, el('p', undefined, card.referral));
            face.append(el('h4', 'play-label', 'Stretch'));
            const cue = el('p', 'play-cue', card.stretchPrompt);
            face.append(cue, el('p', undefined, card.stretch));

            const more = el('details', 'play-more');
            more.append(el('summary', undefined, 'Mer på kortet: läge, förväxling, egenvård'));
            more.append(el('h4', 'play-label', 'Var triggerpunkten brukar beskrivas'));
            more.append(el('p', undefined, card.where));
            more.append(el('h4', 'play-label', 'Lätt att blanda ihop'));
            more.append(el('p', undefined, card.confuse));
            more.append(el('h4', 'play-label', 'På kortet'));
            more.append(el('p', undefined, card.training));
            face.append(more);

            const actions = el('div', 'play-actions');
            const knew = button('btn', 'Kunde');
            const unsure = button('play-ghost', 'Osäker');
            const hide = button('play-ghost', 'Visa framsida');
            const mark = (value: 'known' | 'unsure') => {
                marks[index] = value;
                index += 1;
                setLive(value === 'known' ? `${card.latin}. Markerad som kunde.` : `${card.latin}. Markerad som osäker.`);
                paint(false, true);
            };
            knew.addEventListener('click', () => mark('known'));
            unsure.addEventListener('click', () => mark('unsure'));
            hide.addEventListener('click', () => paint(false, true));
            actions.append(knew, unsure, hide);
            face.append(actions);
            stage.replaceChildren(face);
            setLive(`${card.latin}. Baksida. ${evidenceLabel(card.evidence)}.`);
            if (moveFocus) focusSoon(referralLabel);
        };

        const paintResult = () => {
            const known = knownCount();
            const unsureCards = deck.filter((_, cardIndex) => marks[cardIndex] === 'unsure');
            const face = el('div', 'play-face');
            const title = el('h3', 'play-prompt', 'Genomgången är klar');
            title.tabIndex = -1;
            face.append(title, el('p', 'play-lead', practiceResult(known, deck.length)));
            if (unsureCards.length > 0) {
                face.append(el('h4', 'play-label', 'Ta om'));
                const list = el('ul', 'play-again-list');
                for (const card of unsureCards) {
                    const item = el('li');
                    item.append(latinSpan(card.latin));
                    list.append(item);
                }
                face.append(list);
            }
            const note = el('p', 'play-note-inline', 'Övningen ställer ingen diagnos.');
            const actions = el('div', 'play-actions');
            if (unsureCards.length > 0) {
                const retry = button('btn', 'Ta om osäkra');
                retry.addEventListener('click', () => renderCards(unsureCards));
                actions.append(retry);
            }
            const all = button(unsureCards.length > 0 ? 'play-ghost' : 'btn', 'Alla kort igen');
            all.addEventListener('click', () => renderCards(MUSCLE_CARDS));
            const quiz = button('play-ghost', 'Till snabbquiz');
            quiz.addEventListener('click', () => setMode('quiz', true));
            actions.append(all, quiz);
            face.append(note, actions);
            stage.replaceChildren(face);
            setLive(`${practiceResult(known, deck.length)} Övningen ställer ingen diagnos.`);
            focusSoon(title);
        };

        paint(false, false);
    };

    for (const item of modeButtons) {
        item.addEventListener('click', () => {
            const next = item.dataset.mode === 'cards' ? 'cards' : 'quiz';
            if (next !== mode) setMode(next, true);
        });
    }

    setMode(mode, false);
}
