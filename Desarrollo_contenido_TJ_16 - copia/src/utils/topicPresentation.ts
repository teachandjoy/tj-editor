import type {
  ContentBlock,
  CorporateIdentity,
  IdentityHtmlTemplates,
  TopicPresentation,
} from '../types';

export const TOPIC_PRESENTATION_BLOCK_ID = '__tj-topic-presentation__';

export const DEFAULT_TOPIC_PRESENTATION: TopicPresentation = {
  objectives: [],
  header: { enabled: false, url: '', alt: '' },
  audio: { enabled: false, kind: 'music', title: '', url: '' },
  embed: { enabled: false, token: '' },
};

export const DEFAULT_IDENTITY_HTML_TEMPLATES: Required<IdentityHtmlTemplates> = {
  page: `
<article class="tj-topic">
  {{header}}
  <header class="tj-topic-heading">
    <h1>{{title}}</h1>
    <p class="tj-topic-meta">{{meta}}</p>
  </header>
  {{objectives}}
  <main class="tj-topic-content">{{content}}</main>
  {{audio}}
  {{bibliography}}
</article>`.trim(),
  header: `
<figure class="tj-topic-header">
  <img src="{{headerUrl}}" alt="{{headerAlt}}">
</figure>`.trim(),
  objectives: `
<section class="tj-topic-objectives">
  <h2>Objetivos</h2>
  <ul>{{objectiveItems}}</ul>
</section>`.trim(),
  audio: `
<section class="tj-topic-audio">
  <h2>{{audioLabel}}</h2>
  <p>{{audioTitle}}</p>
  <audio controls preload="metadata" src="{{audioUrl}}"></audio>
</section>`.trim(),
  bibliography: `
<details class="tj-topic-bibliography">
  <summary>Referencias bibliográficas</summary>
  <div><ol>{{referenceItems}}</ol></div>
</details>`.trim(),
};

export function getTopicPresentation(blocks: ContentBlock[]): TopicPresentation {
  const stored = blocks.find(block => block.id === TOPIC_PRESENTATION_BLOCK_ID)?.presentation;
  return {
    objectives: stored?.objectives || [],
    header: { ...DEFAULT_TOPIC_PRESENTATION.header, ...stored?.header },
    audio: { ...DEFAULT_TOPIC_PRESENTATION.audio, ...stored?.audio },
    embed: { ...DEFAULT_TOPIC_PRESENTATION.embed, ...stored?.embed },
  };
}

export function withTopicPresentation(
  blocks: ContentBlock[],
  presentation: TopicPresentation,
): ContentBlock[] {
  const remaining = blocks.filter(block => block.id !== TOPIC_PRESENTATION_BLOCK_ID);
  return [
    ...remaining,
    {
      id: TOPIC_PRESENTATION_BLOCK_ID,
      type: 'topic-settings',
      content: '',
      order: Number.MAX_SAFE_INTEGER,
      presentation,
    },
  ];
}

export function getIdentityHtmlTemplates(
  identity?: CorporateIdentity,
): Required<IdentityHtmlTemplates> {
  return {
    ...DEFAULT_IDENTITY_HTML_TEMPLATES,
    ...(identity?.htmlTemplates || {}),
  };
}

export function applyHtmlTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (_, key: string) => values[key] || '');
}

export function createEmbedToken(): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Este navegador no puede generar tokens seguros.');
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
