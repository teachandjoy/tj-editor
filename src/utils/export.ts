import type { Topic, BibliographyReference } from '../types';
import { formatReference } from './bibliography';

export function exportTopicToHTML(topic: Topic, references: BibliographyReference[]): string {
  const topicRefs = references.filter(r => topic.referenceIds.includes(r.id));
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Open Sans', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #2a2a32; line-height: 1.75; background: #f8f7f5; }
    .wrap { background: #fff; border-radius: 10px; padding: 48px; box-shadow: 0 2px 20px rgba(0,0,0,.08); }
    h1 { font-family: 'Montserrat', sans-serif; color: #1b4b85; font-size: 1.8rem; margin-bottom: 12px; font-weight: 700; }
    h2 { font-family: 'Montserrat', sans-serif; color: #1b4b85; font-size: 1.3rem; margin: 24px 0 8px; font-weight: 600; }
    h3 { font-family: 'Montserrat', sans-serif; color: #8b2f3a; font-size: 1.1rem; margin: 16px 0 6px; }
    p { margin: 0 0 10px; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #1b4b85; color: #fff; padding: 9px 12px; border: 1px solid #ddd; text-align: left; font-weight: 600; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    tr:nth-child(even) td { background: #fafafa; }
    .block-tip { background: #f6f7fa; border-left: 5px solid #a8b8d8; padding: 10px 14px; margin: 14px 0; border-radius: 0 6px 6px 0; }
    .block-perla { background: #eff6ff; border-left: 5px solid #1b4b85; padding: 10px 14px; margin: 14px 0; border-radius: 0 6px 6px 0; }
    .block-nota { background: #fff8e5; border-left: 5px solid #c5aa6f; padding: 10px 14px; margin: 14px 0; border-radius: 0 6px 6px 0; }
    .block-warning { background: #fff5f5; border-left: 5px solid #8b2f3a; padding: 10px 14px; margin: 14px 0; border-radius: 0 6px 6px 0; }
    .block-conclusion { background: #fff8e5; border: 1px solid #e8d89a; border-radius: 8px; padding: 12px 14px; margin: 20px 0; }
    .block-objectives { background: #f0f7ff; border: 1px solid #bcd4f0; border-radius: 8px; padding: 12px 14px; margin: 14px 0; }
    .tj-editor-block { margin: 16px 0; border-radius: 8px; padding: 4px; }
    blockquote { border-left: 4px solid #c5aa6f; background: #fdf9f0; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    img { max-width: 100%; border-radius: 6px; box-shadow: 0 1px 6px rgba(0,0,0,.1); }
    figure { text-align: center; margin: 20px 0; }
    figcaption { font-size: 12px; color: #666; margin-top: 6px; font-style: italic; }
    sup { font-size: 11px; color: #1b4b85; font-weight: 600; vertical-align: super; }
    details summary { cursor: pointer; background: #1b4b85; color: #fff; padding: 10px 14px; border-radius: 6px; font-weight: 600; list-style: none; }
    details > div { padding: 12px 14px; background: #f6f7fa; border: 1px solid #ddd; border-top: 0; }
    .meta { font-size: 13px; color: #a8b8d8; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #c5aa6f; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="meta">${topic.offerName ? `<strong>${topic.offerName}</strong> · ` : ''}${topic.author} · ${topic.version} · ${topic.date}</div>
  ${topic.content || ''}`;

  if (!topic.content) {
    for (const block of topic.blocks.sort((a, b) => a.order - b.order)) {
      switch (block.type) {
        case 'heading': html += `  <h${block.level || 2}>${block.content}</h${block.level || 2}>\n`; break;
        case 'paragraph': html += `  <p>${block.content}</p>\n`; break;
        case 'callout': html += `  <div class="block-${block.variant || 'tip'}">${block.content.replace(/\n/g, '<br>')}</div>\n`; break;
        case 'image': html += `  <figure><img src="${block.imageUrl || ''}" alt="${block.caption || ''}" /><figcaption>${block.caption || ''}</figcaption></figure>\n`; break;
        default: if (block.content) html += `  <p>${block.content}</p>\n`;
      }
    }
  }

  if (topicRefs.length > 0) {
    html += `  <details style="margin-top:24px"><summary>Referencias bibliográficas</summary><div><ol>`;
    topicRefs.forEach((ref, idx) => { html += `<li>${formatReference(ref, idx + 1)}</li>`; });
    html += `</ol></div></details>\n`;
  }

  html += `</div>\n</body>\n</html>`;
  return html;
}

export function downloadFile(content: string, filename: string, type: string = 'text/html') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTopicToWord(topic: Topic, references: BibliographyReference[]): void {
  const html = exportTopicToHTML(topic, references);
  const wordContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6}h1{font-size:18pt;color:#1b4b85}h2{font-size:14pt;color:#1b4b85}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px 10px}</style></head><body>${html}</body></html>`;
  downloadFile(wordContent, `${topic.title.replace(/[^a-z0-9]/gi,'_')}.doc`, 'application/msword');
}
