export interface QAEntry {
  id?: string;
  question: string;
  answer: string;
}

interface ScoredQA extends QAEntry {
  score: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "to", "of",
  "in", "on", "at", "for", "with", "by", "from", "as", "into", "about",
  "it", "its", "this", "that", "these", "those", "i", "me", "my", "you",
  "your", "we", "our", "he", "him", "his", "she", "her", "they", "them",
  "their", "and", "or", "but", "not", "if", "then", "so", "no", "yes",
  "what", "which", "who", "whom", "when", "where", "how", "why", "all",
  "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "than", "too", "very", "just", "also", "up", "out", "do", "did", "done",
]);

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function computeScore(questionTokens: string[], qaQuestionTokens: string[]): number {
  if (questionTokens.length === 0 || qaQuestionTokens.length === 0) return 0;
  const qaSet = new Set(qaQuestionTokens);
  let overlap = 0;
  for (const token of questionTokens) {
    if (qaSet.has(token)) overlap++;
  }
  // Jaccard-like with bias toward the question's coverage
  const union = new Set([...questionTokens, ...qaQuestionTokens]).size;
  if (union === 0) return 0;
  return overlap / union;
}

export function retrieveRelevantQAs(
  question: string,
  qas: QAEntry[],
  topN: number = 3
): QAEntry[] {
  if (!qas || qas.length === 0) return [];
  const questionTokens = tokenize(question);
  if (questionTokens.length === 0) return [];

  const scored: ScoredQA[] = qas.map((qa) => ({
    ...qa,
    score: computeScore(questionTokens, tokenize(qa.question)),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).filter((qa) => qa.score > 0);
}
