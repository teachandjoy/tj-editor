import { Node, mergeAttributes } from '@tiptap/core';

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; title?: string; width?: string }) => ReturnType;
    };
  }
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

const HANDLE_SIZE = 10;
const HANDLE_COLOR = '#1b4b85';
const OUTLINE_COLOR = '#1b4b85';

function createHandle(pos: HandlePosition): HTMLDivElement {
  const h = document.createElement('div');
  h.dataset.handle = pos;
  const isCorner = ['nw', 'ne', 'se', 'sw'].includes(pos);
  const size = isCorner ? HANDLE_SIZE : HANDLE_SIZE - 2;
  h.style.cssText = `
    position:absolute;width:${size}px;height:${size}px;
    background:#fff;border:2px solid ${HANDLE_COLOR};
    border-radius:${isCorner ? '2px' : '1px'};
    cursor:${HANDLE_CURSORS[pos]};z-index:10;
    box-shadow:0 1px 3px rgba(0,0,0,0.18);
    pointer-events:auto;
  `;
  const half = -size / 2;
  switch (pos) {
    case 'nw': h.style.top = half + 'px'; h.style.left = half + 'px'; break;
    case 'n':  h.style.top = half + 'px'; h.style.left = '50%'; h.style.marginLeft = half + 'px'; break;
    case 'ne': h.style.top = half + 'px'; h.style.right = half + 'px'; break;
    case 'e':  h.style.top = '50%'; h.style.marginTop = half + 'px'; h.style.right = half + 'px'; break;
    case 'se': h.style.bottom = half + 'px'; h.style.right = half + 'px'; break;
    case 's':  h.style.bottom = half + 'px'; h.style.left = '50%'; h.style.marginLeft = half + 'px'; break;
    case 'sw': h.style.bottom = half + 'px'; h.style.left = half + 'px'; break;
    case 'w':  h.style.top = '50%'; h.style.marginTop = half + 'px'; h.style.left = half + 'px'; break;
  }
  return h;
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'image',
  inline() { return this.options.inline; },
  group() { return this.options.inline ? 'inline' : 'block'; },
  draggable: true,

  addOptions() {
    return { inline: false, allowBase64: true, HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      style: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setResizableImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return (props) => {
      const node = props.node;
      const updateAttributes = (props as unknown as { updateAttributes: (attrs: Record<string, unknown>) => void }).updateAttributes;
      // --- Container ---
      const container = document.createElement('div');
      container.style.cssText = 'display:inline-block;max-width:100%;position:relative;line-height:0;';

      // --- Image ---
      const img = document.createElement('img');
      img.src = node.attrs.src || '';
      img.alt = node.attrs.alt || '';
      if (node.attrs.width) img.style.width = node.attrs.width;
      if (node.attrs.style) img.style.cssText += ';' + node.attrs.style;
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 1px 6px rgba(0,0,0,0.08)';
      img.draggable = false;
      container.appendChild(img);

      // --- Transform frame (outline + 8 handles + size label) ---
      const frame = document.createElement('div');
      frame.style.cssText = `
        position:absolute;top:0;left:0;right:0;bottom:0;
        pointer-events:none;display:none;
      `;

      // Blue outline border
      const outlineEl = document.createElement('div');
      outlineEl.style.cssText = `
        position:absolute;top:0;left:0;right:0;bottom:0;
        border:2px solid ${OUTLINE_COLOR};
        border-radius:8px;
        box-shadow:0 0 0 3px rgba(27,75,133,0.12);
        pointer-events:none;
      `;
      frame.appendChild(outlineEl);

      // Size label (visible during resize)
      const sizeLabel = document.createElement('div');
      sizeLabel.style.cssText = `
        position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);
        background:${HANDLE_COLOR};color:#fff;font-size:11px;font-weight:600;
        padding:2px 8px;border-radius:4px;white-space:nowrap;display:none;
        font-family:Montserrat,sans-serif;pointer-events:none;z-index:20;
        box-shadow:0 2px 6px rgba(0,0,0,0.15);
      `;
      frame.appendChild(sizeLabel);

      // Create all 8 handles
      const handlePositions: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handlePositions.forEach(pos => {
        frame.appendChild(createHandle(pos));
      });

      container.appendChild(frame);

      // --- Selection state ---
      let selected = false;

      const showFrame = () => { frame.style.display = 'block'; selected = true; };
      const hideFrame = () => { frame.style.display = 'none'; selected = false; sizeLabel.style.display = 'none'; };

      // Click on image => show transform frame
      container.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).dataset.handle) return;
        e.stopPropagation();
        showFrame();
      });

      // Click outside => hide transform frame
      const onDocClick = (e: MouseEvent) => {
        if (selected && !container.contains(e.target as HTMLElement)) {
          hideFrame();
        }
      };
      document.addEventListener('mousedown', onDocClick);

      // --- Resize drag logic ---
      const isCornerHandle = (p: HandlePosition) => ['nw', 'ne', 'se', 'sw'].includes(p);

      frame.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        const pos = target.dataset.handle as HandlePosition | undefined;
        if (!pos) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = img.offsetWidth;
        const startH = img.offsetHeight;
        const aspectRatio = startW / startH;
        const parentW = container.parentElement?.offsetWidth || startW;

        sizeLabel.style.display = 'block';
        sizeLabel.textContent = `${startW} \u00d7 ${startH}`;

        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let newW = startW;
          let newH = startH;

          if (isCornerHandle(pos)) {
            // Corner: maintain aspect ratio
            switch (pos) {
              case 'se': newW = startW + dx; break;
              case 'sw': newW = startW - dx; break;
              case 'ne': newW = startW + dx; break;
              case 'nw': newW = startW - dx; break;
            }
            newW = Math.max(60, newW);
            newH = newW / aspectRatio;
          } else {
            // Edge: single axis only
            switch (pos) {
              case 'e': newW = Math.max(60, startW + dx); newH = startH; break;
              case 'w': newW = Math.max(60, startW - dx); newH = startH; break;
              case 's': newH = Math.max(40, startH + dy); newW = startW; break;
              case 'n': newH = Math.max(40, startH - dy); newW = startW; break;
            }
          }

          const pct = Math.min(100, Math.max(5, Math.round((newW / parentW) * 100)));
          img.style.width = pct + '%';
          if (!isCornerHandle(pos) && (pos === 'n' || pos === 's')) {
            img.style.height = Math.round(newH) + 'px';
          } else {
            img.style.height = 'auto';
          }

          const displayW = img.offsetWidth;
          const displayH = img.offsetHeight;
          sizeLabel.textContent = `${displayW} \u00d7 ${displayH} (${pct}%)`;
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          sizeLabel.style.display = 'none';
          const finalPct = Math.min(100, Math.max(5, Math.round((img.offsetWidth / parentW) * 100)));
          const heightStyle = img.style.height && img.style.height !== 'auto' ? `height:${img.style.height};` : '';
          updateAttributes({ style: `width:${finalPct}%;max-width:100%;display:block;margin:0 auto;${heightStyle}` });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          img.src = updatedNode.attrs.src || '';
          img.alt = updatedNode.attrs.alt || '';
          if (updatedNode.attrs.style) {
            img.style.cssText = 'max-width:100%;display:block;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.08);' + updatedNode.attrs.style;
          }
          return true;
        },
        destroy: () => {
          document.removeEventListener('mousedown', onDocClick);
        },
      };
    };
  },
});
