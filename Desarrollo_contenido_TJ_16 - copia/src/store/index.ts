import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  User, Offer, Topic, Template, BibliographyReference,
  MediaAsset, RepositoryFolder, CorporateIdentity
} from '../types';
import {
  apiGet, apiPost, apiPut, apiDelete,
  setSaveStatusCallback, setConnectionCallback,
  startHeartbeat, stopHeartbeat, syncPendingRequests,
} from '../lib/api';
import { emitToast } from '../lib/toast-bus';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export function useAppStore() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [references, setReferences] = useState<BibliographyReference[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<RepositoryFolder[]>([]);
  const [identities, setIdentities] = useState<CorporateIdentity[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendReachable, setBackendReachable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    setSaveStatusCallback((status: SaveStatus) => setSaveStatus(status));
    setConnectionCallback((online: boolean) => setBackendReachable(online));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    startHeartbeat();
    return () => {
      stopHeartbeat();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [u, o, t, tpl, r, m, f, i] = await Promise.all([
        apiGet<User[]>('/users'),
        apiGet<Offer[]>('/offers'),
        apiGet<Topic[]>('/topics'),
        apiGet<Template[]>('/templates'),
        apiGet<BibliographyReference[]>('/references'),
        apiGet<MediaAsset[]>('/media'),
        apiGet<RepositoryFolder[]>('/folders'),
        apiGet<CorporateIdentity[]>('/identities'),
      ]);
      setUsers(u); setOffers(o); setTopics(t); setTemplates(tpl);
      setReferences(r); setMedia(m); setFolders(f); setIdentities(i);
      setBackendReachable(true);
      await syncPendingRequests();
    } catch (err) {
      console.error('[Store] Error loading data:', err);
      setLoadError('No se pudo conectar con el servidor. Verifica que el backend este ejecutandose.');
      setBackendReachable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    // On mount, try to restore session from stored token
    const token = localStorage.getItem('tj_session_token');
    if (token) {
      // Verify token and restore user
      apiPost<{ user: User; token: string }>('/sessions/verify', { token })
        .then(result => {
          setCurrentUser(result.user);
          loadAllData();
        })
        .catch(() => {
          localStorage.removeItem('tj_session_token');
          localStorage.removeItem('tj_user_id');
        });
    }
  }, [loadAllData]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await apiPost<{ user: User; token: string }>('/sessions/login', { username, password });
      setCurrentUser(result.user);
      localStorage.setItem('tj_session_token', result.token);
      localStorage.setItem('tj_user_id', result.user.id);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexion';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('tj_session_token');
    try { if (token) await apiPost('/sessions/logout', { token }); } catch { /* ignore */ }
    setCurrentUser(null);
    localStorage.removeItem('tj_session_token');
    localStorage.removeItem('tj_user_id');
  }, []);

  // Session restore is handled by the init effect above

  const addOffer = useCallback(async (offer: Offer) => {
    setOffers(prev => [...prev, offer]);
    try { await apiPost('/offers', offer); } catch { emitToast('Error al guardar oferta. Se reintentará cuando haya conexión.', 'warning'); }
  }, []);

  const updateOffer = useCallback(async (id: string, updates: Partial<Offer>) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    try { await apiPut(`/offers/${id}`, updates); } catch { emitToast('Error al actualizar oferta. Se reintentará.', 'warning'); }
  }, []);

  const deleteOffer = useCallback(async (id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    try { await apiDelete(`/offers/${id}`); } catch { emitToast('Error al eliminar oferta.', 'error'); }
  }, []);

  const reorderOffers = useCallback(async (newOrder: Offer[]) => {
    setOffers(newOrder);
    try { await apiPut('/offers', newOrder.map((o, i) => ({ id: o.id, order: i }))); } catch { emitToast('Error al reordenar. Se reintentará.', 'warning'); }
  }, []);

  const reorderModules = useCallback(async (offerId: string, newModules: Offer['modules']) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, modules: newModules } : o));
    try { await apiPut(`/offers/${offerId}`, { modules: newModules }); } catch { emitToast('Error al reordenar módulos.', 'warning'); }
  }, []);

  const addModule = useCallback(async (offerId: string, mod: Offer['modules'][0]) => {
    let updatedModules: Offer['modules'] = [];
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) { updatedModules = [...o.modules, mod]; return { ...o, modules: updatedModules }; }
      return o;
    }));
    try { await apiPut(`/offers/${offerId}`, { modules: updatedModules }); } catch { emitToast('Error al guardar módulo.', 'warning'); }
  }, []);

  const updateModule = useCallback(async (offerId: string, moduleId: string, updates: Partial<Offer['modules'][0]>) => {
    let updatedModules: Offer['modules'] = [];
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        updatedModules = o.modules.map(m => m.id === moduleId ? { ...m, ...updates } : m);
        return { ...o, modules: updatedModules };
      }
      return o;
    }));
    try { await apiPut(`/offers/${offerId}`, { modules: updatedModules }); } catch { emitToast('Error al actualizar módulo.', 'warning'); }
  }, []);

  const deleteModule = useCallback(async (offerId: string, moduleId: string) => {
    let updatedModules: Offer['modules'] = [];
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        updatedModules = o.modules.filter(m => m.id !== moduleId);
        return { ...o, modules: updatedModules };
      }
      return o;
    }));
    try { await apiPut(`/offers/${offerId}`, { modules: updatedModules }); } catch { emitToast('Error al eliminar módulo.', 'warning'); }
  }, []);

  const addTopic = useCallback(async (topic: Topic) => {
    setTopics(prev => [...prev, topic]);
    try { await apiPost('/topics', topic); } catch { emitToast('Error al crear tema. Se reintentará.', 'warning'); }
  }, []);

  const updateTopic = useCallback(async (id: string, updates: Partial<Topic>) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try { await apiPut(`/topics/${id}`, updates); } catch { emitToast('Error al guardar tema. Los cambios se reintentarán.', 'warning'); }
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    try { await apiDelete(`/topics/${id}`); } catch { emitToast('Error al eliminar tema.', 'error'); }
  }, []);

  const addTemplate = useCallback(async (template: Template) => {
    setTemplates(prev => [...prev, template]);
    try { await apiPost('/templates', template); } catch { emitToast('Error al guardar plantilla.', 'warning'); }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try { await apiPut(`/templates/${id}`, updates); } catch { emitToast('Error al actualizar plantilla.', 'warning'); }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    try { await apiDelete(`/templates/${id}`); } catch { emitToast('Error al eliminar plantilla.', 'error'); }
  }, []);

  const addReference = useCallback(async (ref: BibliographyReference) => {
    setReferences(prev => [...prev, ref]);
    try { await apiPost('/references', ref); } catch { emitToast('Error al guardar referencia.', 'warning'); }
  }, []);

  const updateReference = useCallback(async (id: string, updates: Partial<BibliographyReference>) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    try { await apiPut(`/references/${id}`, updates); } catch { emitToast('Error al actualizar referencia.', 'warning'); }
  }, []);

  const deleteReference = useCallback(async (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
    try { await apiDelete(`/references/${id}`); } catch { emitToast('Error al eliminar referencia.', 'error'); }
  }, []);

  const addMedia = useCallback(async (asset: MediaAsset) => {
    setMedia(prev => [...prev, asset]);
    try { await apiPost('/media', asset); } catch { emitToast('Error al subir archivo multimedia.', 'warning'); }
  }, []);

  const deleteMedia = useCallback(async (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
    try { await apiDelete(`/media/${id}`); } catch { emitToast('Error al eliminar multimedia.', 'error'); }
  }, []);

  const addFolder = useCallback(async (folder: RepositoryFolder) => {
    setFolders(prev => [...prev, folder]);
    try { await apiPost('/folders', folder); } catch { emitToast('Error al crear carpeta.', 'warning'); }
  }, []);

  const updateFolder = useCallback(async (id: string, updates: Partial<RepositoryFolder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try { await apiPut(`/folders/${id}`, updates); } catch { emitToast('Error al actualizar carpeta.', 'warning'); }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    try { await apiDelete(`/folders/${id}`); } catch { emitToast('Error al eliminar carpeta.', 'error'); }
  }, []);

  const addIdentity = useCallback(async (identity: CorporateIdentity) => {
    setIdentities(prev => [...prev, identity]);
    try { await apiPost('/identities', identity); } catch { emitToast('Error al guardar identidad corporativa.', 'warning'); }
  }, []);

  const updateIdentity = useCallback(async (id: string, updates: Partial<CorporateIdentity>) => {
    setIdentities(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try { await apiPut(`/identities/${id}`, updates); } catch { emitToast('Error al actualizar identidad.', 'warning'); }
  }, []);

  const deleteIdentity = useCallback(async (id: string) => {
    setIdentities(prev => prev.filter(i => i.id !== id));
    try { await apiDelete(`/identities/${id}`); } catch { emitToast('Error al eliminar identidad.', 'error'); }
  }, []);

  const addUser = useCallback(async (user: User) => {
    setUsers(prev => [...prev, user]);
    try { await apiPost('/users', user); } catch { emitToast('Error al crear usuario.', 'warning'); }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    setCurrentUser(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
    try { await apiPut(`/users/${id}`, updates); } catch { emitToast('Error al actualizar usuario.', 'warning'); }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    try { await apiDelete(`/users/${id}`); } catch { emitToast('Error al eliminar usuario.', 'error'); }
  }, []);

  const assignEditor = useCallback(async (targetType: 'module' | 'topic', targetId: string, editorId: string, offerId?: string) => {
    if (targetType === 'topic') {
      let updatedEditors: string[] = [];
      setTopics(prev => prev.map(t => {
        if (t.id === targetId) {
          updatedEditors = [...new Set([...t.assignedEditors, editorId])];
          return { ...t, assignedEditors: updatedEditors };
        }
        return t;
      }));
      try { await apiPut(`/topics/${targetId}`, { assignedEditors: updatedEditors }); } catch { emitToast('Error al asignar editor.', 'warning'); }
    } else if (offerId) {
      let updatedModules: Offer['modules'] = [];
      setOffers(prev => prev.map(o => {
        if (o.id === offerId) {
          updatedModules = o.modules.map(m =>
            m.id === targetId ? { ...m, assignedEditors: [...new Set([...m.assignedEditors, editorId])] } : m
          );
          return { ...o, modules: updatedModules };
        }
        return o;
      }));
      try { await apiPut(`/offers/${offerId}`, { modules: updatedModules }); } catch { emitToast('Error al asignar editor.', 'warning'); }
    }
  }, []);

  const removeEditor = useCallback(async (targetType: 'module' | 'topic', targetId: string, editorId: string, offerId?: string) => {
    if (targetType === 'topic') {
      let updatedEditors: string[] = [];
      setTopics(prev => prev.map(t => {
        if (t.id === targetId) {
          updatedEditors = t.assignedEditors.filter(e => e !== editorId);
          return { ...t, assignedEditors: updatedEditors };
        }
        return t;
      }));
      try { await apiPut(`/topics/${targetId}`, { assignedEditors: updatedEditors }); } catch { emitToast('Error al asignar editor.', 'warning'); }
    } else if (offerId) {
      let updatedModules: Offer['modules'] = [];
      setOffers(prev => prev.map(o => {
        if (o.id === offerId) {
          updatedModules = o.modules.map(m =>
            m.id === targetId ? { ...m, assignedEditors: m.assignedEditors.filter(e => e !== editorId) } : m
          );
          return { ...o, modules: updatedModules };
        }
        return o;
      }));
      try { await apiPut(`/offers/${offerId}`, { modules: updatedModules }); } catch { emitToast('Error al asignar editor.', 'warning'); }
    }
  }, []);

  return {
    currentUser, users, offers, topics, templates, references, media, folders, identities,
    saveStatus, isOnline, backendReachable, loading, loadError,
    login, logout, loadAllData,
    addOffer, updateOffer, deleteOffer, reorderOffers, reorderModules,
    addModule, updateModule, deleteModule,
    addTopic, updateTopic, deleteTopic,
    addTemplate, updateTemplate, deleteTemplate,
    addReference, updateReference, deleteReference,
    addMedia, deleteMedia,
    addFolder, updateFolder, deleteFolder,
    addIdentity, updateIdentity, deleteIdentity,
    assignEditor, removeEditor,
    setOffers, setUsers,
    addUser, updateUser, deleteUser,
  };
}

export type AppStore = ReturnType<typeof useAppStore>;
