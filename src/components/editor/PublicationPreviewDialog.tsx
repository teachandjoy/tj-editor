import { X, Download, Eye } from 'lucide-react';
import { TJ } from '../../constants/theme';
import ModalPortal from '../ui/ModalPortal';

interface PublicationPreviewDialogProps {
  html: string;
  onClose: () => void;
  onExport: () => void;
}

export default function PublicationPreviewDialog({ html, onClose, onExport }: PublicationPreviewDialogProps) {
  return (
    <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
          <div className="flex items-center gap-2">
            <Eye size={18} style={{ color: TJ.primary }} />
            <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
              Preview de Publicación
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-2 flex-shrink-0">
          <p className="text-xs" style={{ color: '#a8b8d8' }}>
            Esta es una vista previa de cómo se verá el contenido exportado con los estilos de identidad corporativa aplicados.
          </p>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto px-6 py-3">
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: TJ.border }}>
            <iframe
              srcDoc={html}
              title="Preview de publicación"
              className="w-full border-0"
              style={{ minHeight: '60vh', background: '#f5f5f5' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: TJ.border }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>
            Cerrar
          </button>
          <button onClick={() => { onExport(); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-all"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Download size={14} /> Exportar HTML
          </button>
        </div>
      </div>
    </div></ModalPortal>
  );
}
