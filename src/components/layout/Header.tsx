import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Wifi, WifiOff, Loader2, Check, AlertTriangle, FileText, BookOpen, Users, Image, BookMarked, Menu, X } from 'lucide-react';
import { useApp } from '../../store/context';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { TJ } from '../../constants/theme';

interface LayoutContext {
  mode: 'mobile' | 'tablet' | 'desktop';
  toggleSidebar: () => void;
  mobileOpen: boolean;
}

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  category: string;
  path: string;
}

const categoryConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  topics: { label: 'Temas', icon: FileText, color: '#1b4b85' },
  offers: { label: 'Ofertas', icon: BookOpen, color: '#8b2f3a' },
  users: { label: 'Usuarios', icon: Users, color: '#6b46c1' },
  media: { label: 'Multimedia', icon: Image, color: '#c5aa6f' },
  references: { label: 'Referencias', icon: BookMarked, color: '#276749' },
};

function NotificationBell() {
  const { topics } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const notifications = useMemo(() => {
    const notifs: { id: string; message: string; type: 'info' | 'warning' | 'success'; time: string }[] = [];
    topics.filter(t => t.status === 'devuelto').forEach(t => {
      notifs.push({ id: `dev-${t.id}`, message: `Tema "${t.title}" fue devuelto`, type: 'warning', time: t.date });
    });
    topics.filter(t => t.status === 'en_revision').forEach(t => {
      notifs.push({ id: `rev-${t.id}`, message: `Tema "${t.title}" está en revisión`, type: 'info', time: t.date });
    });
    topics.filter(t => t.status === 'aprobado').forEach(t => {
      notifs.push({ id: `apr-${t.id}`, message: `Tema "${t.title}" fue aprobado`, type: 'success', time: t.date });
    });
    return notifs.slice(0, 10);
  }, [topics]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: open ? TJ.primary : '#a8b8d8' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f0ece6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <Bell size={17} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: TJ.secondary }} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border shadow-lg overflow-hidden z-50"
          style={{ borderColor: TJ.border, maxHeight: 380, overflowY: 'auto' }}>
          <div className="px-4 py-3 border-b font-bold text-xs" style={{ color: TJ.primary, borderColor: TJ.border, fontFamily: 'Montserrat, sans-serif' }}>
            Notificaciones ({notifications.length})
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#a8b8d8' }}>Sin notificaciones</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="px-4 py-3 border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f0ece6' }}>
                <p className="text-sm" style={{ color: TJ.text }}>{n.message}</p>
                <span className="text-xs" style={{ color: '#a8b8d8' }}>{n.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === 'saving') return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(27,75,133,0.08)', color: '#1b4b85' }}>
      <Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Guardando...</span>
    </div>
  );
  if (status === 'saved') return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(39,103,73,0.1)', color: '#276749' }}>
      <Check size={12} /> <span className="hidden sm:inline">Guardado</span>
    </div>
  );
  if (status === 'error') return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(197,48,48,0.1)', color: '#c53030' }}>
      <AlertTriangle size={12} /> <span className="hidden sm:inline">Error al guardar</span>
    </div>
  );
  if (status === 'offline') return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(197,48,48,0.1)', color: '#c53030' }}>
      <WifiOff size={12} /> <span className="hidden sm:inline">Sin conexion</span>
    </div>
  );
  return null;
}

export default function Header({ title, actions }: HeaderProps) {
  const { currentUser, saveStatus, isOnline, topics, offers, users, media, references } = useApp();
  const navigate = useNavigate();

  const layoutCtx = useOutletContext<LayoutContext | null>();
  const mode = layoutCtx?.mode ?? 'desktop';
  const toggleSidebar = layoutCtx?.toggleSidebar;

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (mode === 'mobile') setMobileSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mode]);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      if (mode === 'mobile') setMobileSearchOpen(false);
    }
  }, [mode]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    topics.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
        out.push({ id: t.id, label: t.title, subtitle: t.offerName || 'Sin oferta', category: 'topics', path: `/editor/${t.id}` });
      }
    });

    offers.forEach(o => {
      if (o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q)) {
        out.push({ id: o.id, label: o.name, subtitle: o.type, category: 'offers', path: '/topics' });
      }
    });

    users.forEach(u => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) {
        out.push({ id: u.id, label: u.name, subtitle: u.role, category: 'users', path: '/users' });
      }
    });

    media.forEach(m => {
      if (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) {
        out.push({ id: m.id, label: m.name, subtitle: m.type, category: 'media', path: '/repository' });
      }
    });

    references.forEach(r => {
      if (r.title.toLowerCase().includes(q) || r.authors.toLowerCase().includes(q)) {
        out.push({ id: r.id, label: r.title, subtitle: r.authors, category: 'references', path: '/bibliography' });
      }
    });

    return out;
  }, [query, topics, offers, users, media, references]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach(r => {
      const arr = map.get(r.category) || [];
      arr.push(r);
      map.set(r.category, arr);
    });
    return map;
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setMobileSearchOpen(false);
    navigate(result.path);
  };

  const showDropdown = isOpen && query.trim().length > 0;

  const renderSearchResults = () => (
    results.length === 0 ? (
      <div className="px-4 py-6 text-center text-sm" style={{ color: '#a8b8d8' }}>Sin resultados</div>
    ) : (
      Array.from(grouped.entries()).map(([cat, items]) => {
        const cfg = categoryConfig[cat];
        const Icon = cfg.icon;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: '#f8f7f5', borderColor: '#e8e4de' }}>
              <Icon size={13} style={{ color: cfg.color }} />
              <span className="text-xs font-semibold" style={{ color: cfg.color, fontFamily: 'Montserrat, sans-serif' }}>{cfg.label}</span>
              <span className="text-xs ml-auto" style={{ color: '#a8b8d8' }}>{items.length}</span>
            </div>
            {items.slice(0, 5).map(item => (
              <button key={item.id} onClick={() => handleSelect(item)} className="w-full text-left px-4 py-2 flex flex-col transition-colors hover:bg-gray-50">
                <span className="text-sm font-medium truncate" style={{ color: '#2a2a32' }}>{item.label}</span>
                {item.subtitle && <span className="text-xs truncate" style={{ color: '#a8b8d8' }}>{item.subtitle}</span>}
              </button>
            ))}
          </div>
        );
      })
    )
  );

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-3 md:px-6 flex-shrink-0 gap-2 relative sticky top-0 z-30"
      style={{ background: '#fff', borderColor: TJ.border }}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-2 min-w-0">
        {mode === 'mobile' && toggleSidebar && (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            style={{ color: '#1b4b85' }} title="Abrir menu">
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-base md:text-lg font-bold truncate" style={{ color: '#1b4b85', fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h1>
      </div>

      {/* Right: actions, status, search, notifications, profile */}
      <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
        {actions}
        <SaveIndicator status={saveStatus} />
        {!isOnline && (
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(197,48,48,0.1)', color: '#c53030' }}>
            <WifiOff size={12} /> <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        {isOnline && saveStatus === 'idle' && (
          <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: '#a8b8d8' }}>
            <Wifi size={12} />
          </div>
        )}

        {/* Search: mobile = icon toggle; desktop/tablet = always visible */}
        {mode === 'mobile' ? (
          <>
            <button onClick={() => { setMobileSearchOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="p-2 rounded-lg transition-colors" style={{ color: mobileSearchOpen ? '#1b4b85' : '#a8b8d8' }}>
              {mobileSearchOpen ? <X size={17} /> : <Search size={17} />}
            </button>
            {mobileSearchOpen && (
              <div className="absolute left-0 right-0 top-14 bg-white border-b shadow-lg z-50 px-3 py-2" style={{ borderColor: '#e8e4de' }} ref={containerRef}>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ color: '#a8b8d8' }} />
                  <input ref={inputRef} type="text" placeholder="Buscar..." value={query}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (query.trim()) setIsOpen(true); }}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ background: '#f8f7f5', borderColor: '#1b4b85', fontFamily: 'Open Sans, sans-serif' }}
                    autoFocus />
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border shadow-lg overflow-hidden z-50"
                      style={{ borderColor: '#e8e4de', maxHeight: 320, overflowY: 'auto' }}>
                      {renderSearchResults()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="relative" ref={containerRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ color: '#a8b8d8' }} />
            <input ref={inputRef} type="text" placeholder="Buscar..." value={query}
              onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => { if (query.trim()) setIsOpen(true); }}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none w-36 lg:w-48"
              style={{ background: '#f8f7f5', borderColor: isOpen ? '#1b4b85' : '#d4cfc8', boxShadow: isOpen ? '0 0 0 3px rgba(27,75,133,0.08)' : 'none', fontFamily: 'Open Sans, sans-serif' }} />
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border shadow-lg overflow-hidden z-50"
                style={{ borderColor: '#e8e4de', maxHeight: 380, overflowY: 'auto' }}>
                {renderSearchResults()}
              </div>
            )}
          </div>
        )}

        <NotificationBell />
        {currentUser && (
          <button
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ background: '#1b4b85', fontFamily: 'Montserrat, sans-serif', border: 'none', cursor: 'pointer', overflow: 'hidden', padding: 0 }}
            title="Mi Perfil"
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : currentUser.name.charAt(0)}
          </button>
        )}
      </div>
    </header>
  );
}
