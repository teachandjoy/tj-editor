import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import {
  FolderOpen, Image, FileText, Upload, Search, Plus, Folder, X, Trash2, Lock,
  Link, Check, RefreshCw, ChevronRight, Download, Edit3, Share2, Users, Copy,
  MoreVertical, ArrowLeft, Grid, List as ListIcon, Eye
} from 'lucide-react';
import type { UserRole } from '../types';
import { hasPermission } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';

export default function RepositoryPage() {
  const { currentUser, media, folders, users, uploadMedia, replaceMedia, deleteMedia, addFolder, updateFolder, deleteFolder } = useApp();
  const [, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [search, setSearch] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string>('root');
  const [newFolderRoles, setNewFolderRoles] = useState<UserRole[]>(['admin', 'coordinador', 'editor']);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file'; id: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [shareRoles, setShareRoles] = useState<UserRole[]>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'admin';
  const canUpload = hasPermission(currentUser, 'multimedia', 'crear');
  const canDeleteMedia = hasPermission(currentUser, 'multimedia', 'eliminar');
  const canShare = isAdmin || currentUser.role === 'coordinador';
  const accessibleFolders = folders;

  const handleUpload = (targetFolder?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf,.doc,.docx';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      setUploading(true);
      for (const file of Array.from(files)) {
        try {
          await uploadMedia(file, {
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            folderId: targetFolder || selectedFolder,
            offerId: '',
            uploadedBy: currentUser.id,
          });
        } catch (err) { console.error('Upload error:', err); }
      }
      setUploading(false);
    };
    input.click();
  };

  const handleReplace = (assetId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try { await replaceMedia(assetId, file); } catch (err) { console.error('Replace error:', err); }
      setUploading(false);
    };
    input.click();
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder({ id: `folder-${Date.now()}`, name: newFolderName, parentId: newFolderParent === 'root' ? 'root' : newFolderParent, accessRoles: newFolderRoles });
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleCopyLink = (assetId: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRenameFolder = (folderId: string) => {
    if (!renameDraft.trim()) return;
    updateFolder(folderId, { name: renameDraft.trim() });
    setRenameId(null); setRenameDraft('');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Eliminar esta carpeta y todo su contenido?')) {
      deleteFolder(folderId);
      if (selectedFolder === folderId) setSelectedFolder('root');
    }
  };

  const handleShareFolder = (folderId: string) => {
    setShowShareModal(folderId);
    const folder = folders.find(f => f.id === folderId);
    setShareRoles(folder?.accessRoles || []);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getBreadcrumb = (): { id: string; name: string }[] => {
    const path: { id: string; name: string }[] = [{ id: 'root', name: 'Repositorio' }];
    let current = selectedFolder;
    const trail: { id: string; name: string }[] = [];
    while (current && current !== 'root') {
      const folder = accessibleFolders.find(f => f.id === current);
      if (!folder) break;
      trail.unshift({ id: folder.id, name: folder.name });
      current = folder.parentId || 'root';
    }
    return [...path, ...trail];
  };

  const breadcrumb = getBreadcrumb();
  const childFolders = accessibleFolders.filter(f =>
    (selectedFolder === 'root' ? f.parentId === null || f.parentId === 'root' : f.parentId === selectedFolder) && f.id !== 'root'
  );
  const currentFolderMedia = media.filter(m => {
    const matchFolder = m.folderId === selectedFolder;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });
  const handlePageClick = () => { if (contextMenu) setContextMenu(null); };

  return (
    <div className="page-enter" onClick={handlePageClick}>
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
            <button onClick={() => handleUpload()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white font-semibold transition-all"
              style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
              onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
              <Upload size={14} /> Subir Archivo
            </button>
          )}
        </div>
      } />

      <div className="p-3 md:p-6">
        {/* Breadcrumb + Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {breadcrumb.map((crumb, i) => (
              <div key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} style={{ color: '#a8b8d8' }} />}
                <button onClick={() => setSelectedFolder(crumb.id)}
                  className="text-sm font-semibold px-2 py-1 rounded-lg transition-all hover:bg-blue-50/50"
                  style={{ color: i === breadcrumb.length - 1 ? TJ.primary : '#666', fontFamily: 'Montserrat, sans-serif', fontWeight: i === breadcrumb.length - 1 ? 700 : 500 }}>
                  {i === 0 && <FolderOpen size={14} className="inline mr-1" style={{ color: TJ.gold }} />}
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: TJ.border }}>
              <button onClick={() => setViewMode('grid')} className="p-1.5 transition-colors"
                style={{ background: viewMode === 'grid' ? TJ.primary : 'white', color: viewMode === 'grid' ? 'white' : '#a8b8d8' }}>
                <Grid size={14} />
              </button>
              <button onClick={() => setViewMode('list')} className="p-1.5 transition-colors"
                style={{ background: viewMode === 'list' ? TJ.primary : 'white', color: viewMode === 'list' ? 'white' : '#a8b8d8' }}>
                <ListIcon size={14} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar archivos..."
                className="pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none w-48" style={{ borderColor: TJ.border, background: '#fff' }} />
            </div>
          </div>
        </div>

        {selectedFolder !== 'root' && (
          <button onClick={() => { const parent = accessibleFolders.find(f => f.id === selectedFolder)?.parentId; setSelectedFolder(parent || 'root'); }}
            className="flex items-center gap-1.5 text-xs mb-3 px-2 py-1 rounded-lg transition-colors" style={{ color: '#666' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0ece6'; e.currentTarget.style.color = TJ.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; }}>
            <ArrowLeft size={12} /> Regresar
          </button>
        )}

        {/* Folders Grid */}
        {childFolders.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>Carpetas</div>
            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "space-y-1"}>
              {childFolders.map(folder => (
                <div key={folder.id}
                  className={viewMode === 'grid' ? "bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md group relative" : "bg-white rounded-lg border px-3 py-2 cursor-pointer transition-all hover:shadow-md group relative flex items-center gap-3"}
                  style={{ borderColor: TJ.border }}
                  onClick={() => setSelectedFolder(folder.id)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}>
                  {viewMode === 'grid' ? (<>
                    <div className="flex items-center justify-center mb-2"><Folder size={40} style={{ color: TJ.gold }} strokeWidth={1.5} /></div>
                    <div className="text-center">
                      {renameId === folder.id ? (
                        <input value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                          onBlur={() => handleRenameFolder(folder.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setRenameId(null); }}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-center text-xs font-semibold px-1 py-0.5 border rounded focus:outline-none"
                          style={{ borderColor: TJ.primary, color: TJ.text, fontFamily: 'Montserrat, sans-serif' }} autoFocus />
                      ) : (
                        <span className="text-xs font-semibold truncate block" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }} title={folder.name}>{folder.name}</span>
                      )}
                      {!folder.accessRoles.includes('editor') && (
                        <div className="flex items-center justify-center gap-1 mt-1"><Lock size={9} style={{ color: '#a8b8d8' }} /><span className="text-xs" style={{ color: '#a8b8d8' }}>Restringida</span></div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}
                      className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100" style={{ color: '#999' }}>
                      <MoreVertical size={14} />
                    </button>
                  </>) : (<>
                    <Folder size={20} style={{ color: TJ.gold, flexShrink: 0 }} />
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{folder.name}</span>
                    {!folder.accessRoles.includes('editor') && <Lock size={12} style={{ color: '#a8b8d8' }} />}
                    <span className="text-xs" style={{ color: '#a8b8d8' }}>{media.filter(m => m.folderId === folder.id).length} archivos</span>
                    <button onClick={e => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100" style={{ color: '#999' }}>
                      <MoreVertical size={14} />
                    </button>
                  </>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
            Archivos {currentFolderMedia.length > 0 && `(${currentFolderMedia.length})`}
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentFolderMedia.map(asset => (
                <div key={asset.id} className="bg-white rounded-xl border overflow-hidden card-hover group relative" style={{ borderColor: TJ.border }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: asset.id }); }}>
                  <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: '#f8f7f5' }}>
                    {asset.type === 'image' && asset.url.startsWith('http') ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (<div style={{ color: '#d4cfc8' }}>{asset.type === 'image' ? <Image size={36} /> : <FileText size={36} />}</div>)}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-semibold truncate" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }} title={asset.name}>{asset.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{formatSize(asset.size)}</div>
                  </div>
                  <div className="px-2.5 pb-2.5 flex gap-1">
                    <button onClick={() => handleCopyLink(asset.id, asset.url)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg border transition-all"
                      style={{ borderColor: TJ.border, color: copiedId === asset.id ? '#276749' : TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {copiedId === asset.id ? <><Check size={11} /> Copiado</> : <><Link size={11} /> Enlace</>}
                    </button>
                    {canUpload && (<button onClick={() => handleReplace(asset.id)} className="p-1 rounded-lg border transition-all" style={{ borderColor: TJ.border, color: TJ.primary }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><RefreshCw size={12} /></button>)}
                    {canDeleteMedia && (<button onClick={() => deleteMedia(asset.id)} className="p-1 rounded-lg border transition-all" style={{ borderColor: '#fed7d7', color: '#c53030' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><Trash2 size={12} /></button>)}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: asset.id }); }}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm" style={{ color: '#999' }}>
                    <MoreVertical size={14} />
                  </button>
                </div>
              ))}
              {canUpload && (
                <button onClick={() => handleUpload()} className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-sm transition-all"
                  style={{ minHeight: 168, borderColor: TJ.border, color: '#a8b8d8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = '#a8b8d8'; }}>
                  <Upload size={22} className="mb-2" /><span className="text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Subir archivo</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {currentFolderMedia.map(asset => (
                <div key={asset.id} className="bg-white rounded-lg border px-3 py-2 flex items-center gap-3 hover:shadow-sm transition-all group" style={{ borderColor: TJ.border }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: asset.id }); }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f8f7f5' }}>
                    {asset.type === 'image' ? <Image size={16} style={{ color: TJ.gold }} /> : <FileText size={16} style={{ color: '#a8b8d8' }} />}
                  </div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{asset.name}</div></div>
                  <span className="text-xs flex-shrink-0" style={{ color: '#a8b8d8' }}>{formatSize(asset.size)}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#a8b8d8' }}>{asset.uploadedAt}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleCopyLink(asset.id, asset.url)} className="p-1 rounded-lg transition-all hover:bg-blue-50" style={{ color: copiedId === asset.id ? '#276749' : TJ.primary }}>
                      {copiedId === asset.id ? <Check size={14} /> : <Link size={14} />}
                    </button>
                    {canUpload && (<button onClick={() => handleReplace(asset.id)} className="p-1 rounded-lg transition-all hover:bg-blue-50" style={{ color: TJ.primary }}><RefreshCw size={14} /></button>)}
                    {canDeleteMedia && (<button onClick={() => deleteMedia(asset.id)} className="p-1 rounded-lg transition-all hover:bg-red-50" style={{ color: '#c53030' }}><Trash2 size={14} /></button>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentFolderMedia.length === 0 && !search && (
            <div className="text-center py-12" style={{ color: '#a8b8d8' }}>
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Carpeta vacia - sube archivos para comenzar</p>
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
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Ubicacion</label>
                <select value={newFolderParent} onChange={e => setNewFolderParent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: TJ.border }}>
                  <option value="root">Repositorio (raiz)</option>
                  {accessibleFolders.filter(f => f.id !== 'root').map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                </select>
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
              <button onClick={handleAddFolder} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Crear Carpeta</button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* Enhanced Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white rounded-xl shadow-xl border py-1.5 min-w-52"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 300), zIndex: 9999, borderColor: TJ.border }}
          onClick={e => { e.stopPropagation(); setContextMenu(null); }}>
          {contextMenu.type === 'folder' ? (<>
            <button onClick={() => { setSelectedFolder(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <FolderOpen size={13} style={{ color: TJ.gold }} /> Abrir carpeta
            </button>
            {isAdmin && (<button onClick={() => { setNewFolderParent(contextMenu.id); setShowNewFolder(true); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Plus size={13} style={{ color: TJ.primary }} /> Nueva subcarpeta
            </button>)}
            {canUpload && (<button onClick={() => { handleUpload(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Upload size={13} style={{ color: TJ.primary }} /> Subir archivo aqui
            </button>)}
            <div className="h-px mx-3 my-1" style={{ background: TJ.border }} />
            {canShare && (<button onClick={() => { handleShareFolder(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Share2 size={13} style={{ color: '#276749' }} /> Compartir carpeta
            </button>)}
            <button onClick={() => { const f = folders.find(fl => fl.id === contextMenu.id); if (f) { setRenameId(f.id); setRenameDraft(f.name); } }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Edit3 size={13} style={{ color: '#666' }} /> Renombrar
            </button>
            <button onClick={() => { setShowDetails(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Eye size={13} style={{ color: '#666' }} /> Ver detalles
            </button>
            {isAdmin && (<><div className="h-px mx-3 my-1" style={{ background: TJ.border }} />
              <button onClick={() => { handleDeleteFolder(contextMenu.id); }}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c53030' }}>
                <Trash2 size={13} /> Eliminar carpeta
              </button></>)}
          </>) : (<>
            <button onClick={() => { const asset = media.find(m => m.id === contextMenu.id); if (asset) handleCopyLink(asset.id, asset.url); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Link size={13} style={{ color: TJ.primary }} /> Copiar enlace
            </button>
            <button onClick={() => { const asset = media.find(m => m.id === contextMenu.id); if (asset?.url) window.open(asset.url, '_blank'); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Download size={13} style={{ color: '#666' }} /> Descargar
            </button>
            <button onClick={() => { setShowDetails(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Eye size={13} style={{ color: '#666' }} /> Ver detalles
            </button>
            <div className="h-px mx-3 my-1" style={{ background: TJ.border }} />
            {canUpload && (<button onClick={() => { handleReplace(contextMenu.id); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <RefreshCw size={13} style={{ color: TJ.primary }} /> Reemplazar archivo
            </button>)}
            <button onClick={() => { const asset = media.find(m => m.id === contextMenu.id); if (asset) navigator.clipboard.writeText(asset.name); }}
              className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: TJ.text }}>
              <Copy size={13} style={{ color: '#666' }} /> Copiar nombre
            </button>
            {canDeleteMedia && (<><div className="h-px mx-3 my-1" style={{ background: TJ.border }} />
              <button onClick={() => { deleteMedia(contextMenu.id); }}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 flex items-center gap-2.5" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c53030' }}>
                <Trash2 size={13} /> Eliminar
              </button></>)}
          </>)}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TJ.border }}>
              <div className="flex items-center gap-2">
                <Share2 size={16} style={{ color: TJ.primary }} />
                <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                  Compartir: {folders.find(f => f.id === showShareModal)?.name}
                </h3>
              </div>
              <button onClick={() => setShowShareModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs mb-3" style={{ color: '#a8b8d8' }}>Selecciona los roles que tendran acceso a esta carpeta:</p>
              <div className="space-y-2 max-h-60 overflow-auto mb-4">
                {users.filter(u => u.id !== currentUser.id).map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <Users size={14} style={{ color: '#a8b8d8' }} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{user.name}</div>
                      <div className="text-xs" style={{ color: '#a8b8d8' }}>{user.role} - {user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Acceso por rol</label>
                <div className="flex gap-2">
                  {(['admin', 'coordinador', 'editor'] as UserRole[]).map(role => (
                    <button key={role} onClick={() => setShareRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-all font-semibold capitalize"
                      style={{ borderColor: shareRoles.includes(role) ? TJ.primary : TJ.border, background: shareRoles.includes(role) ? 'rgba(27,75,133,0.08)' : 'white', color: shareRoles.includes(role) ? TJ.primary : '#666', fontFamily: 'Montserrat, sans-serif' }}>
                      {role === 'admin' ? 'Admin' : role === 'coordinador' ? 'Coord.' : 'Editor'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => setShowShareModal(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
              <button onClick={() => { if (showShareModal) updateFolder(showShareModal, { accessRoles: shareRoles }); setShowShareModal(null); }}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Guardar</button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* Details Panel */}
      {showDetails && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Detalles</h3>
              <button onClick={() => setShowDetails(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              {(() => {
                const folder = folders.find(f => f.id === showDetails);
                const asset = media.find(m => m.id === showDetails);
                if (folder) return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3"><Folder size={32} style={{ color: TJ.gold }} />
                      <div><div className="font-bold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{folder.name}</div><div className="text-xs" style={{ color: '#a8b8d8' }}>Carpeta</div></div>
                    </div>
                    <div className="text-xs space-y-1.5" style={{ color: '#666' }}>
                      <div><strong>Archivos:</strong> {media.filter(m => m.folderId === folder.id).length}</div>
                      <div><strong>Acceso:</strong> {folder.accessRoles.join(', ')}</div>
                      <div><strong>Subcarpetas:</strong> {folders.filter(f => f.parentId === folder.id).length}</div>
                    </div>
                  </div>
                );
                if (asset) return (
                  <div className="space-y-3">
                    {asset.type === 'image' && asset.url.startsWith('http') && (
                      <div className="rounded-lg overflow-hidden" style={{ background: '#f8f7f5' }}><img src={asset.url} alt={asset.name} className="w-full max-h-48 object-contain" /></div>
                    )}
                    <div className="text-xs space-y-1.5" style={{ color: '#666' }}>
                      <div><strong>Nombre:</strong> {asset.name}</div>
                      <div><strong>Tipo:</strong> {asset.type}</div>
                      <div><strong>Tamano:</strong> {formatSize(asset.size)}</div>
                      <div><strong>Subido por:</strong> {users.find(u => u.id === asset.uploadedBy)?.name || asset.uploadedBy}</div>
                      <div><strong>Fecha:</strong> {asset.uploadedAt}</div>
                    </div>
                  </div>
                );
                return <p className="text-xs" style={{ color: '#a8b8d8' }}>No hay detalles disponibles.</p>;
              })()}
            </div>
            <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => setShowDetails(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cerrar</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
