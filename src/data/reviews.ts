export interface GuestReview {
    review: {
        score: number;
        text: string;
    };
    createdAt: string;
    author: {
        name: string;
    };
}

export interface VisibleReview {
    score: number;
    text: string;
    createdAt: string;
    authorName: string;
    dateLabel: string;
    scoreText: string;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+|00|0)(?:[\s().-]*\d){7,14}/g;

/** Review text safe to print: no email address or phone number. */
export function publicReviewText(text: string): string {
    return String(text || '')
        .replace(EMAIL, '')
        .replace(PHONE, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([.,!?])/g, '$1')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** First name plus the initial of the last name, for example "Sara R." */
export function reviewerName(name: string): string {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0];
    if (parts.length === 1) return first;
    const last = parts[parts.length - 1].replace(/\./g, '');
    const initial = [...last][0];
    if (!initial) return first;
    return `${first} ${initial.toLocaleUpperCase('sv-SE')}.`;
}

export function reviewDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

export function scoreLabel(score: number): string {
    const formatted = Number.isInteger(score)
        ? String(score)
        : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(score);
    return `${formatted} av 5`;
}

export function ratingSummary(reviews: GuestReview[]): { average: number; count: number; label: string } | null {
    if (!Array.isArray(reviews) || reviews.length === 0) return null;
    const scores = reviews
        .map((item) => item?.review?.score)
        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
    if (scores.length !== reviews.length) return null;
    const count = reviews.length;
    const average = scores.reduce((sum, score) => sum + score, 0) / count;
    const averageLabel = new Intl.NumberFormat('sv-SE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(average);
    const noun = count === 1 ? 'omdöme' : 'omdömen';
    return {
        average,
        count,
        label: `${averageLabel} av 5 · ${count} ${noun}`
    };
}

/** Reviews with text, newest first. Empty text still counts toward the average. */
export function visibleReviews(reviews: GuestReview[]): VisibleReview[] {
    if (!Array.isArray(reviews)) return [];
    const visible: VisibleReview[] = [];
    for (const item of reviews) {
        const text = publicReviewText(item?.review?.text ?? '');
        const score = item?.review?.score;
        const createdAt = item?.createdAt;
        const authorName = reviewerName(item?.author?.name ?? '');
        const dateLabel = createdAt ? reviewDate(createdAt) : '';
        if (!text || typeof score !== 'number' || !Number.isFinite(score) || !createdAt || !authorName || !dateLabel) {
            continue;
        }
        visible.push({
            score,
            text,
            createdAt,
            authorName,
            dateLabel,
            scoreText: scoreLabel(score)
        });
    }
    visible.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return visible;
}
