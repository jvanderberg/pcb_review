import type { ReviewResult, AnalysisResult } from '../types';

/**
 * Export review results as Markdown
 */
export function exportAsMarkdown(
  results: ReviewResult[],
  analysisResult: AnalysisResult | null,
  description: string
): string {
  const parts: string[] = [];

  // Title
  parts.push('# PCB Design Review Report');
  parts.push('');
  parts.push(`Generated: ${new Date().toLocaleString()}`);
  parts.push('');

  // PCB Description
  if (description.trim()) {
    parts.push('## PCB Description');
    parts.push('');
    parts.push(description.trim());
    parts.push('');
  }

  // Board Summary
  if (analysisResult) {
    parts.push('## Board Summary');
    parts.push('');
    parts.push(`- **Layers**: ${analysisResult.summary.copperLayers}`);
    parts.push(`- **Components**: ${analysisResult.summary.totalComponents}`);
    parts.push(`- **Nets**: ${analysisResult.summary.totalNets}`);
    parts.push(`- **Traces**: ${analysisResult.summary.totalTraces}`);
    parts.push(`- **Vias**: ${analysisResult.summary.totalVias}`);
    if (analysisResult.summary.schematicSheets > 0) {
      parts.push(`- **Schematic Sheets**: ${analysisResult.summary.schematicSheets}`);
    }
    parts.push('');
  }

  // Table of Contents
  parts.push('## Table of Contents');
  parts.push('');
  const successfulResults = results.filter(r => !r.error && r.response);
  successfulResults.forEach((result, index) => {
    const anchor = result.promptName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    parts.push(`${index + 1}. [${result.promptName}](#${anchor})`);
  });
  parts.push('');

  // Analysis Results
  for (const result of successfulResults) {
    const anchor = result.promptName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    parts.push(`## ${result.promptName} {#${anchor}}`);
    parts.push('');
    parts.push(result.response);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  // Errors section if any
  const failedResults = results.filter(r => r.error);
  if (failedResults.length > 0) {
    parts.push('## Errors');
    parts.push('');
    parts.push('The following analyses encountered errors:');
    parts.push('');
    for (const result of failedResults) {
      parts.push(`- **${result.promptName}**: ${result.error}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export as Markdown file
 */
export function downloadMarkdown(
  results: ReviewResult[],
  analysisResult: AnalysisResult | null,
  description: string
): void {
  const markdown = exportAsMarkdown(results, analysisResult, description);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(markdown, `pcb-review-${timestamp}.md`, 'text/markdown');
}

/**
 * Export as PDF using browser print
 * Takes the full report data to generate complete content (not from collapsed DOM)
 */
export function exportAsPDF(
  results: ReviewResult[],
  analysisResult: AnalysisResult | null,
  executiveSummary: string,
  description: string
): void {
  // Create a new window with print-friendly styles
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export as PDF');
    return;
  }

  const successfulResults = results.filter(r => !r.error && r.response);
  const failedResults = results.filter(r => r.error);

  // Generate content from data (not DOM) to ensure full content
  let content = '';

  // Header
  content += `<header style="text-align: center; margin-bottom: 32px;">`;
  content += `<p style="color: #666; margin: 0;">${new Date().toLocaleString()}</p>`;
  content += `<h1>PCB Design Review Report</h1>`;
  content += `</header>`;

  // Description (render as markdown since users may paste README content)
  if (description.trim()) {
    content += `<section>`;
    content += `<h2>Project Description</h2>`;
    content += `<div>${markdownToHtml(description)}</div>`;
    content += `</section>`;
  }

  // Executive Summary
  if (executiveSummary) {
    content += `<section>`;
    content += `<h2>Executive Summary</h2>`;
    content += `<div>${markdownToHtml(executiveSummary)}</div>`;
    content += `</section>`;
  }

  // Board Stats
  if (analysisResult) {
    content += `<section>`;
    content += `<h2>Board Statistics</h2>`;
    content += `<table><tbody>`;
    content += `<tr><td><strong>Copper Layers</strong></td><td>${analysisResult.summary.copperLayers}</td></tr>`;
    content += `<tr><td><strong>Components</strong></td><td>${analysisResult.summary.totalComponents}</td></tr>`;
    content += `<tr><td><strong>Nets</strong></td><td>${analysisResult.summary.totalNets}</td></tr>`;
    content += `<tr><td><strong>Traces</strong></td><td>${analysisResult.summary.totalTraces}</td></tr>`;
    content += `<tr><td><strong>Vias</strong></td><td>${analysisResult.summary.totalVias}</td></tr>`;
    if (analysisResult.summary.viaInPadCount > 0) {
      content += `<tr><td><strong>Via-in-Pad</strong></td><td>${analysisResult.summary.viaInPadCount}</td></tr>`;
    }
    content += `</tbody></table>`;
    content += `</section>`;
  }

  // Table of Contents
  content += `<section class="toc">`;
  content += `<h2>Table of Contents</h2>`;
  content += `<ol>`;
  successfulResults.forEach((result) => {
    content += `<li>${result.promptName}</li>`;
  });
  if (failedResults.length > 0) {
    content += `<li>Errors (${failedResults.length})</li>`;
  }
  content += `</ol>`;
  content += `</section>`;

  // Analysis Results - FULL content
  for (const result of successfulResults) {
    content += `<section>`;
    content += `<h2>${escapeHtml(result.promptName)}</h2>`;
    content += `<div>${markdownToHtml(result.response)}</div>`;
    content += `</section>`;
  }

  // Errors
  if (failedResults.length > 0) {
    content += `<section>`;
    content += `<h2>Errors</h2>`;
    content += `<ul>`;
    for (const result of failedResults) {
      content += `<li><strong>${escapeHtml(result.promptName)}:</strong> ${escapeHtml(result.error || 'Unknown error')}</li>`;
    }
    content += `</ul>`;
    content += `</section>`;
  }

  // Build print-friendly HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>PCB Design Review Report</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 40px;
    }
    h1 {
      font-size: 22pt;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 16pt;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    h3 {
      font-size: 13pt;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    h4 {
      font-size: 11pt;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      margin: 6px 0;
    }
    ul, ol {
      margin: 6px 0;
      padding-left: 24px;
    }
    li {
      margin: 3px 0;
    }
    code {
      background: #f5f5f5;
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 9pt;
      margin: 8px 0;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    blockquote {
      margin: 12px 0;
      padding: 8px 12px;
      border-left: 3px solid #3b82f6;
      background: #eff6ff;
    }
    hr {
      margin: 24px 0;
      border: none;
      border-top: 1px solid #ddd;
    }
    section {
      margin-bottom: 16px;
    }
    .toc {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px 0;
    }
    .toc h2 {
      margin-top: 0;
      font-size: 14pt;
    }
    .toc ol {
      columns: 2;
      margin-bottom: 0;
    }
    @media print {
      body {
        padding: 0;
      }
      h2, h3, h4 {
        page-break-after: avoid;
      }
      pre, blockquote, table {
        page-break-inside: avoid;
      }
      section {
        page-break-before: auto;
      }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
`;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Simple HTML escaping
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Basic markdown to HTML conversion for PDF export
 */
function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      result.push('<ul>' + listItems.join('') + '</ul>');
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      result.push('<table><tbody>' + tableRows.join('') + '</tbody></table>');
      tableRows = [];
      inTable = false;
    }
  };

  const processInline = (text: string): string => {
    let html = escapeHtml(text);
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    return html;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push('<pre><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('#### ')) {
      flushList();
      flushTable();
      result.push('<h4>' + processInline(line.slice(5)) + '</h4>');
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      flushTable();
      result.push('<h4>' + processInline(line.slice(4)) + '</h4>');
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushTable();
      result.push('<h3>' + processInline(line.slice(3)) + '</h3>');
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      flushTable();
      result.push('<h3>' + processInline(line.slice(2)) + '</h3>');
      continue;
    }

    // Tables
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      // Skip separator rows
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      inTable = true;
      tableRows.push('<tr>' + cells.map(c => '<td>' + processInline(c) + '</td>').join('') + '</tr>');
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Unordered lists
    if (line.startsWith('- ')) {
      flushTable();
      inList = true;
      listItems.push('<li>' + processInline(line.slice(2)) + '</li>');
      continue;
    }

    // Ordered lists
    const orderedMatch = line.match(/^(\d+)\. (.+)$/);
    if (orderedMatch) {
      flushTable();
      inList = true;
      listItems.push('<li>' + processInline(orderedMatch[2]) + '</li>');
      continue;
    }

    // If we were in a list but hit a non-list line, flush
    if (inList && line.trim() !== '') {
      flushList();
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      flushTable();
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      flushTable();
      result.push('<hr>');
      continue;
    }

    // Regular paragraph
    flushList();
    flushTable();
    result.push('<p>' + processInline(line) + '</p>');
  }

  // Flush any remaining content
  flushList();
  flushTable();
  if (inCodeBlock && codeBlockContent.length > 0) {
    result.push('<pre><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
  }

  return result.join('\n');
}
