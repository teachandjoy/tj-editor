import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/context';
import { ArrowLeft, Monitor, Smartphone, Edit, Download } from 'lucide-react';
import { useState } from 'react';
import { formatReference } from '../utils/bibliography';
import { downloadFile } from '../utils/export';
import { TJ } from '../constants/theme';

export default function PreviewPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { topics, offers, identities, references } = useApp();
  const topic = topics.find(t => t.id === topicId);
  const [viewMode, setViewMode] = useState<'editor' | 'moodle' | 'movil'>('editor');

  if (!topic) return <div className="p-8" style={{ color: '#a8b8d8' }}>Tema no encontrado</div>;

  const offer = offers.find(o => o.id === topic.offerId);
  const identity = identities.find(i => i.id === offer?.identityId);
  const topicRefs = references.filter(r => topic.referenceIds.includes(r.id));

  const cp = identity?.colorPrimary || TJ.primary;
  const cs = identity?.colorSecondary || TJ.secondary;
  const ct = identity?.colorTertiary || TJ.gold;
  const fm = identity?.fontPrimaryName || 'Montserrat';
  const fb = identity?.fontSecondaryName || 'Open Sans';

  const buildMoodleHTML = () => `
    <div style="max-width:900px;margin:0 auto;font-family:'${fb}',Arial,sans-serif;color:#212121;line-height:1.65;padding:10px 0">
      <style>
        h1,h2{font-weight:600!important} h3,h4{font-weight:500!important} strong{font-weight:600!important}
        img{border-radius:8px!important;box-shadow:0 1px 6px rgba(0,0,0,.08)!important;height:auto!important}
        table{width:100%;border-collapse:collapse;margin:14px 0}
        th{background:${cp};color:#fff;padding:8px 10px;border:1px solid #e5e7eb;text-align:left}
        td{padding:7px 10px;border:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#fafafa}
        .block-tip{background:#f6f7fa;border-left:5px solid #a8b8d8;padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
        .block-perla{background:#eff6ff;border-left:5px solid ${cp};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
        .block-nota{background:#fff8e5;border-left:5px solid ${ct};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
        .block-warning{background:#fff5f5;border-left:5px solid ${cs};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
        .block-conclusion{background:#fff8e5;border:1px solid #e8d89a;border-radius:8px;padding:12px 14px;margin:20px 0}
        .block-objectives{background:#f0f7ff;border:1px solid #bcd4f0;border-radius:8px;padding:12px 14px;margin:14px 0}
        details summary{cursor:pointer;outline:none;background:${cp};color:#fff;padding:10px 14px;font-weight:600;border-radius:4px;list-style:none;display:flex;align-items:center;gap:8px}
        details>div{padding:12px 14px;background:#f6f7fa;border:1px solid #ddd;border-top:0;border-radius:0 0 6px 6px}
        h1{color:${cp};font-size:1.45rem;text-align:center;margin:12px 0 8px;font-family:'${fm}',sans-serif}
        h2{color:${cp};font-size:1.2rem;margin:18px 0 8px;font-family:'${fm}',sans-serif}
        h3{color:${cs};font-size:1.05rem;margin:12px 0 6px;font-family:'${fm}',sans-serif}
        blockquote{border-left:4px solid ${ct};background:#fdf9f0;padding:12px 16px;margin:14px 0;border-radius:0 8px 8px 0}
        p{text-align:justify;margin-bottom:10px}
        a{color:${cp}}
        sup{font-size:11px;color:${cp};font-weight:600;vertical-align:super}
      </style>
      ${identity?.logoUrl ? `<div style="text-align:center;margin:0 0 16px"><img src="${identity.logoUrl}" style="height:48px;object-fit:contain" onerror="this.style.display='none'"></div>` : ''}
      <div style="font-size:12px;text-align:center;color:#888;margin-bottom:16px">${topic.offerName ? `<strong>${topic.offerName}</strong> · ` : ''}${topic.author} · ${topic.version} · ${topic.date}</div>
      ${topic.content || topic.blocks.sort((a,b)=>a.order-b.order).map(block => {
        switch(block.type) {
          case 'heading': return `<h${block.level||2} style="color:${cp};font-family:'${fm}',sans-serif">${block.content}</h${block.level||2}>`;
          case 'paragraph': return `<p style="text-align:justify">${block.content}</p>`;
          case 'callout': return `<div class="${block.variant==='objectives'?'block-objectives':block.variant==='tip'?'block-tip':'block-perla'}"><p>${block.content.replace(/\n/g,'<br>')}</p></div>`;
          case 'section': return `<h2 style="color:${cp};font-family:'${fm}',sans-serif">${block.sectionTitle}</h2><p>${block.content||'Contenido pendiente...'}</p>`;
          default: return block.content ? `<p>${block.content}</p>` : '';
        }
      }).join('')}
      ${topicRefs.length > 0 ? `
        <details style="border:1px solid #919BA5;border-radius:8px;overflow:hidden;margin-top:20px">
          <summary style="background:${cp};color:#fff;padding:12px 14px;font-weight:600;list-style:none;cursor:pointer">
            Referencias bibliográficas (clic para desplegar)
          </summary>
          <div style="padding:12px 14px;background:#f6f7fa;border-top:1px solid #919BA5">
            <ol style="margin:0 0 0 18px;padding:0;font-size:0.9rem">
              ${topicRefs.map((r,i)=>`<li style="margin:4px 0;text-align:justify">${formatReference(r,i+1)}</li>`).join('')}
            </ol>
          </div>
        </details>` : ''}
    </div>`;

  const buildMoodleDocument = () => `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${topic.title} - Vista Moodle</title>
<link href="https://fonts.googleapis.com/css2?family=${fm.replace(/ /g,'+')}:wght@400;600;700&family=${fb.replace(/ /g,'+')}:wght@400;600&display=swap" rel="stylesheet">
<style>body{background:#f0f0f0;padding:20px;margin:0}.moodle-frame{background:#fff;max-width:940px;margin:0 auto;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.15)}.moodle-bar{background:#${cp.replace('#','')} 22;padding:0;height:6px}.moodle-content{padding:30px}</style>
</head><body>
<div class="moodle-frame"><div class="moodle-bar" style="background:${cp}"></div><div class="moodle-content">${buildMoodleHTML()}</div></div>
</body></html>`;

  const handleExportMoodle = () => {
    downloadFile(buildMoodleDocument(), `${topic.title.replace(/[^a-z0-9]/gi,'_')}_moodle.html`);
  };

  const editorContent = topic.content || topic.blocks.sort((a,b)=>a.order-b.order).map(block => {
    switch(block.type) {
      case 'heading': return `<h${block.level||2}>${block.content}</h${block.level||2}>`;
      case 'paragraph': return `<p>${block.content}</p>`;
      case 'callout': return `<blockquote><p>${block.content.replace(/\n/g,'<br>')}</p></blockquote>`;
      case 'section': return `<h2>${block.sectionTitle}</h2><p>${block.content||''}</p>`;
      default: return block.content ? `<p>${block.content}</p>` : '';
    }
  }).join('');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#e8e6e2' }}>
      {/* Toolbar */}
      <div className="bg-white border-b px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderColor: TJ.border }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#666' }}>
            <ArrowLeft size={17} />
          </button>
          <span className="text-sm font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Vista previa: {topic.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/editor/${topic.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
            <Edit size={13} /> Editor
          </button>
          <button onClick={handleExportMoodle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: TJ.border, color: TJ.text }}>
            <Download size={13} /> Exportar Moodle
          </button>
          <div className="flex items-center rounded-lg p-0.5 border" style={{ borderColor: TJ.border, background: '#f8f7f5' }}>
            {([
              { id: 'editor' as const, label: 'Estudio', icon: Monitor },
              { id: 'moodle' as const, label: 'Moodle', icon: Monitor },
              { id: 'movil' as const, label: 'Móvil', icon: Smartphone },
            ]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setViewMode(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all"
                style={{ background: viewMode === id ? '#fff' : 'transparent', color: viewMode === id ? TJ.primary : '#a8b8d8', fontWeight: viewMode === id ? 700 : 400, fontFamily: 'Montserrat, sans-serif', boxShadow: viewMode === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex justify-center overflow-auto">
        {viewMode === 'moodle' ? (
          /* Moodle frame simulation */
          <div className="w-full max-w-4xl">
            {/* Moodle-like chrome */}
            <div className="rounded-lg overflow-hidden shadow-lg" style={{ border: `1px solid ${TJ.border}` }}>
              <div style={{ background: '#373a3f', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#7b8694', borderRadius: 4, padding: '4px 12px', fontSize: 12, color: '#e8e8e8' }}>Moodle LMS</div>
                <div style={{ flex: 1, background: '#fff', borderRadius: 4, padding: '4px 10px', fontSize: 12, color: '#888' }}>moodle.universidad.edu/course/view.php</div>
              </div>
              <div style={{ background: '#fff', padding: '0 0 4px' }}>
                <div style={{ background: cp, height: 6 }} />
                <div style={{ padding: '24px 32px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: cp, marginBottom: 4, fontFamily: `'${fm}', sans-serif` }}>{topic.title}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${TJ.border}` }}>
                    {topic.offerName && <><strong>{topic.offerName}</strong> · </>}{topic.author}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: buildMoodleHTML() }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Editor / Mobile */
          <div className={`bg-white shadow-lg overflow-hidden ${viewMode === 'movil' ? 'w-[390px]' : 'max-w-4xl w-full'}`}
            style={{ border: `1px solid ${TJ.border}`, borderRadius: viewMode === 'movil' ? '32px' : '8px', minHeight: 600 }}>
            {viewMode === 'movil' && (
              <div className="flex justify-center py-3 border-b" style={{ borderColor: TJ.border }}>
                <div className="w-24 h-1.5 rounded-full" style={{ background: TJ.border }} />
              </div>
            )}
            <div className="p-8 lg:p-12">
              <div style={{ fontFamily: `'${fb}', sans-serif`, color: TJ.text, lineHeight: 1.7 }}>
                {identity?.logoUrl && (
                  <div className="mb-6 pb-5 border-b" style={{ borderColor: TJ.border, textAlign: 'center' }}>
                    <img src={identity.logoUrl} alt={identity.name} style={{ height: 40, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#a8b8d8', marginBottom: 20 }}>
                  {topic.offerName && <><strong style={{ color: cp }}>{topic.offerName}</strong> · </>}
                  {topic.author} · {topic.version} · {topic.date}
                </div>
                <div className="tiptap prose max-w-none" dangerouslySetInnerHTML={{ __html: editorContent }} />
                {topicRefs.length > 0 && (
                  <div className="mt-8 pt-6 border-t" style={{ borderColor: TJ.border }}>
                    <h3 style={{ color: cp, fontFamily: `'${fm}', sans-serif`, marginBottom: 12 }}>Referencias</h3>
                    {topicRefs.map((ref, idx) => (
                      <div key={ref.id} className="text-sm mb-2" style={{ color: '#555' }} dangerouslySetInnerHTML={{ __html: formatReference(ref, idx + 1) }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
