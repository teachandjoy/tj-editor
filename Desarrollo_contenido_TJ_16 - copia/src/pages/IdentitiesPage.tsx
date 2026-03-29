import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Plus, X, Trash2, Edit, Check, Upload, Download, FileJson } from 'lucide-react';
import type { CorporateIdentity, IdentityBlock } from '../types';
import { hasPermission } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';
const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none';
const inputStyle = { borderColor: TJ.border };

function detectBlocks(snippet: string): string[] {
  const blocks = new Set<string>();
  const classMatches = snippet.match(/class="([^"]+)"/g) || [];
  const keywords = ['tip', 'perla', 'note', 'nota', 'warning', 'advertencia', 'conclusion', 'objectives', 'callout', 'insight', 'audio', 'music'];
  classMatches.forEach(c => keywords.forEach(k => { if (c.toLowerCase().includes(k)) blocks.add(k); }));
  const strongMatches = snippet.match(/<strong>([^<]+):<\/strong>/g) || [];
  strongMatches.forEach(m => {
    const label = m.replace(/<\/?strong>/g, '').replace(':', '').trim().toLowerCase();
    if (label && label.length < 20) blocks.add(label);
  });
  return [...blocks];
}

// Convert identity to TJ JSON format
function identityToJSON(id: CorporateIdentity): object {
  return {
    id: id.id,
    name: id.name,
    description: id.description || '',
    logoUrl: id.logoUrl || '',
    logoNegativeUrl: id.logoNegativeUrl || '',
    colorPrimary: id.colorPrimary,
    colorSecondary: id.colorSecondary,
    colorTertiary: id.colorTertiary,
    colorBackground: id.colorBackground,
    colorTextPrimary: id.colorTextPrimary,
    colorButtons: id.colorButtons,
    colorButtonsHover: id.colorButtonsHover,
    fontPrimaryName: id.fontPrimaryName || '',
    fontPrimaryFamily: id.fontPrimaryFamily || `'${id.fontPrimaryName}', sans-serif`,
    fontPrimaryImportUrl: id.fontPrimaryImportUrl || '',
    fontSecondaryName: id.fontSecondaryName || '',
    fontSecondaryFamily: id.fontSecondaryFamily || `'${id.fontSecondaryName}', sans-serif`,
    buttonStyle: id.buttonStyle || 'semi-rounded',
    borderRadius: id.borderRadius || '8px',
    shadowEnabled: true,
    animationsEnabled: true,
    darkMode: false,
    isActive: true,
  };
}

export default function IdentitiesPage() {
  const { currentUser, identities, addIdentity, updateIdentity, deleteIdentity } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CorporateIdentity | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'colores' | 'blocks'>('general');
  const [form, setForm] = useState<Partial<CorporateIdentity>>({
    colorPrimary: '#1b4b85', colorSecondary: '#8b2f3a', colorTertiary: '#c5aa6f',
    colorBackground: '#f4f5f7', colorTextPrimary: '#2a2a32', colorButtons: '#1b4b85', colorButtonsHover: '#8b2f3a',
    fontPrimaryName: 'Montserrat', fontSecondaryName: 'Open Sans', buttonStyle: 'semi-rounded', borderRadius: '8px',
    blocks: [],
  });
  const [blockPreviewing, setBlockPreviewing] = useState<string | null>(null);
  const [jsonImport, setJsonImport] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return (
    <div className="page-enter">
      <Header title="Identidades Corporativas" />
      <div className="p-6 text-center py-16" style={{ color: '#a8b8d8' }}>
        <p className="text-sm">No tienes permisos para ver identidades corporativas.</p>
      </div>
    </div>
  );

  const canCreateId = hasPermission(currentUser, 'identidades', 'crear');
  const canEditId = hasPermission(currentUser, 'identidades', 'editar');
  const canDeleteId = hasPermission(currentUser, 'identidades', 'eliminar');

  if (!hasPermission(currentUser, 'identidades', 'ver')) return (
    <div className="page-enter">
      <Header title="Identidades Corporativas" />
      <div className="p-6 text-center py-16" style={{ color: '#a8b8d8' }}>
        <p className="text-sm">No tienes permisos para ver identidades corporativas.</p>
      </div>
    </div>
  );

  const openNew = () => {
    setEditing(null);
    setActiveTab('general');
    setJsonImport(''); setImportMsg('');
    setForm({
      name: '', description: '', logoUrl: '', logoNegativeUrl: '',
      colorPrimary: '#1b4b85', colorSecondary: '#8b2f3a', colorTertiary: '#c5aa6f',
      colorBackground: '#f4f5f7', colorTextPrimary: '#2a2a32', colorButtons: '#1b4b85', colorButtonsHover: '#8b2f3a',
      fontPrimaryName: 'Montserrat', fontSecondaryName: 'Open Sans', buttonStyle: 'semi-rounded', borderRadius: '8px',
      snippet: '', detectedBlocks: [], blocks: [],
    });
    setShowModal(true);
  };

  const openEdit = (id: CorporateIdentity) => {
    setEditing(id);
    setActiveTab('general');
    setJsonImport(''); setImportMsg('');
    setForm({ ...id });
    setShowModal(true);
  };

  const applyJSON = (json: Record<string, string>) => {
    setForm(prev => ({
      ...prev,
      name: json.name || prev.name,
      description: json.description || prev.description,
      logoUrl: json.logoUrl || prev.logoUrl,
      logoNegativeUrl: json.logoNegativeUrl || prev.logoNegativeUrl,
      colorPrimary: json.colorPrimary || prev.colorPrimary,
      colorSecondary: json.colorSecondary || prev.colorSecondary,
      colorTertiary: json.colorTertiary || prev.colorTertiary,
      colorBackground: json.colorBackground || prev.colorBackground,
      colorTextPrimary: json.colorTextPrimary || prev.colorTextPrimary,
      colorButtons: json.colorButtons || prev.colorButtons,
      colorButtonsHover: json.colorButtonsHover || prev.colorButtonsHover,
      fontPrimaryName: json.fontPrimaryName || prev.fontPrimaryName,
      fontSecondaryName: json.fontSecondaryName || prev.fontSecondaryName,
      buttonStyle: json.buttonStyle || prev.buttonStyle,
      borderRadius: json.borderRadius || prev.borderRadius,
    }));
    setImportMsg('✓ JSON importado correctamente');
  };

  const handleImportJSON = () => {
    try {
      const json = JSON.parse(jsonImport);
      applyJSON(json);
    } catch { setImportMsg('✗ JSON inválido — revisa la sintaxis'); }
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        applyJSON(json);
        setJsonImport(JSON.stringify(json, null, 2));
      } catch { setImportMsg('✗ Archivo inválido — debe ser un JSON válido'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJSON = (id: CorporateIdentity) => {
    const data = identityToJSON(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `identidad-${id.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addBlock = () => {
    const newBlock: IdentityBlock = { id: `blk-${Date.now()}`, name: `Bloque ${(form.blocks?.length || 0) + 1}`, html: '', detectedTypes: [] };
    setForm(prev => ({ ...prev, blocks: [...(prev.blocks || []), newBlock] }));
  };

  const updateBlock = (blockId: string, updates: Partial<IdentityBlock>) => {
    setForm(prev => ({
      ...prev,
      blocks: (prev.blocks || []).map(b => {
        if (b.id !== blockId) return b;
        const updated = { ...b, ...updates };
        if (updates.html !== undefined) updated.detectedTypes = detectBlocks(updates.html);
        return updated;
      }),
    }));
  };

  const removeBlock = (blockId: string) => {
    setForm(prev => ({ ...prev, blocks: (prev.blocks || []).filter(b => b.id !== blockId) }));
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    const allDetected = [
      ...(form.snippet ? detectBlocks(form.snippet) : []),
      ...(form.blocks || []).flatMap(b => b.detectedTypes || []),
    ];
    const data = { ...form, detectedBlocks: [...new Set(allDetected)] } as CorporateIdentity;
    if (editing) {
      updateIdentity(editing.id, data);
    } else {
      addIdentity({ ...data, id: `id-${Date.now()}` } as CorporateIdentity);
    }
    setShowModal(false);
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'colores' as const, label: 'Colores y Tipografía' },
    { id: 'blocks' as const, label: `Bloques (${form.blocks?.length || 0})` },
  ];

  return (
    <div className="page-enter">
      <Header title="Identidades Corporativas" actions={
        canCreateId ? (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Plus size={15} /> Nueva Identidad
          </button>
        ) : undefined
      } />

      <div className="p-3 md:p-6">
        <p className="text-sm mb-6" style={{ color: '#a8b8d8' }}>
          Gestiona estilos, logos y snippets HTML para cada oferta educativa. Importa desde JSON (mismo formato que Teach &amp; Joy) o crea desde cero.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {identities.map(id => (
            <div key={id.id} className="bg-white rounded-xl border overflow-hidden card-hover" style={{ borderColor: TJ.border }}>
              <div className="h-1.5 flex">
                <div className="flex-1" style={{ background: id.colorPrimary }} />
                <div className="flex-1" style={{ background: id.colorSecondary }} />
                <div className="flex-1" style={{ background: id.colorTertiary }} />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {id.logoUrl && (
                      <img src={id.logoUrl} alt={id.name} className="h-7 object-contain mb-2"
                        style={{ maxWidth: 120 }} onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="font-bold text-sm" style={{ color: id.colorPrimary, fontFamily: 'Montserrat, sans-serif' }}>{id.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{id.description}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {canEditId && <button onClick={() => openEdit(id)} className="p-1.5 rounded-lg transition-colors" title="Editar"
                      style={{ color: TJ.primary }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Edit size={13} />
                    </button>}
                    <button onClick={() => handleExportJSON(id)} className="p-1.5 rounded-lg transition-colors" title="Exportar JSON"
                      style={{ color: '#276749' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0fff4')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Download size={13} />
                    </button>
                    {canDeleteId && id.id !== 'tj-default' && (
                      <button onClick={() => { if (confirm('¿Eliminar esta identidad?')) deleteIdentity(id.id); }}
                        className="p-1.5 rounded-lg transition-colors" title="Eliminar"
                        style={{ color: '#c53030' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 mb-3 items-center">
                  {[id.colorPrimary, id.colorSecondary, id.colorTertiary, id.colorBackground].map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border" style={{ background: c, borderColor: TJ.border }} title={c} />
                  ))}
                  <span className="text-xs ml-1" style={{ color: '#a8b8d8' }}>{id.fontPrimaryName || '—'}</span>
                </div>

                {(id.blocks && id.blocks.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {id.blocks.map(b => (
                      <span key={b.id} className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: id.colorPrimary + '18', color: id.colorPrimary, fontFamily: 'Montserrat, sans-serif' }}>
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}
                {id.detectedBlocks && id.detectedBlocks.length > 0 && !(id.blocks && id.blocks.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {id.detectedBlocks.map(b => (
                      <span key={b} className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: id.colorPrimary + '18', color: id.colorPrimary, fontFamily: 'Montserrat, sans-serif' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                {(id.snippet || (id.blocks && id.blocks.length > 0)) && (
                  <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#276749' }}>
                    <Check size={12} /> {id.blocks && id.blocks.length > 0 ? `${id.blocks.length} bloque(s)` : 'Snippet configurado'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden file input for JSON import */}
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Modal */}
      {showModal && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col modal-enter"
            style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                {editing ? `Editar: ${editing.name}` : 'Nueva Identidad Corporativa'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: TJ.border }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="px-3 sm:px-5 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap"
                  style={{
                    borderColor: activeTab === tab.id ? TJ.primary : 'transparent',
                    color: activeTab === tab.id ? TJ.primary : '#a8b8d8',
                    fontFamily: 'Montserrat, sans-serif',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Nombre *</label>
                    <input className={inputCls} style={inputStyle} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: ARMTY, Mi Empresa" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Descripción</label>
                    <input className={inputCls} style={inputStyle} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>URL del Logo (principal)</label>
                    <input className={inputCls} style={inputStyle} value={form.logoUrl || ''} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." />
                    {form.logoUrl && <img src={form.logoUrl} alt="Preview" className="mt-2 h-8 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>URL del Logo negativo (sobre fondo oscuro)</label>
                    <input className={inputCls} style={inputStyle} value={form.logoNegativeUrl || ''} onChange={e => setForm(p => ({ ...p, logoNegativeUrl: e.target.value }))} placeholder="https://..." />
                  </div>

                  {/* JSON Import section */}
                  <div className="pt-3 border-t" style={{ borderColor: TJ.border }}>
                    <label className="block text-xs font-semibold mb-2" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                      Importar desde JSON (formato Teach &amp; Joy)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button onClick={handleImportFile}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border font-semibold transition-all"
                        style={{ borderColor: TJ.primary, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Upload size={12} /> Cargar archivo .json
                      </button>
                      <span className="text-xs self-center" style={{ color: '#a8b8d8' }}>o pega el JSON abajo:</span>
                    </div>
                    <textarea
                      className={inputCls}
                      style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                      value={jsonImport}
                      onChange={e => setJsonImport(e.target.value)}
                      placeholder={'{\n  "name": "Mi Empresa",\n  "colorPrimary": "#1b4b85",\n  "logoUrl": "https://..."\n}'}
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={handleImportJSON}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white font-semibold"
                        style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                        <FileJson size={12} /> Aplicar JSON
                      </button>
                      {importMsg && (
                        <span className="text-xs font-semibold" style={{ color: importMsg.startsWith('✓') ? '#276749' : '#c53030' }}>
                          {importMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colores' && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Color primario', key: 'colorPrimary' },
                    { label: 'Color secundario', key: 'colorSecondary' },
                    { label: 'Color terciario / badge', key: 'colorTertiary' },
                    { label: 'Color de fondo', key: 'colorBackground' },
                    { label: 'Color texto principal', key: 'colorTextPrimary' },
                    { label: 'Color botones', key: 'colorButtons' },
                    { label: 'Color botones hover', key: 'colorButtonsHover' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color"
                          value={(form as Record<string, string>)[key] || '#000000'}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-10 h-9 rounded border cursor-pointer flex-shrink-0"
                          style={{ borderColor: TJ.border, padding: 2 }} />
                        <input className={inputCls} style={inputStyle}
                          value={(form as Record<string, string>)[key] || ''}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="#000000" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Fuente principal</label>
                    <input className={inputCls} style={inputStyle} value={form.fontPrimaryName || ''} onChange={e => setForm(p => ({ ...p, fontPrimaryName: e.target.value }))} placeholder="Montserrat" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Fuente secundaria</label>
                    <input className={inputCls} style={inputStyle} value={form.fontSecondaryName || ''} onChange={e => setForm(p => ({ ...p, fontSecondaryName: e.target.value }))} placeholder="Open Sans" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>URL import de fuente</label>
                    <input className={inputCls} style={inputStyle} value={form.fontPrimaryImportUrl || ''} onChange={e => setForm(p => ({ ...p, fontPrimaryImportUrl: e.target.value }))} placeholder="https://fonts.googleapis.com/..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Estilo de botones</label>
                    <select className={inputCls} style={inputStyle} value={form.buttonStyle || 'semi-rounded'} onChange={e => setForm(p => ({ ...p, buttonStyle: e.target.value }))}>
                      <option value="semi-rounded">Semi-redondeado</option>
                      <option value="rounded">Totalmente redondeado</option>
                      <option value="square">Cuadrado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Border radius (px)</label>
                    <input className={inputCls} style={inputStyle} value={form.borderRadius || '8px'} onChange={e => setForm(p => ({ ...p, borderRadius: e.target.value }))} placeholder="8px" />
                  </div>

                  {/* Live preview */}
                  <div className="col-span-2 pt-3 border-t" style={{ borderColor: TJ.border }}>
                    <label className="block text-xs font-semibold mb-2" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Vista previa</label>
                    <div className="p-4 rounded-xl" style={{ background: form.colorBackground || '#f4f5f7', border: `1px solid ${TJ.border}` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: form.colorPrimary || TJ.primary, fontFamily: 'Montserrat,sans-serif' }}>T</div>
                        <span className="font-bold text-sm" style={{ color: form.colorPrimary || TJ.primary, fontFamily: `'${form.fontPrimaryName || 'Montserrat'}', sans-serif` }}>
                          {form.name || 'Mi Identidad'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-xs text-white font-semibold"
                          style={{ background: form.colorButtons || TJ.primary, borderRadius: form.buttonStyle === 'rounded' ? 20 : form.buttonStyle === 'square' ? 2 : parseInt(form.borderRadius || '8') }}>
                          Botón primario
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full self-center"
                          style={{ background: form.colorTertiary || TJ.gold, color: form.colorTextPrimary || TJ.text }}>
                          Badge
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'blocks' && (
                <div>
                  <p className="text-xs mb-3" style={{ color: '#a8b8d8' }}>
                    Agrega bloques HTML reutilizables. Cada bloque tiene nombre, código HTML y vista previa. Se pueden insertar desde el editor de temas.
                  </p>

                  {(form.blocks || []).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm mb-3" style={{ color: '#a8b8d8' }}>No hay bloques configurados.</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(form.blocks || []).map((block, idx) => (
                      <div key={block.id} className="border rounded-xl overflow-hidden" style={{ borderColor: TJ.border }}>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b" style={{ borderColor: TJ.border }}>
                          <span className="text-xs font-bold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>#{idx + 1}</span>
                          <input
                            className="flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none font-semibold"
                            style={{ borderColor: TJ.border, fontFamily: 'Montserrat, sans-serif', color: TJ.text }}
                            value={block.name}
                            onChange={e => updateBlock(block.id, { name: e.target.value })}
                            placeholder="Nombre del bloque"
                          />
                          <button onClick={() => setBlockPreviewing(blockPreviewing === block.id ? null : block.id)}
                            className="px-2 py-1 text-xs rounded-lg border transition-all"
                            style={{ borderColor: blockPreviewing === block.id ? TJ.primary : TJ.border, color: blockPreviewing === block.id ? TJ.primary : '#666' }}>
                            {blockPreviewing === block.id ? 'Ocultar' : 'Preview'}
                          </button>
                          <button onClick={() => removeBlock(block.id)}
                            className="p-1 rounded-lg transition-colors"
                            style={{ color: '#c53030' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            title="Eliminar bloque">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <textarea
                          className={inputCls}
                          style={{ ...inputStyle, minHeight: 120, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', borderRadius: 0, border: 'none', borderBottom: blockPreviewing === block.id ? `1px solid ${TJ.border}` : 'none' }}
                          value={block.html}
                          onChange={e => updateBlock(block.id, { html: e.target.value })}
                          placeholder='<div class="mi-bloque">\n  <p><strong>Título:</strong> Contenido...</p>\n</div>'
                        />
                        {blockPreviewing === block.id && block.html && (
                          <div className="p-3" style={{ background: '#fafafa' }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Vista previa:</p>
                            <div className="p-3 bg-white rounded-lg border" style={{ borderColor: TJ.border }}
                              dangerouslySetInnerHTML={{ __html: block.html }} />
                          </div>
                        )}
                        {block.detectedTypes && block.detectedTypes.length > 0 && (
                          <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#f0fff4' }}>
                            <span className="text-xs" style={{ color: '#276749' }}>Tipos detectados:</span>
                            {block.detectedTypes.map(t => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: '#276749', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={addBlock}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border-2 border-dashed font-semibold transition-all w-full justify-center"
                    style={{ borderColor: TJ.primary + '40', color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Plus size={14} /> Agregar bloque
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: TJ.border }}>
              <div>
                {editing && (
                  <button onClick={() => handleExportJSON(editing)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border font-semibold transition-all"
                    style={{ borderColor: '#c6f6d5', color: '#276749', fontFamily: 'Montserrat, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0fff4')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Download size={12} /> Exportar JSON
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={!form.name?.trim()}
                  className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50"
                  style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                  {editing ? 'Guardar Cambios' : 'Crear Identidad'}
                </button>
              </div>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
