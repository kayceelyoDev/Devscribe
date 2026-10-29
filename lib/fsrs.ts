import { fsrs, Rating, State, Card as FSRSCard } from "ts-fsrs";

const scheduler = fsrs();

export { Rating, State };

export type FSRSRating = 1 | 2 | 3 | 4;

export interface DbFlashcard {
  id: string;
  front: string;
  back: string;
  codeSnippet?: string | null;
  tags: string[];
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview?: Date | null;
}

export function toFSRSCard(card: DbFlashcard): FSRSCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: 0,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

export function reviewCard(
  card: DbFlashcard,
  rating: FSRSRating,
  reviewTime = new Date()
) {
  const fsrsCard = toFSRSCard(card);
  const schedulingRecords = scheduler.repeat(fsrsCard, reviewTime);
  const record = (schedulingRecords as unknown as Record<number, any>)[rating];

  if (!record) {
    throw new Error(`Invalid rating: ${rating}`);
  }

  return {
    due: record.card.due,
    stability: record.card.stability,
    difficulty: record.card.difficulty,
    elapsedDays: card.lastReview
      ? Math.max(0, Math.floor((reviewTime.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)))
      : 0,
    scheduledDays: record.card.scheduled_days,
    reps: record.card.reps,
    lapses: record.card.lapses,
    state: record.card.state,
    lastReview: record.card.last_review ?? reviewTime,
  };
}

export function formatAnkiCsv(cards: DbFlashcard[]): string {
  const escapeCsv = (str: string) => {
    let clean = (str || "").replace(/"/g, '""');
    if (clean.includes(",") || clean.includes("\n") || clean.includes('"')) {
      return `"${clean}"`;
    }
    return clean;
  };

  const rows = cards.map((c) => {
    let backContent = c.back;
    if (c.codeSnippet) {
      backContent += `\n<pre><code>${c.codeSnippet}</code></pre>`;
    }
    const tags = (c.tags || []).join(" ");
    return `${escapeCsv(c.front)},${escapeCsv(backContent)},${escapeCsv(tags)}`;
  });

  return ["#separator:Comma", "#html:true", "#tags column:3", ...rows].join("\n");
}
