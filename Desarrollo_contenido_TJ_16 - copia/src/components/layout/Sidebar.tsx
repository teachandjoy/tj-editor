import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/context';
import { canView } from '../../utils/permissions';
import type { PermissionModule } from '../../types';
import {
  LayoutDashboard, GraduationCap, FileText, FolderOpen,
  BookOpen, GitBranch, Layout, Download, Users, LogOut,
  Palette, PanelLeftClose, PanelLeftOpen, Settings, X, ClipboardList
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mode?: 'mobile' | 'tablet' | 'desktop';
}

const allNavItems: { path: string; label: string; icon: typeof LayoutDashboard; module: PermissionModule }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { path: '/academic', label: 'Gestion Academica', icon: GraduationCap, module: 'ofertas' },
  { path: '/topics', label: 'Temas', icon: FileText, module: 'temas' },
  { path: '/repository', label: 'Repositorio', icon: FolderOpen, module: 'multimedia' },
  { path: '/bibliography', label: 'Bibliografia', icon: BookOpen, module: 'referencias' },
  { path: '/editorial', label: 'Flujo Editorial', icon: GitBranch, module: 'temas' },
  { path: '/templates', label: 'Plantillas', icon: Layout, module: 'temas' },
  { path: '/export', label: 'Exportar', icon: Download, module: 'temas' },
  { path: '/users', label: 'Usuarios', icon: Users, module: 'usuarios' },
  { path: '/identities', label: 'Identidades Corp.', icon: Palette, module: 'identidades' },
  { path: '/settings', label: 'Configuracion', icon: Settings, module: 'configuracion' },
];

const adminOnlyItems: { path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { path: '/audit-log', label: 'Auditoria', icon: ClipboardList },
];

const roleLabel = (role: string) => role === 'admin' ? 'Administrador' : role === 'coordinador' ? 'Coordinador' : 'Editor';

export default function Sidebar({ collapsed, onToggle, mode = 'desktop' }: SidebarProps) {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const navItems = allNavItems.filter(item => canView(currentUser, item.module));
  const extraItems = currentUser.role === 'admin' ? adminOnlyItems : [];

  // In mobile mode, sidebar is always expanded (shown as drawer)
  const isCollapsed = mode === 'mobile' ? false : collapsed;
  const w = isCollapsed ? 64 : 240;

  return (
    <aside style={{
      width: w, height: '100vh', background: '#162340',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', position: 'sticky', top: 0,
    }}>
      {/* Logo header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: isCollapsed ? '0 14px' : '0 14px',
        gap: 10, overflow: 'hidden',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, background: '#c5aa6f', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 9, color: '#1b4b85', letterSpacing: -0.3 }}>T&J</span>
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.25 }}>
              Teach &amp; Joy
            </div>
            <div style={{ fontSize: 10, color: 'rgba(168,184,216,0.6)', lineHeight: 1.25 }}>Estudio Académico</div>
          </div>
        )}
        {/* Toggle / Close button */}
        <button onClick={onToggle}
          title={mode === 'mobile' ? 'Cerrar menú' : (isCollapsed ? 'Expandir' : 'Minimizar')}
          style={{
            marginLeft: isCollapsed ? 0 : 'auto',
            flexShrink: 0, width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,0.07)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
          {mode === 'mobile' ? <X size={15} /> : (isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />)}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => { navigate(item.path); if (mode === 'mobile') onToggle(); }}
              title={isCollapsed ? item.label : ''}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: isCollapsed ? 0 : 10,
                padding: isCollapsed ? '10px 0' : '10px 16px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                background: isActive ? '#1b4b85' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderLeft: `3px solid ${isActive ? '#c5aa6f' : 'transparent'}`,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Open Sans,sans-serif', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: 'all .14s', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}>
              <Icon size={17} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.65 }} />
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </button>
          );
        })}
        {extraItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => { navigate(item.path); if (mode === 'mobile') onToggle(); }}
              title={isCollapsed ? item.label : ''}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: isCollapsed ? 0 : 10,
                padding: isCollapsed ? '10px 0' : '10px 16px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                background: isActive ? '#1b4b85' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderLeft: `3px solid ${isActive ? '#c5aa6f' : 'transparent'}`,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Open Sans,sans-serif', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: 'all .14s', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}>
              <Icon size={17} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.65 }} />
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: isCollapsed ? '10px 6px' : '10px 14px' }}>
        <button onClick={() => { navigate('/profile'); if (mode === 'mobile') onToggle(); }}
          title={isCollapsed ? 'Mi Perfil' : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: isCollapsed ? 0 : 9,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '8px 0' : '8px 4px',
            background: location.pathname === '/profile' ? 'rgba(255,255,255,0.1)' : 'none',
            border: 'none', cursor: 'pointer',
            color: location.pathname === '/profile' ? '#fff' : 'rgba(168,184,216,0.6)',
            borderRadius: 6, transition: 'all .14s', marginBottom: 6,
          }}
          onMouseEnter={e => { if (location.pathname !== '/profile') { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={e => { if (location.pathname !== '/profile') { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(168,184,216,0.6)'; } }}>
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#1b4b85',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c5aa6f', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>{currentUser.name.charAt(0)}</div>
          )}
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                {currentUser.name.split(' ').slice(0, 3).join(' ')}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(168,184,216,0.55)', textAlign: 'left' }}>{roleLabel(currentUser.role)}</div>
            </div>
          )}
        </button>
        <button onClick={() => { logout(); navigate('/'); }}
          title={isCollapsed ? 'Cerrar sesión' : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: isCollapsed ? 0 : 6,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '7px' : '7px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(168,184,216,0.4)', fontFamily: 'Open Sans,sans-serif', fontSize: 12,
            borderRadius: 6, transition: 'color .14s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(168,184,216,0.4)')}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
