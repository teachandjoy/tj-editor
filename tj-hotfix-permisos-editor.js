/*! Teach & Joy — Hotfix v13
 *
 *  QUÉ HACE:
 *  - Corrige el contador de figuras (lee el DOM real, no un useState creciente)
 *  - Re-numera figuras al borrar
 *  - Corrige el pegado largo que congela el editor
 *  - Corrige el centrado que contagia al párrafo de arriba
 *  - Gestión Académica: tarjetas clickeables en el cuerpo
 *  - Ícono "Citar" diferenciado del de Insertar imagen
 *  - Modal de citar: figuras reales con miniatura, sin selector de tipo
 *  - Lápiz visible en bloques bloqueados
 *  - Hotkeys (Ctrl+S, Ctrl+Alt+L/E/R/J, ESC, Enter en modal)
 *  - Limpieza de observers al cambiar de ruta SPA
 *  - Autocompletar referencias por DOI (Crossref)
 *  - Buscador en modal repositorio de imágenes
 *
 *  LO QUE NO HACE (el bundle ya lo tiene):
 *  - Color de texto con identidad corporativa → ya nativo en el bundle
 *  - Selector de tipo de lista → ya nativo en el bundle
 *  → No se duplican esos controles.
 */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const rafThrottle = (fn) => {
    let busy = false;
    return (...args) => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => { busy = false; fn(...args); });
    };
  };

  const idleRun = (fn, t = 200) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 16);

  const API = (() => {
    const m = document.querySelector('meta[name="tj-api-base"]');
    return (m && m.content) || 'https://web.teachandjoy.com/desarrollo-de-contenido/api.php';
  })();

  const apiUrl = (r) => API + '?r=' + encodeURIComponent(String(r).replace(/^\//, ''));
  const token  = () => localStorage.getItem('tj_session_token') || '';
  const authH  = () => ({ Authorization: 'Bearer ' + token() });

  const notify = (msg, type = 'info') => {
    const box = document.createElement('div');
    box.textContent = msg;
    box.style.cssText = [
      'position:fixed','right:18px','bottom:18px','z-index:2147483647',
      'background:' + (type === 'error' ? '#fff5f5' : '#f5f7fb'),
      'color:'       + (type === 'error' ? '#8b2f3a' : '#1b4b85'),
      'border:1px solid ' + (type === 'error' ? '#fed7d7' : '#a8b8d8'),
      'border-radius:10px','padding:10px 14px',
      'font:600 13px Montserrat,Arial,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.14)','max-width:360px',
    ].join(';');
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3800);
  };

  const pm          = () => document.querySelector('.ProseMirror');
  const isEditor    = () => !!pm() && /\/editor\//.test(location.pathname);
  const isAcademic  = () => /\/academic|\/gesti[oó]n/i.test(location.pathname);

  const visibleModals = () =>
    $$('[role="dialog"],[class*="fixed"],.modal').filter(el => {
      const r = el.getBoundingClientRect(), st = getComputedStyle(el);
      return r.width > 180 && r.height > 80
          && st.display !== 'none' && st.visibility !== 'hidden'
          && Number(st.opacity) !== 0
          && (st.position === 'fixed' || st.position === 'absolute' || el.getAttribute('role') === 'dialog');
    });

  const topModal = () => { const m = visibleModals(); return m[m.length - 1] || null; };

  const clickByText = (root, rx) => {
    const b = $$('button,[role="button"],a', root).find(b =>
      rx.test((b.textContent || b.title || b.getAttribute('aria-label') || '').trim()) && !b.disabled
    );
    if (b) { b.click(); return true; } return false;
  };

  const currentBlock = () => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    return el?.closest?.('p,li,h1,h2,h3,h4,h5,h6,blockquote,div') || null;
  };

  // ── Figuras ──────────────────────────────────────────────────────────────
  function figNums(root) {
    if (!root) return [];
    const seen = new Set();
    root.querySelectorAll('figcaption').forEach(c => {
      const m = (c.textContent || '').match(/\bFigura\s+(\d+)/i);
      if (m) seen.add(parseInt(m[1], 10));
    });
    return [...seen].sort((a, b) => a - b);
  }

  function nextFigNum() {
    const used = figNums(pm()); let n = 1;
    while (used.includes(n)) n++; return n;
  }

  const renumberFigs = rafThrottle(() => {
    const root = pm(); if (!root) return;
    let n = 1;
    root.querySelectorAll('figure').forEach(fig => {
      const cap = fig.querySelector('figcaption'); if (!cap) return;
      cap.innerHTML = cap.innerHTML.replace(/\bFigura\s+\d+/i, 'Figura ' + n++);
    });
  });

  const figObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (!m.removedNodes.length) continue;
      for (const n of m.removedNodes) {
        if (n instanceof Element &&
            (n.tagName === 'FIGURE' || n.querySelector?.('figure,figcaption')))
          { renumberFigs(); return; }
      }
    }
  });

  function attachFigObs() {
    const r = pm(); if (!r || r.dataset.tjFigObs) return;
    r.dataset.tjFigObs = '1';
    figObs.observe(r, { childList: true, subtree: true });
  }

  // ── Repositorio — búsqueda + próximo número ──────────────────────────────
  function patchRepo() {
    visibleModals().forEach(modal => {
      if (!/Repositorio|Insertar imagen|Agregar imagen/i.test(modal.textContent || '')) return;
      if (!modal.querySelector('[data-tj-is]')) {
        const inp = document.createElement('input');
        inp.type = 'search'; inp.dataset.tjIs = '1';
        inp.placeholder = 'Buscar imagen…';
        inp.style.cssText =
          'width:calc(100% - 40px);margin:10px 20px 6px;padding:9px 12px;' +
          'border:1px solid #e8e4de;border-radius:10px;font:13px Inter,Arial;outline:none;';
        inp.oninput = () => {
          const q = inp.value.toLowerCase();
          $$('button', modal).filter(b => b.querySelector('img')).forEach(b => {
            const t = (b.textContent || b.querySelector('img')?.alt || '').toLowerCase();
            b.style.display = !q || t.includes(q) ? '' : 'none';
          });
        };
        const a = $$('button', modal).find(b => b.querySelector('img'));
        (a?.parentElement?.parentElement || modal).insertBefore(inp, a?.parentElement || modal.firstChild);
      }
      let note = modal.querySelector('[data-tj-fn]');
      if (!note) {
        note = document.createElement('div'); note.dataset.tjFn = '1';
        note.style.cssText = 'margin:0 20px 8px;color:#606C7B;font:12px Inter,Arial;';
        modal.querySelector('[data-tj-is]')?.after(note);
      }
      note.textContent = 'La siguiente imagen se insertará como Figura ' + nextFigNum() + '.';
      $$('button', modal).forEach(b => {
        if (!/insertar|agregar|usar/i.test(b.textContent || '')) return;
        if (b.dataset.tjRn) return; b.dataset.tjRn = '1';
        b.addEventListener('click', () => { setTimeout(renumberFigs, 250); setTimeout(renumberFigs, 800); }, true);
      });
    });
  }

  // ── Citar — ícono ─────────────────────────────────────────────────────────
  function patchCiteIcon() {
    $$('button').forEach(btn => {
      const t = btn.title || btn.getAttribute('aria-label') || btn.textContent || '';
      if (!/Citar figuras|Citar contenido|figuras\/contenido|Citar Figuras/i.test(t)) return;
      if (btn.dataset.tjIp) return; btn.dataset.tjIp = '1';
      btn.title = 'Citar figura, tabla o contenido del tema';
      btn.setAttribute('aria-label', btn.title);
      btn.innerHTML =
        '<span style="display:inline-flex;align-items:center;gap:4px;' +
        'font:700 11px Montserrat,Arial;color:currentColor">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/>' +
        '<path d="M15 4v6h5"/>' +
        '<text x="9" y="17" font-family="Montserrat,Arial" font-size="6" font-weight="700" ' +
        'stroke="none" fill="currentColor">#</text></svg>' +
        '<span>Citar</span></span>';
    });
  }

  // ── Citar — modal ─────────────────────────────────────────────────────────
  function patchCiteModal() {
    visibleModals().forEach(modal => {
      if (!/Citar figura|Citar figuras|Citar contenido|figura\/imagen|tabla/i.test(modal.textContent || '')) return;
      if (modal.dataset.tjCp) return; modal.dataset.tjCp = '1';
      $$('select,[role="combobox"],button[role="tab"]', modal).forEach(s => {
        if (/Figura|Imagen|Ilustración|Tabla|Tipo/i.test(s.textContent || '') &&
            !/buscar/i.test(s.textContent || '')) {
          s.style.display = 'none';
          const lab = s.closest('label') || s.previousElementSibling;
          if (lab && /Figura|Imagen|Ilustración|Tabla|Tipo/i.test(lab.textContent || ''))
            lab.style.display = 'none';
        }
      });
      const note = document.createElement('div');
      note.style.cssText =
        'margin:8px 20px;padding:8px 10px;border:1px solid #a8b8d8;border-radius:8px;' +
        'background:#f5f7fb;color:#1b4b85;font:12px Inter,Arial;';
      note.textContent = 'La cita usará el nombre con que la figura aparece en el tema.';
      (modal.querySelector('form') || modal).prepend(note);
      const root = pm();
      if (root) {
        const figs = root.querySelectorAll('figure');
        if (figs.length) {
          const list = document.createElement('div');
          list.style.cssText =
            'margin:8px 20px;display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;';
          figs.forEach((fig, i) => {
            const cap = fig.querySelector('figcaption'), img = fig.querySelector('img');
            const row = document.createElement('button');
            row.type = 'button';
            row.style.cssText =
              'display:flex;align-items:center;gap:10px;padding:8px;' +
              'border:1px solid #e8e4de;border-radius:10px;background:white;cursor:pointer;text-align:left;';
            row.innerHTML =
              (img ? `<img src="${img.src}" style="width:60px;height:42px;object-fit:cover;border-radius:6px">` : '') +
              `<span style="font:12px Inter,Arial;color:#1b4b85;flex:1">${cap ? cap.textContent : '(sin nombre)'}</span>`;
            row.onclick = () => {
              const name = cap ? cap.textContent.trim().replace(/\s+/g,' ') : 'Figura ' + (i + 1);
              document.execCommand('insertText', false, ' (ver ' + name.split('.')[0] + ')');
              clickByText(modal, /^(cancelar|cerrar|×|x)$/i);
            };
            list.appendChild(row);
          });
          (modal.querySelector('form') || modal).appendChild(list);
        }
      }
    });
  }

  // ── Alineación solo sobre bloque activo ──────────────────────────────────
  function alignHere(where) {
    const b = currentBlock(); if (!b || !pm()?.contains(b)) return;
    const p = b.parentElement; if (p && p !== pm()) p.style.textAlign = '';
    b.style.textAlign = where; notify('Alineación: ' + where);
  }

  // ── Bloques bloqueados — lápiz visible ───────────────────────────────────
  function lockBlocks() {
    const root = pm(); if (!root) return;
    root.querySelectorAll(
      '.tj-editor-block,[data-block-type],.block-tip,.block-perla,.block-nota,' +
      '.block-warning,.block-conclusion,.block-objectives'
    ).forEach(el => {
      if (el.dataset.tjLb) return;
      el.setAttribute('contenteditable', 'false');
      el.dataset.tjLb = '1';
      el.title = 'Bloque protegido: usa el lápiz para editarlo';
      if (el.querySelector('[data-tj-eb]')) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      const pen = document.createElement('button');
      pen.type = 'button'; pen.dataset.tjEb = '1';
      pen.setAttribute('aria-label', 'Editar bloque');
      pen.innerHTML =
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
      pen.style.cssText =
        'position:absolute;top:6px;right:6px;width:26px;height:26px;display:inline-flex;' +
        'align-items:center;justify-content:center;background:#fff;border:1px solid #e8e4de;' +
        'border-radius:7px;cursor:pointer;color:#1b4b85;box-shadow:0 1px 2px rgba(0,0,0,.06);' +
        'opacity:.35;transition:opacity .15s;z-index:5;';
      el.addEventListener('mouseenter', () => pen.style.opacity = '1');
      el.addEventListener('mouseleave', () => pen.style.opacity = '.35');
      pen.addEventListener('click', ev => {
        ev.stopPropagation(); ev.preventDefault();
        el.setAttribute('contenteditable', 'true');
        delete el.dataset.tjLb; el.dataset.tjEditMode = '1'; el.focus();
        const lock = () => {
          el.setAttribute('contenteditable', 'false');
          el.dataset.tjLb = '1'; delete el.dataset.tjEditMode;
          el.removeEventListener('blur', lock);
        };
        el.addEventListener('blur', lock);
        notify('Editando bloque. Pulsa fuera para bloquear de nuevo.');
      });
      el.appendChild(pen);
    });
  }

  // ── Gestión Académica — tarjetas clickeables ─────────────────────────────
  function patchAcademic() {
    if (!isAcademic()) return;
    $$('article,section,[data-card],.card,[class*="rounded"]').forEach(card => {
      if (card.dataset.tjAc) return;
      if (card.closest('[role="dialog"]')) return;
      const text = (card.textContent || '').trim();
      if (text.length < 8 || text.length > 600) return;
      const opener = $$('button', card).find(b =>
        /editar|abrir|agregar|\+|m[oó]dulo|tema/i.test(
          b.textContent || b.title || b.getAttribute('aria-label') || ''
        )
      );
      if (!opener) return;
      card.dataset.tjAc = '1'; card.style.cursor = 'pointer';
      card.addEventListener('click', ev => {
        if (ev.target.closest('button,a,input,select,textarea,label,[role="button"]')) return;
        opener.click();
      });
    });
  }

  // ── DOI autocomplete ──────────────────────────────────────────────────────
  async function crossref(raw) {
    let doi = (raw || '').trim();
    const m = doi.match(/(?:doi\.org\/|DOI:\s*)?(10\.\d{4,}\/[^\s]+)/i);
    if (m) doi = m[1];
    const res = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi));
    if (!res.ok) throw new Error('No se encontró el DOI');
    const msg = (await res.json()).message || {};
    return {
      id: 'ref-' + Date.now(), style: 'apa', type: 'article',
      authors: (msg.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ')).join('; '),
      title: (msg.title || [])[0] || '',
      year: String(msg.issued?.['date-parts']?.[0]?.[0] || ''),
      journal: (msg['container-title'] || [])[0] || '',
      volume: msg.volume || '', issue: msg.issue || '', pages: msg.page || '',
      doi: msg.DOI || doi, url: msg.URL || raw,
    };
  }

  function patchBiblio() {
    visibleModals().forEach(modal => {
      if (!/Citas bibliográficas|Bibliografía|Referencia/i.test(modal.textContent || '')) return;
      if (modal.querySelector('[data-tj-doi]')) return;
      const box = document.createElement('div');
      box.dataset.tjDoi = '1';
      box.style.cssText =
        'margin:10px 20px 8px;padding:12px;border:1px solid #a8b8d8;border-radius:12px;background:#f5f7fb;';
      box.innerHTML =
        '<div style="font:700 12px Montserrat,Arial;color:#1b4b85;margin-bottom:7px">Autocompletar desde DOI o URL</div>' +
        '<div style="display:flex;gap:8px">' +
        '<input placeholder="Pega un DOI (10.xxxx/…) o URL de doi.org" ' +
        'style="flex:1;padding:8px 10px;border:1px solid #e8e4de;border-radius:9px;font:13px Inter,Arial">' +
        '<button type="button" style="padding:8px 12px;border:0;border-radius:9px;' +
        'background:#1b4b85;color:#fff;font:700 12px Montserrat,Arial;cursor:pointer">Buscar</button>' +
        '</div><div data-msg style="font:12px Inter,Arial;margin-top:6px;color:#8b2f3a"></div>';
      (modal.querySelector('form') || modal).prepend(box);
      const inp = box.querySelector('input'), btn = box.querySelector('button'), msg = box.querySelector('[data-msg]');
      const run = async () => {
        if (!inp.value.trim()) return;
        btn.disabled = true; msg.textContent = 'Buscando…';
        try {
          const ref = await crossref(inp.value);
          const pm2 = location.pathname.match(/\/editor\/([^\/?#]+)/);
          if (pm2) {
            try {
              const topics = await fetch(apiUrl('/topics'), { headers: authH() }).then(r => r.json());
              const t = (topics || []).find(t => t.id === pm2[1]);
              if (t) { ref.offerId = t.offerId; ref.topicIds = [t.id]; }
            } catch (_) {}
          }
          const r = await fetch(apiUrl('/references'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authH() },
            body: JSON.stringify(ref),
          });
          if (!r.ok) throw new Error(await r.text());
          msg.style.color = '#276749';
          msg.textContent = 'Referencia creada. Cierra y vuelve a abrir la lista para verla.';
        } catch (e) {
          msg.style.color = '#8b2f3a'; msg.textContent = 'Error: ' + (e.message || e);
        } finally { btn.disabled = false; }
      };
      btn.onclick = run;
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
    });
  }

  // ── Pegado largo ─────────────────────────────────────────────────────────
  if (!window.__tjPaste__) {
    window.__tjPaste__ = true;
    document.addEventListener('paste', ev => {
      const root = pm(); if (!root || !root.contains(ev.target)) return;
      const cd = ev.clipboardData; if (!cd) return;
      const txt = cd.getData('text/plain') || '', html = cd.getData('text/html') || '';
      if (txt.length <= 1200 && html.length <= 5000) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      const parts = txt.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
        .map(p => '<p>' + p.replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))
                           .replace(/\n/g, '<br>') + '</p>').join('');
      idleRun(() => { document.execCommand('insertHTML', false, parts); notify('Texto pegado en modo optimizado'); });
    }, true);
  }

  // ── beforeinput en bloques ────────────────────────────────────────────────
  if (!window.__tjBI__) {
    window.__tjBI__ = true;
    document.addEventListener('beforeinput', ev => {
      if (ev.target?.closest?.('[data-tj-lb]')) {
        ev.preventDefault(); ev.stopImmediatePropagation();
        notify('Usa el lápiz del bloque para editarlo.');
      }
    }, true);
  }

  // ── Hotkeys ───────────────────────────────────────────────────────────────
  if (!window.__tjKeys__) {
    window.__tjKeys__ = true;
    window.addEventListener('keydown', ev => {
      const modal = topModal();
      if (ev.key === 'Escape') {
        if (modal) { ev.preventDefault(); ev.stopImmediatePropagation(); clickByText(modal, /^(cancelar|cerrar|volver|×|x)$/i); return; }
        if (isEditor()) { ev.preventDefault(); ev.stopImmediatePropagation(); return; }
      }
      if (ev.key === 'Enter' && modal && !ev.shiftKey) {
        if ((ev.target?.tagName || '').toLowerCase() !== 'textarea') {
          const ok = $$('button', modal).find(b =>
            /^(guardar|crear|insertar|confirmar|citar|buscar|aceptar|ok)$/i.test((b.textContent || '').trim()) && !b.disabled
          );
          if (ok) { ev.preventDefault(); ev.stopImmediatePropagation(); ok.click(); return; }
        }
      }
      const mod = ev.ctrlKey || ev.metaKey, k = (ev.key || '').toLowerCase();
      if (!isEditor()) return;
      if (mod && k === 's')              { ev.preventDefault(); clickByText(document, /guardar/i); }
      if (mod && ev.altKey && k === 'l') { ev.preventDefault(); alignHere('left'); }
      if (mod && ev.altKey && k === 'e') { ev.preventDefault(); alignHere('center'); }
      if (mod && ev.altKey && k === 'r') { ev.preventDefault(); alignHere('right'); }
      if (mod && ev.altKey && k === 'j') { ev.preventDefault(); alignHere('justify'); }
      if (mod && ev.altKey && ['1','2','3','4','5','6'].includes(k)) {
        ev.preventDefault(); document.execCommand('formatBlock', false, 'H' + k);
      }
    }, true);
  }

  // ── Orquestador ───────────────────────────────────────────────────────────
  const sigs = { e: '', m: '', a: '' };
  const eSig = () => { const r = pm(); return r ? 'E:' + (r.children?.length || 0) : ''; };
  const mSig = () => 'M:' + visibleModals().map(m => (m.textContent||'').slice(0,30)).join('|');
  const aSig = () => isAcademic() ? 'A:' + $$('article,section,[data-card],.card,[class*="rounded"]').length : '';

  const run = rafThrottle(() => {
    try {
      const es = eSig();
      if (es && es !== sigs.e) { sigs.e = es; patchCiteIcon(); lockBlocks(); attachFigObs(); }
      const ms = mSig();
      if (ms !== sigs.m) { sigs.m = ms; patchRepo(); patchCiteModal(); /* patchBiblio() disabled — DOI autocomplete is now in the React bundle (BibliographyPage) */ }
      const as = aSig();
      if (as && as !== sigs.a) { sigs.a = as; patchAcademic(); }
    } catch (e) { console.warn('[tj]', e); }
  });

  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  setTimeout(run, 600);
  window.addEventListener('pageshow', () => { sigs.e = sigs.m = sigs.a = ''; run(); });

  // ── Limpieza al cambiar ruta ──────────────────────────────────────────────
  let lastP = location.pathname;
  const onRoute = () => {
    if (location.pathname === lastP) return;
    lastP = location.pathname;
    try { figObs.disconnect(); } catch (_) {}
    sigs.e = sigs.m = sigs.a = '';
    setTimeout(run, 200);
  };
  ['pushState','replaceState'].forEach(m => {
    const o = history[m];
    history[m] = function() { const r = o.apply(this, arguments); onRoute(); return r; };
  });
  window.addEventListener('popstate', onRoute);
})();
