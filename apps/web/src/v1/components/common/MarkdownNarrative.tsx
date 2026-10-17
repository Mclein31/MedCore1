import React from 'react';

interface MarkdownNarrativeProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and status badges.
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting by **bold**, *italic*, and `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {renderInline(inner)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-slate-800">
          {renderInline(inner)}
        </em>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1 py-0.5 bg-slate-100 border border-slate-200/80 rounded font-mono text-[11px] text-slate-800"
        >
          {inner}
        </code>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Checks if a line is a table row (e.g. | col 1 | col 2 |)
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
}

/**
 * Checks if a line is a markdown table divider (e.g. | :--- | ---: |)
 */
function isTableDivider(line: string): boolean {
  const trimmed = line.trim();
  if (!isTableRow(trimmed)) return false;
  const inner = trimmed.slice(1, -1);
  return inner.split('|').every((cell) => /^[\s:-]+$/.test(cell.trim()));
}

/**
 * Splits a markdown table row into cells
 */
function parseRowCells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map((c) => c.trim());
}

/**
 * Renders executive briefings and medico-legal narratives with proper typography and rightful HTML tables.
 */
export const MarkdownNarrative: React.FC<MarkdownNarrativeProps> = ({ content, className = '' }) => {
  if (!content || !content.trim()) {
    return null;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      index++;
      continue;
    }

    // 2. Horizontal Divider (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${index}`} className="my-3.5 border-slate-200/80" />);
      index++;
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        if (level === 1) {
          elements.push(
            <h2 key={`h1-${index}`} className="text-base font-bold text-slate-900 mt-3 mb-1.5 tracking-tight">
              {renderInline(text)}
            </h2>,
          );
        } else if (level === 2) {
          elements.push(
            <h3
              key={`h2-${index}`}
              className="text-sm font-bold text-slate-900 mt-3 mb-1 flex items-center gap-1.5"
            >
              {renderInline(text)}
            </h3>,
          );
        } else {
          elements.push(
            <h4
              key={`h3-${index}`}
              className="text-xs font-bold text-indigo-950 uppercase tracking-wide mt-2.5 mb-1"
            >
              {renderInline(text)}
            </h4>,
          );
        }
        index++;
        continue;
      }
    }

    // 4. Markdown Tables
    if (isTableRow(trimmed) && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = parseRowCells(trimmed);
      index += 2; // skip header and divider

      const rows: string[][] = [];
      while (index < lines.length && isTableRow(lines[index])) {
        if (!isTableDivider(lines[index])) {
          rows.push(parseRowCells(lines[index]));
        }
        index++;
      }

      elements.push(
        <div
          key={`table-${index}`}
          className="overflow-x-auto my-3 rounded-lg border border-slate-200 bg-white shadow-2xs"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-semibold tracking-wide">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="py-2.5 px-3 text-xs whitespace-nowrap">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx % 2 === 0
                      ? 'bg-white hover:bg-slate-50/80 transition-colors'
                      : 'bg-slate-50/40 hover:bg-slate-50/80 transition-colors'
                  }
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-slate-700 whitespace-nowrap text-xs">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 5. Unordered List Items (- or *)
    if (/^\s*[-*]\s+/.test(rawLine)) {
      const listItems: { text: string; indent: number }[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        const itemLine = lines[index];
        const indentMatch = itemLine.match(/^(\s*)[-*]\s+(.*)$/);
        if (indentMatch) {
          listItems.push({
            indent: Math.floor(indentMatch[1].length / 2),
            text: indentMatch[2],
          });
        }
        index++;
      }

      elements.push(
        <ul key={`ul-${index}`} className="my-1.5 space-y-1">
          {listItems.map((item, itemIdx) => (
            <li
              key={itemIdx}
              className={`flex items-start gap-2 text-xs text-slate-700 ${
                item.indent > 0 ? 'ml-5 text-slate-600' : 'ml-1'
              }`}
            >
              <span className="text-purple-600 mt-1 select-none font-bold shrink-0">
                {item.indent > 0 ? '◦' : '•'}
              </span>
              <span className="leading-relaxed flex-1">{renderInline(item.text)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // 6. Ordered List Items (1., 2., etc.)
    if (/^\s*\d+\.\s+/.test(rawLine)) {
      const orderedItems: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        const itemLine = lines[index];
        const match = itemLine.match(/^\s*\d+\.\s+(.*)$/);
        if (match) {
          orderedItems.push(match[1]);
        }
        index++;
      }

      elements.push(
        <ol key={`ol-${index}`} className="my-2 space-y-1.5 ml-1">
          {orderedItems.map((item, oIdx) => (
            <li key={oIdx} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0 mt-0.5">
                {oIdx + 1}
              </span>
              <span className="leading-relaxed flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // 7. Regular Prose Paragraph
    elements.push(
      <p key={`p-${index}`} className="text-xs text-slate-700 leading-relaxed my-1">
        {renderInline(trimmed)}
      </p>,
    );
    index++;
  }

  return <div className={`space-y-1 text-slate-700 text-xs font-sans ${className}`}>{elements}</div>;
};

export default MarkdownNarrative;
