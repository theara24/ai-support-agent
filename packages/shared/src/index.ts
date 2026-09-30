import { UserRole, Permission } from '@ai-support/types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.CONVERSATION_ASSIGN,
    Permission.CONVERSATION_TAKEOVER,
    Permission.TICKET_CREATE,
    Permission.TICKET_UPDATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_WRITE,
    Permission.ANALYTICS_READ,
    Permission.USER_MANAGE
  ],
  [UserRole.SUPPORT_AGENT]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.CONVERSATION_ASSIGN,
    Permission.CONVERSATION_TAKEOVER,
    Permission.TICKET_CREATE,
    Permission.TICKET_UPDATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.ANALYTICS_READ
  ],
  [UserRole.CUSTOMER]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.TICKET_CREATE
  ]
};

export const DEFAULT_AI_SYSTEM_PROMPT = `
You are a versatile, intelligent enterprise AI assistant representing the organization. You help customers, clients, and visitors with general inquiries, organization services, knowledge base information, issues, and support.

Instructions:
1. Use general model knowledge for general questions (greetings, definitions, technology, mathematics, educational topics).
2. Use verified organizational knowledge retrieval (RAG) when the question depends on organization services, programs, policies, pricing, procedures, or specifics.
3. Use tools when real-time information or an action is required (e.g. checking current time/date, querying records/status, creating support tickets, escalating to human support).
4. Never invent real-time or private information.
5. Never expose internal notes, private system information, credentials, API keys, or hidden business data.
6. When a user asks to speak with a human or expresses extreme frustration, use the human-handoff workflow.
7. Always maintain a professional, helpful, and courteous tone.
8. Language Policy (STRICT):
   - When the user writes in Khmer (ភាសាខ្មែរ), you MUST respond ONLY in 100% natural, polite Khmer language (ភាសាខ្មែរ). Use proper Khmer greetings like "សួស្តី!" or "សូមជម្រាបសួរ!".
   - CRITICAL CONSTRAINT: DO NOT use or mix any Thai characters, Thai script (ภาษาไทย), or Thai words (such as สวัสดี, ครับ, ค่ะ, มี, ฯลฯ). You are strictly forbidden from outputting any Thai characters or words. Only use Khmer (ខ្មែរ) or English.
   - When the user writes in English, respond in clear, professional English.
   - When answering using verified organizational knowledge excerpts, cite the source document name.
`;

export interface ChunkOptions {
  maxChunkSize?: number; // Target chunk size, e.g. 750 (600–800 chars)
  overlap?: number;      // Overlap size, e.g. 120 (100–150 chars)
}

/**
 * Recursive paragraph- and sentence-aware chunker with overlap.
 * Respects:
 * - Paragraphs (\n\n)
 * - Lines (\n)
 * - Khmer sentences: Khan (។) and Bariyoosan (៕)
 * - Latin sentences (. ? !)
 * - Whitespace and clause breaks
 * Avoids breaking words or Unicode combining sequences (critical for Khmer).
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChunkSize = options.maxChunkSize ?? 750;
  const overlap = options.overlap ?? 120;

  if (!text || !text.trim()) {
    return [];
  }

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (normalized.length <= maxChunkSize) {
    return [normalized];
  }

  const delimiters = [
    '\n\n',
    '\n',
    '។', // Khmer sentence boundary (khan)
    '៕', // Khmer discourse boundary
    '. ',
    '? ',
    '! ',
    '; ',
    ' ',
  ];

  function splitIntoSegments(content: string, delimiterIdx: number): string[] {
    if (content.length <= maxChunkSize) {
      return [content];
    }
    if (delimiterIdx >= delimiters.length) {
      const slices: string[] = [];
      const step = Math.max(1, maxChunkSize - overlap);
      for (let i = 0; i < content.length; i += step) {
        slices.push(content.slice(i, i + maxChunkSize));
      }
      return slices;
    }

    const delimiter = delimiters[delimiterIdx];
    let rawParts: string[];

    if (delimiter === '។' || delimiter === '៕') {
      rawParts = content
        .split(delimiter)
        .map((p, idx, arr) => (idx < arr.length - 1 ? p + delimiter : p))
        .filter((p) => p.trim().length > 0);
    } else if (delimiter === '. ' || delimiter === '? ' || delimiter === '! ' || delimiter === '; ') {
      const mark = delimiter[0];
      rawParts = content
        .split(delimiter)
        .map((p, idx, arr) => (idx < arr.length - 1 ? p + mark : p))
        .filter((p) => p.trim().length > 0);
    } else {
      rawParts = content.split(delimiter);
    }

    if (rawParts.length <= 1) {
      return splitIntoSegments(content, delimiterIdx + 1);
    }

    const segments: string[] = [];
    for (const part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.length <= maxChunkSize) {
        segments.push(trimmed);
      } else {
        segments.push(...splitIntoSegments(trimmed, delimiterIdx + 1));
      }
    }
    return segments;
  }

  const atomicSegments = splitIntoSegments(normalized, 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const segment of atomicSegments) {
    if (!currentChunk) {
      currentChunk = segment;
      continue;
    }

    const candidate = `${currentChunk}\n\n${segment}`;
    if (candidate.length <= maxChunkSize) {
      currentChunk = candidate;
    } else {
      chunks.push(currentChunk.trim());

      if (overlap > 0 && currentChunk.length > overlap) {
        const tail = currentChunk.slice(-overlap);
        const breakIdx = tail.search(/[\s\n។.!?]/);
        const overlapText =
          breakIdx !== -1 && breakIdx < tail.length - 10
            ? tail.slice(breakIdx + 1).trim()
            : tail.trim();

        currentChunk = overlapText ? `${overlapText}\n\n${segment}` : segment;
      } else {
        currentChunk = segment;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 0);
}


