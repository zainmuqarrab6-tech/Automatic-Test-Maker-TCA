import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Renders text containing LaTeX math equations ($...$ for inline or $$...$$ for block).
 * Falls back gracefully if katex fails to parse any expression.
 */
export default function MathRenderer({ text, className = '' }) {
  const renderedContent = useMemo(() => {
    if (!text || typeof text !== 'string') return '';

    // Regex to find $$...$$ or $...$
    const parts = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Text before the math match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      const raw = match[0];
      const isBlock = raw.startsWith('$$');
      const math = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      try {
        const html = katex.renderToString(math, {
          displayMode: isBlock,
          throwOnError: false
        });
        parts.push({ type: 'math', html });
      } catch (e) {
        parts.push({ type: 'text', content: raw });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return parts;
  }, [text]);

  if (!renderedContent) return null;

  return (
    <span className={`math-renderer-container ${className}`}>
      {renderedContent.map((part, idx) => {
        if (part.type === 'math') {
          return (
            <span
              key={idx}
              className="katex-math-inline"
              dangerouslySetInnerHTML={{ __html: part.html }}
            />
          );
        }
        return <span key={idx}>{part.content}</span>;
      })}
    </span>
  );
}
