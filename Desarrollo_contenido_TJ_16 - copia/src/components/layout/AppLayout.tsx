import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useApp } from '../../store/context';
import { getRequiredModule, canView } from '../../utils/permissions';

/** Tailwind breakpoints (px) */
const BP_MD = 768;
const BP_LG = 1024;

type LayoutMode = 'mobile' | 'tablet' | 'desktop';

function getMode(w: number): LayoutMode {
  if (w < BP_MD) return 'mobile';
  if (w < BP_LG) return 'tablet';
  return 'desktop';
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<LayoutMode>(() => getMode(window.innerWidth));
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const { currentUser, loading, loadError, loadAllData } = useApp();
  const dataLoadedRef = useRef(false);

  // Load data when user is authenticated but data hasn't been loaded yet
  useEffect(() => {
    if (currentUser && !dataLoadedRef.current && !loading && !loadError) {
      dataLoadedRef.current = true;
      loadAllData();
    }
  }, [currentUser, loading, loadError, loadAllData]);

  // Track viewport width
  useEffect(() => {
    const onResize = () => {
      const m = getMode(window.innerWidth);
      setMode(m);
      if (m === 'desktop') setMobileOpen(false);
      if (m === 'tablet') setCollapsed(true);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Trigger page transition animation on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.classList.remove('page-enter');
      void mainRef.current.offsetWidth;
      mainRef.current.classList.add('page-enter');
    }
  }, [location.pathname]);

  const toggleSidebar = useCallback(() => {
    if (mode === 'mobile') {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  }, [mode]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f4f5f7' }}>
        <div className="text-center">
          <div style={{ width: 48, height: 48, border: '4px solid #e8e4de', borderTopColor: '#1b4b85', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#1b4b85', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>Cargando datos...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f4f5f7' }}>
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg" style={{ border: '1px solid #e8e4de' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(197,48,48,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c53030" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: '#2a2a32', marginBottom: 8 }}>Error de conexion</h2>
          <p style={{ fontSize: 13, color: '#a8b8d8', lineHeight: 1.6, marginBottom: 20 }}>{loadError}</p>
          <button onClick={() => loadAllData()}
            style={{ background: '#1b4b85', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#8b2f3a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1b4b85')}>
            Reintentar conexion
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  const requiredModule = getRequiredModule(location.pathname);
  if (requiredModule && !canView(currentUser, requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  const sidebarCollapsed = mode === 'tablet' ? true : collapsed;

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f5f7' }}>
      {/* Mobile overlay backdrop */}
      {mode === 'mobile' && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      {mode === 'mobile' ? (
        <div
          className="fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out"
          style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <Sidebar collapsed={false} onToggle={closeMobile} mode={mode} />
        </div>
      ) : (
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} mode={mode} />
      )}

      <main ref={mainRef} className="flex-1 overflow-auto flex flex-col page-enter min-w-0">
        <Outlet context={{ mode, toggleSidebar, mobileOpen }} />
      </main>
    </div>
  );
}
