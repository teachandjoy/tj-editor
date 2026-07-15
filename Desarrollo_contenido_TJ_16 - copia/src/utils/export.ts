import type { Topic, BibliographyReference, CorporateIdentity } from '../types';
import { buildTopicDocument } from './topic-export';

export function exportTopicToHTML(
  topic: Topic,
  references: BibliographyReference[],
  identity?: CorporateIdentity,
): string {
  return buildTopicDocument({ topic, references, identity });
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

export function exportTopicToWord(topic: Topic, references: BibliographyReference[], identity?: CorporateIdentity): void {
  const html = exportTopicToHTML(topic, references, identity);
  const wordContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6}h1{font-size:18pt;color:#1b4b85}h2{font-size:14pt;color:#1b4b85}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px 10px}</style></head><body>${html}</body></html>`;
  downloadFile(wordContent, `${topic.title.replace(/[^a-z0-9]/gi,'_')}.doc`, 'application/msword');
}
