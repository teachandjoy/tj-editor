import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, FileCode, Eye, AlertCircle } from 'lucide-react';
import { TJ } from '../../constants/theme';
import ModalPortal from '../ui/ModalPortal';

type ImportTab = 'html-file' | 'html-paste' | 'docx';

interface ImportDialogProps {
  onClose: () => void;
  onImport: (html: string) => void;
}

export default function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const [tab, setTab] = useState<ImportTab>('html-file');
  const [htmlContent, setHtmlContent] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [fileName, setFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  const extractBodyContent = useCallback((html: string): string => {
    // Extract content from body if full HTML document
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      // Also extract style tags from head to preserve them
      const styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
      const styles = styleMatches ? styleMatches.join('\n') : '';
      return styles + bodyMatch[1];
    }
    return html;
  }, []);

  const handleHtmlFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const extracted = extractBodyContent(content);
      setHtmlContent(extracted);
      setPreviewHtml(extracted);
      setShowPreview(true);
    };
    reader.onerror = () => setError('Error al leer el archivo HTML.');
    reader.readAsText(file);
  }, [extractBodyContent]);

  const handleDocxFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    setLoading(true);

    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement(function(image) {
            return image.read('base64').then(function(imageBuffer) {
              return { src: `data:${image.contentType};base64,${imageBuffer}` };
            });
          }),
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "table => table",
            "tr => tr",
            "td => td",
            "th => th",
          ],
        }
      );
      const html = result.value;
      setHtmlContent(html);
      setPreviewHtml(html);
      setShowPreview(true);

      if (result.messages.length > 0) {
        const warnings = result.messages.filter(m => m.type === 'warning').map(m => m.message).join('; ');
        if (warnings) {
          setError(`Advertencias de conversión: ${warnings}`);
        }
      }
    } catch (err) {
      setError(`Error al convertir el archivo .docx: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePastePreview = useCallback(() => {
    if (!pastedHtml.trim()) {
      setError('Pegue código HTML en el campo de texto.');
      return;
    }
    setError('');
    const extracted = extractBodyContent(pastedHtml);
    setHtmlContent(extracted);
    setPreviewHtml(extracted);
    setShowPreview(true);
  }, [pastedHtml, extractBodyContent]);

  const handleConfirmImport = useCallback(() => {
    if (!htmlContent.trim()) {
      setError('No hay contenido para importar.');
      return;
    }
    onImport(htmlContent);
    onClose();
  }, [htmlContent, onImport, onClose]);

  const tabs: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'html-file', label: 'Archivo HTML', icon: <FileCode size={14} /> },
    { id: 'html-paste', label: 'Pegar HTML', icon: <FileText size={14} /> },
    { id: 'docx', label: 'Archivo Word', icon: <Upload size={14} /> },
  ];

  return (
    <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
          <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
            Importar Contenido
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowPreview(false); setError(''); setHtmlContent(''); setFileName(''); }}
              className="px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5"
              style={{
                borderColor: tab === t.id ? TJ.primary : 'transparent',
                color: tab === t.id ? TJ.primary : '#a8b8d8',
                fontFamily: 'Montserrat, sans-serif',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg text-sm" style={{ background: '#fff5f5', color: TJ.secondary, border: `1px solid #fed7d7` }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!showPreview ? (
            <>
              {/* HTML File Upload */}
              {tab === 'html-file' && (
                <div className="text-center py-8">
                  <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleHtmlFile} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 mx-auto px-10 py-8 border-2 border-dashed rounded-xl transition-all"
                    style={{ borderColor: TJ.border, color: '#a8b8d8' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = '#a8b8d8'; }}>
                    <FileCode size={36} />
                    <span className="text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Seleccionar archivo .html</span>
                    <span className="text-xs">Se importará el contenido preservando estilos y formato</span>
                  </button>
                </div>
              )}

              {/* HTML Paste */}
              {tab === 'html-paste' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                    Pegue el código HTML:
                  </label>
                  <textarea
                    value={pastedHtml}
                    onChange={e => setPastedHtml(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none font-mono"
                    style={{ borderColor: TJ.border, fontSize: '12px', lineHeight: '1.5' }}
                    placeholder="<h1>Título</h1>&#10;<p>Contenido del tema...</p>"
                    onFocus={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,75,133,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button onClick={handlePastePreview}
                    disabled={!pastedHtml.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50 transition-all"
                    style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    <Eye size={14} /> Ver Preview
                  </button>
                </div>
              )}

              {/* DOCX Upload */}
              {tab === 'docx' && (
                <div className="text-center py-8">
                  <input ref={docxInputRef} type="file" accept=".docx" onChange={handleDocxFile} className="hidden" />
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: TJ.primary, borderTopColor: 'transparent' }} />
                      <span className="text-sm font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                        Convirtiendo archivo Word...
                      </span>
                      <span className="text-xs" style={{ color: '#a8b8d8' }}>
                        Procesando imágenes y tablas
                      </span>
                    </div>
                  ) : (
                    <button onClick={() => docxInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 mx-auto px-10 py-8 border-2 border-dashed rounded-xl transition-all"
                      style={{ borderColor: TJ.border, color: '#a8b8d8' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = '#a8b8d8'; }}>
                      <Upload size={36} />
                      <span className="text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Seleccionar archivo .docx</span>
                      <span className="text-xs">Se convertirá a HTML preservando tablas e imágenes</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye size={16} style={{ color: TJ.primary }} />
                  <span className="text-sm font-bold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    Preview del contenido a importar
                  </span>
                </div>
                {fileName && (
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f6f7fa', color: '#666' }}>
                    {fileName}
                  </span>
                )}
              </div>
              <div className="border rounded-xl overflow-auto" style={{ borderColor: TJ.border, maxHeight: '45vh' }}>
                <div
                  className="p-6 text-sm"
                  style={{ fontFamily: 'Open Sans, sans-serif', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#a8b8d8' }}>
                <AlertCircle size={12} />
                <span>Revise el contenido antes de confirmar. Se cargará en el editor TipTap.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: TJ.border }}>
          <div>
            {showPreview && (
              <button onClick={() => { setShowPreview(false); }}
                className="px-3 py-2 text-sm rounded-lg border transition-all"
                style={{ borderColor: TJ.border, color: TJ.text }}>
                Volver
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
            {showPreview && (
              <button onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-all"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
                <Upload size={14} /> Confirmar Importación
              </button>
            )}
          </div>
        </div>
      </div>
    </div></ModalPortal>
  );
}
