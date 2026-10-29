export type ChunkCandidate = {
  id: string;
  documentId: string;
  content: string;
  heading?: string | null;
  tokenCount: number;
  embedding?: any;
};

export function keywordScore(query: string, chunk: string): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedChunk = chunk.toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter((t) => t.length > 2);

  if (!terms.length) {
    return 0;
  }

  let totalScore = 0;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}`, "g");
    const matches = normalizedChunk.match(regex)?.length ?? 0;
    totalScore += matches;
  }

  return totalScore;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || !a.length || !b.length || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export function rankRelevantChunks(
  query: string,
  chunks: ChunkCandidate[],
  queryEmbedding?: number[] | null,
  topN = 5
) {
  return [...chunks]
    .map((chunk) => {
      let semanticScore = 0;
      if (queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length === queryEmbedding.length) {
        semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      }
      const lexicalScore = keywordScore(query, chunk.content);
      const score = lexicalScore * 1.5 + semanticScore * 3;

      return { ...chunk, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topN);
}

export function chunkDocumentText(
  rawText: string,
  maxTokens = 800
): Array<{ content: string; heading?: string; tokenCount: number }> {
  const paragraphs = rawText.split(/\n\s*\n/);
  const chunks: Array<{ content: string; heading?: string; tokenCount: number }> = [];

  let currentChunk = "";
  let currentHeading = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#") || (trimmed.length < 80 && !trimmed.endsWith("."))) {
      currentHeading = trimmed.replace(/^#+\s*/, "");
    }

    const approxTokens = (currentChunk.length + trimmed.length) / 4;

    if (approxTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        heading: currentHeading || undefined,
        tokenCount: Math.round(currentChunk.length / 4),
      });
      currentChunk = trimmed + "\n\n";
    } else {
      currentChunk += trimmed + "\n\n";
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      heading: currentHeading || undefined,
      tokenCount: Math.round(currentChunk.length / 4),
    });
  }

  return chunks;
}
