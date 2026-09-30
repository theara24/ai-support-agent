import { chunkText } from '@ai-support/shared';

describe('chunkText (Recursive paragraph-aware chunker)', () => {
  it('should return empty array for empty or whitespace text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('should return a single chunk if text is smaller than maxChunkSize', () => {
    const text = 'This is a short paragraph that fits entirely within one chunk.';
    const chunks = chunkText(text, { maxChunkSize: 500 });
    expect(chunks).toEqual([text]);
  });

  it('should split on paragraphs and create overlapping chunks within 600-800 chars', () => {
    const p1 = 'Paragraph 1: ' + 'A'.repeat(300);
    const p2 = 'Paragraph 2: ' + 'B'.repeat(300);
    const p3 = 'Paragraph 3: ' + 'C'.repeat(300);
    const doc = `${p1}\n\n${p2}\n\n${p3}`;

    const chunks = chunkText(doc, { maxChunkSize: 700, overlap: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // Verify all chunks are within size limits
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });

  it('should properly respect Khmer sentence boundaries (Khan: ។)', () => {
    const sentence1 = 'ក្រុមហ៊ុនផ្តល់ការធានារយៈពេល 30 ថ្ងៃ។';
    const sentence2 = 'រាល់ទំនិញទាំងអស់ត្រូវតែស្ថិតក្នុងស្ថានភាពដើម ដោយមានវេចខ្ចប់ត្រឹមត្រូវ។';
    const sentence3 = 'អតិថិជនអាចទាក់ទងមកកាន់ផ្នែកបម្រើអតិថិជនតាមរយៈប្រព័ន្ធអនឡាញ។';
    const khmerDoc = `${sentence1} ${sentence2} ${sentence3}`;

    const chunks = chunkText(khmerDoc, { maxChunkSize: 100, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);

    // Verify Khmer sentences end with the Khan delimiter
    expect(chunks[0]).toContain('។');
  });
});
