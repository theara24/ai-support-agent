'use client';

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

export function MarkdownMessage({ content, isUser = false, className = '' }: MarkdownMessageProps) {
  if (!content) return null;

  // Split content into blocks (code blocks vs text blocks)
  const blocks: Array<{ type: 'code' | 'text'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }
    blocks.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return (
    <div
      className={`space-y-2 text-sm leading-relaxed ${
        className ? className : isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'
      }`}
    >
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <div
              key={bIdx}
              className="my-2.5 rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto border border-slate-800"
            >
              {block.language && (
                <div className="text-xs text-slate-400 uppercase font-semibold mb-1 pb-1 border-b border-slate-800">
                  {block.language}
                </div>
              )}
              <pre className="whitespace-pre-wrap">{block.content}</pre>
            </div>
          );
        }

        return <TextBlock key={bIdx} text={block.content} isUser={isUser} />;
      })}
    </div>
  );
}

function TextBlock({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-sky-500">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-0.5">
              <InlineContent text={item} isUser={isUser} />
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-sky-600 font-medium">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-0.5">
              <InlineContent text={item} isUser={isUser} />
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Check for bullet list item (* or -)
    const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
    if (bulletMatch) {
      if (currentList && currentList.type !== 'ul') flushList();
      if (!currentList) currentList = { type: 'ul', items: [] };
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Check for numbered list item (1. 2. etc.)
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (currentList && currentList.type !== 'ol') flushList();
      if (!currentList) currentList = { type: 'ol', items: [] };
      currentList.items.push(numberMatch[1]);
      return;
    }

    // Empty line or regular line
    flushList();

    if (line.length === 0) {
      // Empty line adds natural spacing if between paragraphs
      return;
    }

    // Heading (### or ## or #)
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      if (level <= 2) {
        elements.push(
          <h3 key={`h-${idx}`} className="font-bold text-base text-slate-900 dark:text-slate-100 mt-2 mb-1">
            <InlineContent text={headingText} isUser={isUser} />
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h-${idx}`} className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1.5 mb-0.5">
            <InlineContent text={headingText} isUser={isUser} />
          </h4>
        );
      }
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${idx}`} className="my-1 leading-relaxed">
        <InlineContent text={rawLine} isUser={isUser} />
      </p>
    );
  });

  flushList();

  return <>{elements}</>;
}

function InlineContent({ text, isUser }: { text: string; isUser: boolean }) {
  // Regex pattern to tokenize:
  // 1. Bold & Italic: ***text***
  // 2. Bold: **text** or __text__
  // 3. Italic: *text* or _text_
  // 4. Inline code: `code`
  // 5. Links: [text](url)
  const tokens = parseInlineTokens(text);

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold-italic':
            return (
              <strong key={i} className="font-bold italic">
                {token.value}
              </strong>
            );
          case 'bold':
            return (
              <strong key={i} className={`font-semibold ${isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                {token.value}
              </strong>
            );
          case 'italic':
            return (
              <em key={i} className="italic">
                {token.value}
              </em>
            );
          case 'code':
            return (
              <code
                key={i}
                className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                  isUser
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {token.value}
              </code>
            );
          case 'link':
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline transition-opacity hover:opacity-80 ${isUser ? 'text-white' : 'text-sky-600'}`}
              >
                {token.value}
              </a>
            );
          default:
            return <React.Fragment key={i}>{token.value}</React.Fragment>;
        }
      })}
    </>
  );
}

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'bold-italic' | 'code' | 'link';
  value: string;
  href?: string;
}

function parseInlineTokens(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|__(.*?)__|`([^`]+)`|\[(.*?)\]\((.*?)\)|\*(.*?)\*|_(.*?)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: input.slice(lastIndex, match.index),
      });
    }

    if (match[2] !== undefined) {
      // ***bold-italic***
      tokens.push({ type: 'bold-italic', value: match[2] });
    } else if (match[3] !== undefined) {
      // **bold**
      tokens.push({ type: 'bold', value: match[3] });
    } else if (match[4] !== undefined) {
      // __bold__
      tokens.push({ type: 'bold', value: match[4] });
    } else if (match[5] !== undefined) {
      // `code`
      tokens.push({ type: 'code', value: match[5] });
    } else if (match[6] !== undefined && match[7] !== undefined) {
      // [text](url)
      tokens.push({ type: 'link', value: match[6], href: match[7] });
    } else if (match[8] !== undefined) {
      // *italic*
      tokens.push({ type: 'italic', value: match[8] });
    } else if (match[9] !== undefined) {
      // _italic_
      tokens.push({ type: 'italic', value: match[9] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({
      type: 'text',
      value: input.slice(lastIndex),
    });
  }

  return tokens;
}
