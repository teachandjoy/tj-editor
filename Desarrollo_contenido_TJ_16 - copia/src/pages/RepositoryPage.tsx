import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { FolderOpen, Image, FileText, Upload, Search, Plus, Folder, X, Trash2, Lock, Link, Check } from 'lucide-react';
import type { UserRole } from '../types';
import { hasPermission } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';

export default function RepositoryPage() {
  const { currentUser, media, folders, addMedia, deleteMedia, addFolder } = useApp();
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [search, setSearch] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string>('root');
  const [newFolderRoles, setNewFolderRoles] = useState<UserRole[]>(['admin', 'coordinador', 'editor']);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file'; id: string } | null>(null);

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'admin';
  const canUpload = hasPermission(currentUser, 'multimedia', 'crear');
  const canDeleteMedia = hasPermission(currentUser, 'multimedia', 'eliminar');

  const accessibleFolders = folders.filter(f => f.accessRoles.includes(currentUser.role));

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf,.doc,.docx';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          addMedia({
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            url: reader.result as string,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
            description: file.name,
            uploadedBy: currentUser.id,
            uploadedAt: new Date().toISOString().split('T')[0],
            size: file.size,
            folderId: selectedFolder,
            offerId: '',
          });
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder({ id: `folder-${Date.now()}`, name: newFolderName, parentId: newFolderParent, accessRoles: newFolderRoles });
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleCopyLink = (assetId: string, url: string) => {
    // For base64 images, we can't truly make them "public" in this demo,
    // but we copy the URL (data URI) or simulate a public link
    const link = url.startsWith('data:') ? `[Imagen local: ${assetId}]` : url;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const renderFolderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = accessibleFolders.filter(f => f.parentId === parentId);
    return children.map(folder => (
      <div key={folder.id}>
        <button
          onClick={() => setSelectedFolder(folder.id)}
          onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}
          className="w-full flex items-center gap-2 rounded-lg text-sm transition-all text-left"
          style={{
            paddingLeft: `${10 + depth * 14}px`,
            paddingRight: 8, paddingTop: 7, paddingBottom: 7,
            background: selectedFolder === folder.id ? 'rgba(27,75,133,0.09)' : 'transparent',
            color: selectedFolder === folder.id ? TJ.primary : TJ.text,
            fontWeight: selectedFolder === folder.id ? 600 : 400,
          }}
        >
          {selectedFolder === folder.id
            ? <FolderOpen size={14} style={{ color: TJ.gold, flexShrink: 0 }} />
            : <Folder size={14} style={{ color: '#c4c0b8', flexShrink: 0 }} />}
          <span className="truncate flex-1 text-left">{folder.name}</span>
          {!folder.accessRoles.includes('editor') && <Lock size={11} style={{ color: '#c4c0b8', flexShrink: 0 }} />}
        </button>
        {renderFolderTree(folder.id, depth + 1)}
        {isAdmin && selectedFolder === folder.id && (
          <button onClick={() => { setNewFolderParent(folder.id); setShowNewFolder(true); }}
            className="flex items-center gap-1 text-xs py-1.5 rounded-lg transition-colors"
            style={{ paddingLeft: `${10 + (depth + 1) * 14}px`, color: '#a8b8d8' }}
            onMouseEnter={e => (e.currentTarget.style.color = TJ.primary)}
            onMouseLeave={e => (e.currentTarget.style.color = '#a8b8d8')}>
            <Plus size={11} /> Subcarpeta
          </button>
        )}
      </div>
    ));
  };

  const currentFolderMedia = media.filter(m => {
    const matchFolder = m.folderId === selectedFolder;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const currentFolderName = accessibleFolders.find(f => f.id === selectedFolder)?.name || 'Repositorio';

  return (
    <div className="page-enter">
      <Header title="Repositorio" actions={
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => { setNewFolderParent(selectedFolder); setShowNewFolder(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all"
              style={{ borderColor: TJ.border, color: TJ.text, background: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <Plus size={14} /> Nueva Carpeta
            </button>
          )}
          {canUpload && (
            <button onClick={handleUpload}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white font-semibold transition-all"
              style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
              onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
              <Upload size={14} /> Subir Archivo
            </button>
          )}
        </div>
      } />

      <div className="p-3 md:p-6 flex flex-col md:flex-row gap-5">
        {/* Folder tree */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: TJ.border }}>
            <div className="px-3 py-3 border-b" style={{ borderColor: TJ.border }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Carpetas</span>
            </div>
            <div className="p-2">
              {renderFolderTree(null)}
              {isAdmin && (
                <button onClick={() => { setNewFolderParent('root'); setShowNewFolder(true); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors mt-1 w-full"
                  style={{ color: '#a8b8d8' }}
                  onMouseEnter={e => (e.currentTarget.style.color = TJ.primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#a8b8d8')}>
                  <Plus size={12} /> Nueva carpeta raíz
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} style={{ color: TJ.gold }} />
              <h3 className="font-bold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{currentFolderName}</h3>
              <span className="text-xs" style={{ color: '#a8b8d8' }}>{currentFolderMedia.length} archivos</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar archivos..."
                className="pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none w-48"
                style={{ borderColor: TJ.border, background: '#fff' }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentFolderMedia.map(asset => (
              <div key={asset.id}
                className="bg-white rounded-xl border overflow-hidden card-hover group"
                style={{ borderColor: TJ.border }}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: asset.id }); }}>
                <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: '#f8f7f5' }}>
                  {asset.type === 'image' && (asset.url.startsWith('data:') || asset.url.startsWith('http')) ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div style={{ color: '#d4cfc8' }}>
                      {asset.type === 'image' ? <Image size={36} /> : <FileText size={36} />}
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-semibold truncate" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }} title={asset.name}>{asset.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{formatSize(asset.size)}</div>
                </div>
                {/* Actions on hover */}
                <div className="px-2.5 pb-2.5 flex gap-1">
                  <button
                    onClick={() => handleCopyLink(asset.id, asset.url)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg border transition-all"
                    style={{ borderColor: TJ.border, color: copiedId === asset.id ? '#276749' : TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                    title="Copiar enlace público"
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {copiedId === asset.id ? <><Check size={11} /> Copiado</> : <><Link size={11} /> Enlace</>}
                  </button>
                  {canDeleteMedia && (
                    <button onClick={() => deleteMedia(asset.id)}
                      className="p-1 rounded-lg border transition-all"
                      style={{ borderColor: '#fed7d7', color: '#c53030' }}
                      title="Eliminar"
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Upload dropzone */}
            <button onClick={handleUpload}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-sm transition-all"
              style={{ minHeight: 168, borderColor: TJ.border, color: '#a8b8d8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = '#a8b8d8'; }}>
              <Upload size={22} className="mb-2" />
              <span className="text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Subir archivo</span>
            </button>
          </div>

          {currentFolderMedia.length === 0 && !search && (
            <div className="text-center py-12" style={{ color: '#a8b8d8' }}>
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Carpeta vacía — sube archivos para comenzar</p>
            </div>
          )}
        </div>
      </div>

      {/* New folder modal */}
      {showNewFolder && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[95vh] overflow-auto modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nueva Carpeta</h3>
              <button onClick={() => setShowNewFolder(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Nombre *</label>
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: TJ.border }}
                  onKeyDown={e => e.key === 'Enter' && handleAddFolder()} autoFocus />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Acceso por perfil</label>
                  {(['admin', 'coordinador', 'editor'] as UserRole[]).map(role => (
                    <label key={role} className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={newFolderRoles.includes(role)}
                        onChange={e => setNewFolderRoles(prev => e.target.checked ? [...prev, role] : prev.filter(r => r !== role))}
                        style={{ accentColor: TJ.primary }} />
                      <span className="text-sm capitalize" style={{ color: TJ.text }}>
                        {role === 'admin' ? 'Administrador' : role === 'coordinador' ? 'Coordinador' : 'Editor'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
              <button onClick={handleAddFolder}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Crear Carpeta
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-xl shadow-xl border py-1 min-w-44"
          style={{ left: contextMenu.x, top: contextMenu.y, zIndex: 9999, borderColor: TJ.border }}
          onClick={() => setContextMenu(null)}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.type === 'folder' ? (
            <>
              <button onClick={() => { setNewFolderParent(contextMenu.id); setShowNewFolder(true); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
                <Plus size={12} /> Nueva subcarpeta
              </button>
              <button onClick={() => { setSelectedFolder(contextMenu.id); handleUpload(); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
                <Upload size={12} /> Subir archivo aquí
              </button>
              <div className="h-px mx-2 my-1" style={{ background: TJ.border }} />
              <button onClick={() => { const f = folders.find(fl => fl.id === contextMenu.id); if (f) { const newName = prompt('Nuevo nombre:', f.name); if (newName) addFolder({ ...f, name: newName }); } setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
                <FileText size={12} /> Renombrar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { const asset = media.find(m => m.id === contextMenu.id); if (asset) handleCopyLink(asset.id, asset.url); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
                <Link size={12} /> Copiar enlace
              </button>
              {canDeleteMedia && (
                <button onClick={() => { deleteMedia(contextMenu.id); setContextMenu(null); }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c53030' }}>
                  <Trash2 size={12} /> Eliminar
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
