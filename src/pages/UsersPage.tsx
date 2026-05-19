import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Shield, BookOpen, Edit3, Plus, Pencil, Trash2, X, Eye, EyeOff, RotateCcw, Search, Filter, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { User, UserRole, UserPermissions, SalesAccess, SalesAccessLevel, PermissionModule, PermissionAction } from '../types';
import { hasPermission, getDefaultPermissions, getEffectivePermissions, ALL_MODULES, MODULE_ACTIONS, MODULE_LABELS, ACTION_LABELS } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';

interface UserFormData {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
}

const emptyForm: UserFormData = { name: '', email: '', username: '', role: 'editor', password: '', confirmPassword: '' };

const defaultSalesAccess: SalesAccess = { enabled: false, level: 'solo_lectura', regions: [], discountLimit: 0 };

const salesLevelLabels: Record<SalesAccessLevel, string> = {
  solo_lectura: 'Solo lectura',
  lectura_escritura: 'Lectura y escritura',
  admin_ventas: 'Administrador de ventas',
};

export default function UsersPage() {
  const { currentUser, users, topics, offers, addUser, updateUser, deleteUser } = useApp();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Correction 11 — permission editing state
  const [editPerms, setEditPerms] = useState<UserPermissions | null>(null);
  // Correction 13 — sales access state
  const [editSales, setEditSales] = useState<SalesAccess>(defaultSalesAccess);
  const [salesRegionInput, setSalesRegionInput] = useState('');
  // Modal tab state
  const [activeTab, setActiveTab] = useState<'general' | 'permisos' | 'ventas'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<string>('all');

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  const filteredUsers = users.filter(u => {
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase()) && !u.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (offerFilter !== 'all') {
      const userTopics = topics.filter(t => t.assignedEditors.includes(u.id));
      if (!userTopics.some(t => t.offerId === offerFilter)) return false;
    }
    return true;
  });
  const canCreateUser = hasPermission(currentUser, 'usuarios', 'crear');
  const canEditUser = hasPermission(currentUser, 'usuarios', 'editar');
  const canDeleteUser = hasPermission(currentUser, 'usuarios', 'eliminar');

  const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; color: string; bg: string }> = {
    admin:       { label: 'Administrador',         icon: Shield,    color: TJ.primary,   bg: 'rgba(27,75,133,0.08)' },
    coordinador: { label: 'Coordinador Academico', icon: BookOpen,  color: TJ.secondary, bg: 'rgba(139,47,58,0.08)' },
    editor:      { label: 'Editor',                icon: Edit3,     color: '#276749',    bg: 'rgba(39,103,73,0.08)' },
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setShowPassword(false);
    setModalMode('create');
    setEditingUser(null);
    setEditPerms(getDefaultPermissions('editor'));
    setEditSales(defaultSalesAccess);
    setSalesRegionInput('');
    setActiveTab('general');
  };

  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, username: user.username, role: user.role, password: '', confirmPassword: '' });
    setFormErrors({});
    setShowPassword(false);
    setModalMode('edit');
    setEditingUser(user);
    setEditPerms(getEffectivePermissions(user));
    setEditSales(user.salesAccess || defaultSalesAccess);
    setSalesRegionInput('');
    setActiveTab('general');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setForm(emptyForm);
    setFormErrors({});
    setEditPerms(null);
    setEditSales(defaultSalesAccess);
    setActiveTab('general');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (!form.email.trim()) errors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email invalido';
    else {
      const dup = users.find(u => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingUser?.id);
      if (dup) errors.email = 'Este email ya esta registrado';
    }
    if (!form.username.trim()) errors.username = 'El usuario es requerido';
    else {
      const dupUser = users.find(u => u.username.toLowerCase() === form.username.trim().toLowerCase() && u.id !== editingUser?.id);
      if (dupUser) errors.username = 'Este nombre de usuario ya existe';
    }
    if (modalMode === 'create') {
      if (!form.password) errors.password = 'La contrasena es requerida';
      else if (form.password.length < 6) errors.password = 'Minimo 6 caracteres';
      if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contrasenas no coinciden';
    } else if (form.password) {
      if (form.password.length < 6) errors.password = 'Minimo 6 caracteres';
      if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contrasenas no coinciden';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (modalMode === 'create') {
      const newUser: User = {
        id: 'user-' + Date.now(),
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: form.role,
        password: form.password,
        permissions: editPerms || undefined,
        salesAccess: editSales.enabled ? editSales : undefined,
      };
      await addUser(newUser);
    } else if (editingUser) {
      const updates: Partial<User> = {
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: form.role,
        permissions: editPerms || undefined,
        salesAccess: editSales,
      };
      if (form.password) updates.password = form.password;
      await updateUser(editingUser.id, updates);
    }
    closeModal();
  };

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
    setDeleteConfirm(null);
  };

  // Permission matrix helpers
  const togglePerm = (mod: PermissionModule, action: PermissionAction) => {
    if (!editPerms) return;
    setEditPerms(prev => {
      if (!prev) return prev;
      const current = !!prev[mod]?.[action];
      return { ...prev, [mod]: { ...prev[mod], [action]: !current } };
    });
  };

  const restoreDefaultPerms = () => {
    setEditPerms(getDefaultPermissions(form.role));
  };

  // Sales access helpers
  const addRegion = () => {
    const r = salesRegionInput.trim();
    if (!r) return;
    if (!editSales.regions.includes(r)) {
      setEditSales(prev => ({ ...prev, regions: [...prev.regions, r] }));
    }
    setSalesRegionInput('');
  };

  const removeRegion = (region: string) => {
    setEditSales(prev => ({ ...prev, regions: prev.regions.filter(r => r !== region) }));
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1.5px solid ${hasError ? '#c53030' : '#e8e4de'}`, background: '#fff',
    fontSize: 13, fontFamily: 'Open Sans,sans-serif', color: '#2a2a32',
    outline: 'none', transition: 'border-color .15s',
  });

  // When role changes in the form, update default permissions
  const handleRoleChange = (newRole: UserRole) => {
    setForm(f => ({ ...f, role: newRole }));
    // If editing and user had custom perms, ask or auto-reset
    setEditPerms(getDefaultPermissions(newRole));
  };

  return (
    <div className="page-enter">
      <Header title="Usuarios" actions={
        canCreateUser ? (
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: 'none', background: TJ.primary, color: '#fff',
            fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
          onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Plus size={15} /> Crear usuario
          </button>
        ) : undefined
      } />
      <div className="p-3 md:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar usuarios..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none"
              style={{ borderColor: TJ.border, background: '#fff' }} />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm border rounded-lg focus:outline-none appearance-none"
              style={{ borderColor: TJ.border, background: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="coordinador">Coordinador</option>
              <option value="editor">Editor</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
          </div>
          <div className="relative">
            <select value={offerFilter} onChange={e => setOfferFilter(e.target.value)}
              className="pl-4 pr-8 py-2.5 text-sm border rounded-lg focus:outline-none appearance-none"
              style={{ borderColor: TJ.border, background: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
              <option value="all">Todas las ofertas</option>
              {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
          </div>
        </div>
        <p className="text-sm mb-4" style={{ color: '#a8b8d8' }}>{filteredUsers.length} de {users.length} usuarios</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => {
            const cfg = roleConfig[user.role];
            const Icon = cfg.icon;
            const userTopics = topics.filter(t => t.assignedEditors.includes(user.id));
            return (
              <div key={user.id} className="bg-white rounded-xl border p-5" style={{ borderColor: TJ.border }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                    style={{ background: cfg.color, fontFamily: 'Montserrat, sans-serif' }}>
                    {user.avatar ? <img src={user.avatar} alt="" className="w-11 h-11 rounded-full object-cover" /> : user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{user.name}</div>
                    <div className="text-xs" style={{ color: '#a8b8d8' }}>{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
                    style={{ background: cfg.bg, color: cfg.color, fontFamily: 'Montserrat, sans-serif' }}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs mr-2" style={{ color: '#a8b8d8' }}>{userTopics.length} temas</span>
                    {canEditUser && (
                      <button onClick={() => openEdit(user)} title="Editar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#a8b8d8', transition: 'color .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = TJ.primary)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#a8b8d8')}>
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDeleteUser && user.id !== currentUser.id && (
                      <button onClick={() => setDeleteConfirm(user.id)} title="Eliminar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#a8b8d8', transition: 'color .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c53030')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#a8b8d8')}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {deleteConfirm && (() => {
        const userToDelete = users.find(u => u.id === deleteConfirm);
        return (
          <ModalPortal><div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setDeleteConfirm(null)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: 400, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 16, color: TJ.text, marginBottom: 12 }}>
                Eliminar usuario
              </h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
                {'Estas seguro de que deseas eliminar a '}
                <strong>{userToDelete?.name}</strong>
                {'? Esta accion no se puede deshacer.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: `1.5px solid ${TJ.border}`, background: '#fff', fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: TJ.text }}>
                  Cancelar
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#c53030', color: '#fff', fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#9b2c2c')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#c53030')}>
                  Eliminar
                </button>
              </div>
            </div>
          </div></ModalPortal>
        );
      })()}

      {modalMode && (
        <ModalPortal><div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
          onClick={closeModal}>
          <div style={{ background: '#fff', borderRadius: 16, width: 620, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0 24px' }}>
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 16, color: TJ.text }}>
                {modalMode === 'create' ? 'Crear usuario' : 'Editar usuario'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8b8d8', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs — only show Permisos & Ventas tabs for admins */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `1.5px solid ${TJ.border}`, padding: '0 24px', marginTop: 16 }}>
              {(['general', ...(isAdmin ? ['permisos', 'ventas'] : [])] as ('general' | 'permisos' | 'ventas')[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '10px 18px', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: activeTab === tab ? TJ.primary : '#a8b8d8',
                  borderBottom: activeTab === tab ? `2px solid ${TJ.primary}` : '2px solid transparent',
                  marginBottom: -1.5, transition: 'all .15s',
                }}>
                  {tab === 'general' ? 'General' : tab === 'permisos' ? 'Permisos' : 'Acceso Ventas'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ====== GENERAL TAB ====== */}
              {activeTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Nombre *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      style={inputStyle(!!formErrors.name)} placeholder="Nombre completo" />
                    {formErrors.name && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{formErrors.name}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Email *</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email"
                      style={inputStyle(!!formErrors.email)} placeholder="correo@ejemplo.com" />
                    {formErrors.email && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{formErrors.email}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Usuario *</label>
                    <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      style={inputStyle(!!formErrors.username)} placeholder="nombre.usuario" />
                    {formErrors.username && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{formErrors.username}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Rol *</label>
                    <select value={form.role} onChange={e => handleRoleChange(e.target.value as UserRole)}
                      style={{ ...inputStyle(false), cursor: 'pointer' }}>
                      <option value="admin">Administrador</option>
                      <option value="coordinador">Coordinador Academico</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                      {modalMode === 'create' ? 'Contrasena *' : 'Nueva contrasena (dejar vacio para no cambiar)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        style={{ ...inputStyle(!!formErrors.password), paddingRight: 40 }}
                        placeholder={modalMode === 'create' ? 'Minimo 6 caracteres' : 'Dejar vacio para mantener'} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a8b8d8', padding: 2 }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formErrors.password && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{formErrors.password}</p>}
                  </div>
                  {(modalMode === 'create' || form.password) && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                        Confirmar contrasena *
                      </label>
                      <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        style={inputStyle(!!formErrors.confirmPassword)}
                        placeholder="Repite la contrasena" />
                      {formErrors.confirmPassword && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{formErrors.confirmPassword}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ====== PERMISOS TAB (Correction 11) ====== */}
              {activeTab === 'permisos' && isAdmin && editPerms && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: '#a8b8d8' }}>
                      Permisos individuales para este usuario. Los cambios sobreescriben los permisos por defecto del rol.
                    </p>
                    <button onClick={restoreDefaultPerms} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7,
                      border: `1.5px solid ${TJ.border}`, background: '#fff', fontSize: 11, fontWeight: 600,
                      fontFamily: 'Montserrat,sans-serif', cursor: 'pointer', color: TJ.primary, whiteSpace: 'nowrap',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <RotateCcw size={12} /> Restaurar por defecto
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, color: TJ.text, borderBottom: `2px solid ${TJ.border}` }}>
                            Modulo
                          </th>
                          {(['ver', 'crear', 'editar', 'eliminar', 'publicar'] as PermissionAction[]).map(action => (
                            <th key={action} style={{ textAlign: 'center', padding: '8px 6px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, color: TJ.text, borderBottom: `2px solid ${TJ.border}`, minWidth: 60 }}>
                              {ACTION_LABELS[action]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ALL_MODULES.map(mod => {
                          const allowedActions = MODULE_ACTIONS[mod];
                          return (
                            <tr key={mod} style={{ borderBottom: `1px solid ${TJ.border}` }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: TJ.text, fontFamily: 'Montserrat,sans-serif' }}>
                                {MODULE_LABELS[mod]}
                              </td>
                              {(['ver', 'crear', 'editar', 'eliminar', 'publicar'] as PermissionAction[]).map(action => {
                                const isAllowed = allowedActions.includes(action);
                                const checked = !!editPerms[mod]?.[action];
                                return (
                                  <td key={action} style={{ textAlign: 'center', padding: '8px 6px' }}>
                                    {isAllowed ? (
                                      <input type="checkbox" checked={checked} onChange={() => togglePerm(mod, action)}
                                        style={{ accentColor: TJ.primary, width: 16, height: 16, cursor: 'pointer' }} />
                                    ) : (
                                      <span style={{ color: '#e0ddd8' }}>-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ====== VENTAS TAB (Correction 13) ====== */}
              {activeTab === 'ventas' && isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <div onClick={() => setEditSales(prev => ({ ...prev, enabled: !prev.enabled }))}
                        style={{
                          width: 42, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                          background: editSales.enabled ? TJ.primary : '#d4cfc8', transition: 'background .2s',
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute',
                          top: 2, left: editSales.enabled ? 20 : 2, transition: 'left .2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,sans-serif', color: TJ.text }}>
                        Acceso a modulo de ventas
                      </span>
                    </label>
                  </div>

                  {editSales.enabled && (
                    <>
                      {/* Level */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                          Nivel de acceso de ventas
                        </label>
                        <select value={editSales.level} onChange={e => setEditSales(prev => ({ ...prev, level: e.target.value as SalesAccessLevel }))}
                          style={{ ...inputStyle(false), cursor: 'pointer' }}>
                          {(Object.keys(salesLevelLabels) as SalesAccessLevel[]).map(lvl => (
                            <option key={lvl} value={lvl}>{salesLevelLabels[lvl]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Regions */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                          Regiones / zonas asignadas
                        </label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <input value={salesRegionInput} onChange={e => setSalesRegionInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addRegion()}
                            style={{ ...inputStyle(false), flex: 1 }} placeholder="Agregar region..." />
                          <button onClick={addRegion} style={{
                            padding: '8px 14px', borderRadius: 8, border: 'none', background: TJ.primary, color: '#fff',
                            fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat,sans-serif', cursor: 'pointer',
                          }}>Agregar</button>
                        </div>
                        {editSales.regions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {editSales.regions.map(r => (
                              <span key={r} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                background: 'rgba(27,75,133,0.08)', color: TJ.primary, fontFamily: 'Montserrat,sans-serif',
                              }}>
                                {r}
                                <button onClick={() => removeRegion(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TJ.primary, padding: 0, lineHeight: 1 }}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Discount limit */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                          Limite de descuento autorizado (%)
                        </label>
                        <input type="number" min={0} max={100} value={editSales.discountLimit}
                          onChange={e => setEditSales(prev => ({ ...prev, discountLimit: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                          style={{ ...inputStyle(false), width: 120 }} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1.5px solid ${TJ.border}` }}>
              <button onClick={closeModal}
                style={{ padding: '9px 20px', borderRadius: 8, border: `1.5px solid ${TJ.border}`, background: '#fff', fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: TJ.text }}>
                Cancelar
              </button>
              <button onClick={handleSubmit}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: TJ.primary, color: '#fff', fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
                {modalMode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
