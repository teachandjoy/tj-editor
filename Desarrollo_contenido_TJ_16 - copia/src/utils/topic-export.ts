import { cleanExportHTML } from '../lib/export-cleanup';
import { sanitizeHtml } from '../lib/sanitize';
import type {
  BibliographyReference,
  CorporateIdentity,
  Topic,
  TopicPresentation,
} from '../types';
import { formatReference } from './bibliography';
import {
  applyHtmlTemplate,
  getIdentityHtmlTemplates,
  getTopicPresentation,
} from './topicPresentation';

interface TopicExportInput {
  topic: Topic;
  references: BibliographyReference[];
  identity?: CorporateIdentity;
  presentation?: TopicPresentation;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeCssColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]+)$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

function safeFontFamily(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value.replace(/[^a-zA-Z0-9À-ÿ\s,'"_ -]/g, '').trim();
  return cleaned || fallback;
}

export function expandCorporateBlocks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll<HTMLElement>('[data-tj-corporate-block]').forEach(element => {
    const blockHtml = element.getAttribute('data-tj-block-html') || '';
    const fragment = doc.createRange().createContextualFragment(sanitizeHtml(blockHtml));
    element.replaceWith(fragment);
  });
  return cleanExportHTML(doc.body.innerHTML);
}

function legacyBlocksToHtml(topic: Topic): string {
  return topic.blocks
    .filter(block => block.type !== 'topic-settings')
    .sort((a, b) => a.order - b.order)
    .map(block => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level || 2}>${block.content}</h${block.level || 2}>`;
        case 'paragraph':
          return `<p>${block.content}</p>`;
        case 'callout':
          return `<div class="block-${block.variant || 'perla'}"><p>${block.content.replace(/\n/g, '<br>')}</p></div>`;
        case 'section':
          return `<h2>${block.sectionTitle || ''}</h2><p>${block.content || ''}</p>`;
        default:
          return block.content ? `<p>${block.content}</p>` : '';
      }
    })
    .join('');
}

function buildValues(input: TopicExportInput): Record<string, string> {
  const { topic, identity } = input;
  const presentation = input.presentation || getTopicPresentation(topic.blocks);
  const topicReferences = input.references.filter(reference => topic.referenceIds.includes(reference.id));
  const templates = getIdentityHtmlTemplates(identity);
  const content = sanitizeHtml(expandCorporateBlocks(topic.content || legacyBlocksToHtml(topic)));
  const objectiveItems = presentation.objectives
    .filter(objective => objective.html.trim())
    .map(objective => `<li>${sanitizeHtml(objective.html)}</li>`)
    .join('');
  const referenceItems = topicReferences
    .map((reference, index) => `<li>${sanitizeHtml(formatReference(reference, index + 1))}</li>`)
    .join('');

  const common = {
    title: escapeHtml(topic.title),
    meta: [topic.offerName, topic.author, topic.version, topic.date].filter(Boolean).map(escapeHtml).join(' · '),
    content,
    primaryColor: safeCssColor(identity?.colorPrimary, '#1b4b85'),
    secondaryColor: safeCssColor(identity?.colorSecondary, '#8b2f3a'),
    tertiaryColor: safeCssColor(identity?.colorTertiary, '#c5aa6f'),
    backgroundColor: safeCssColor(identity?.colorBackground, '#f5f5f5'),
    textColor: safeCssColor(identity?.colorTextPrimary, '#2a2a32'),
    headerUrl: escapeHtml(presentation.header.url),
    headerAlt: escapeHtml(presentation.header.alt || topic.title),
    objectiveItems,
    audioLabel: presentation.audio.kind === 'audiobook' ? 'Audiolibro' : 'Audio',
    audioTitle: escapeHtml(presentation.audio.title),
    audioUrl: escapeHtml(presentation.audio.url),
    referenceItems,
  };

  return {
    ...common,
    header: presentation.header.enabled && presentation.header.url
      ? sanitizeHtml(applyHtmlTemplate(templates.header, common))
      : '',
    objectives: objectiveItems
      ? sanitizeHtml(applyHtmlTemplate(templates.objectives, common))
      : '',
    audio: presentation.audio.enabled && presentation.audio.url
      ? sanitizeHtml(applyHtmlTemplate(templates.audio, common))
      : '',
    bibliography: referenceItems
      ? sanitizeHtml(applyHtmlTemplate(templates.bibliography, common))
      : '',
  };
}

export function buildTopicFragment(input: TopicExportInput): string {
  const templates = getIdentityHtmlTemplates(input.identity);
  const values = buildValues(input);
  const page = applyHtmlTemplate(templates.page, values);
  const snippet = input.identity?.snippet?.trim();
  return sanitizeHtml(snippet ? `${snippet}${page}` : page);
}

export function buildTopicStyles(identity?: CorporateIdentity, includeBody = true): string {
  const cp = safeCssColor(identity?.colorPrimary, '#1b4b85');
  const cs = safeCssColor(identity?.colorSecondary, '#8b2f3a');
  const ct = safeCssColor(identity?.colorTertiary, '#c5aa6f');
  const bg = safeCssColor(identity?.colorBackground, '#f5f5f5');
  const text = safeCssColor(identity?.colorTextPrimary, '#2a2a32');
  const headingName = safeFontFamily(identity?.fontPrimaryName, 'Montserrat');
  const bodyName = safeFontFamily(identity?.fontSecondaryName, 'Open Sans');
  const headingFont = safeFontFamily(identity?.fontPrimaryFamily, `'${headingName}', sans-serif`);
  const bodyFont = safeFontFamily(identity?.fontSecondaryFamily, `'${bodyName}', sans-serif`);

  return `
    ${includeBody ? `*{box-sizing:border-box}body{margin:0;padding:20px;background:${bg}}` : ''}
    .tj-topic{box-sizing:border-box;max-width:900px;margin:0 auto;background:#fff;color:${text};font-family:${bodyFont};line-height:1.65;padding:40px;border-radius:10px;box-shadow:0 2px 18px rgba(0,0,0,.08)}
    .tj-topic *{box-sizing:border-box}
    .tj-topic-heading{border-bottom:2px solid ${ct};margin-bottom:24px;padding-bottom:14px}
    .tj-topic h1,.tj-topic h2,.tj-topic h3,.tj-topic h4{font-family:${headingFont};color:${cp}}.tj-topic h1{font-size:1.8rem;margin:0 0 8px}.tj-topic h2{font-size:1.3rem}
    .tj-topic p{margin:0 0 10px;text-align:justify}.tj-topic a{color:${cp}}.tj-topic img{max-width:100%;height:auto;border-radius:8px}
    .tj-topic-header{margin:0 0 24px}.tj-topic-header img{display:block;width:100%;max-height:360px;object-fit:cover}
    .tj-topic-meta{font-size:.82rem;color:#777;margin:0;text-align:left}
    .tj-topic-objectives{background:${cp}0d;border-left:5px solid ${cp};padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0}
    .tj-topic-objectives h2,.tj-topic-audio h2{margin:0 0 8px}.tj-topic-objectives ul{margin:0;padding-left:22px}
    .tj-topic-audio{background:${ct}1f;border:1px solid ${ct};padding:16px 20px;margin:20px 0;border-radius:8px}
    .tj-topic-audio audio{display:block;width:100%;margin-top:10px}
    .tj-topic-bibliography{border:1px solid #919BA5;border-radius:8px;overflow:hidden;margin-top:24px}
    .tj-topic-bibliography summary{cursor:pointer;background:${cp};color:#fff;padding:12px 14px;font-weight:600;list-style:none}
    .tj-topic-bibliography>div{padding:14px;background:#f6f7fa}.tj-topic-bibliography ol{margin:0;padding-left:24px}
    .tj-topic table{width:100%;border-collapse:collapse;margin:14px 0}.tj-topic th{background:${cp};color:#fff}.tj-topic th,.tj-topic td{padding:9px 12px;border:1px solid #ddd;text-align:left}
    .tj-topic blockquote{border-left:4px solid ${ct};background:#fdf9f0;padding:12px 16px;margin:16px 0}
    .tj-topic .block-tip{background:#f6f7fa;border-left:5px solid #a8b8d8;padding:10px 14px;margin:14px 0}
    .tj-topic .block-perla{background:#eff6ff;border-left:5px solid ${cp};padding:10px 14px;margin:14px 0}
    .tj-topic .block-nota{background:#fff8e5;border-left:5px solid ${ct};padding:10px 14px;margin:14px 0}
    .tj-topic .block-warning{background:#fff5f5;border-left:5px solid ${cs};padding:10px 14px;margin:14px 0}
    .tj-topic .block-conclusion{background:#fff8e5;border:1px solid ${ct};padding:12px 14px;margin:20px 0;border-radius:8px}
    @media(max-width:640px){${includeBody ? 'body{padding:0}' : ''}.tj-topic{padding:22px;border-radius:0}.tj-topic-header img{max-height:240px}}
  `;
}

export function buildTopicDocument(input: TopicExportInput): string {
  const { identity, topic } = input;
  const fontImport = identity?.fontPrimaryImportUrl && /^https?:\/\//i.test(identity.fontPrimaryImportUrl)
    ? `<link href="${escapeHtml(identity.fontPrimaryImportUrl)}" rel="stylesheet">`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(topic.title)}</title>
  ${fontImport}
  <style>${buildTopicStyles(identity)}</style>
</head>
<body>${buildTopicFragment(input)}</body>
</html>`;
}
