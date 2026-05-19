import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/context';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Error al iniciar sesion');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#fff' }}>
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-10"
        style={{ background: '#162340' }}>
        <div>
          <img
            src="https://repositorio.paincare.mx/public/Logo_TeachJ_Blanco_2.png"
            alt="Teach & Joy"
            style={{ height: 44, objectFit: 'contain', marginBottom: 40 }}
            onError={e => {
              const img = e.currentTarget;
              img.style.display = 'none';
              const fb = img.nextElementSibling as HTMLElement;
              if (fb) fb.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, background: '#c5aa6f', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 14, color: '#1b4b85' }}>T&J</span>
            </div>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 20, color: '#fff' }}>Teach &amp; Joy</span>
          </div>
          <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 26, color: '#fff', lineHeight: 1.25, marginBottom: 16 }}>
            Estudio de Contenido Acad&#233;mico
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(168,184,216,0.75)', lineHeight: 1.65 }}>
            Plataforma de autor&#237;a y gesti&#243;n de contenido para diplomados y cursos m&#233;dicos de alto nivel acad&#233;mico.
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(168,184,216,0.4)' }}>
          &#169; {new Date().getFullYear()} Teach &amp; Joy &#183; Todos los derechos reservados
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <img src="https://repositorio.paincare.mx/public/Logo_TeachJ_PNG.png" alt="Teach & Joy"
              style={{ height: 56, objectFit: 'contain' }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <p className="text-xs text-center" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
              Estudio de Contenido Acad&eacute;mico
            </p>
          </div>

          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 22, color: '#162340', marginBottom: 6 }}>
            Bienvenido
          </h1>
          <p style={{ fontSize: 13, color: '#a8b8d8', marginBottom: 28 }}>
            Ingresa tus credenciales para acceder al sistema
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2a2a32', marginBottom: 6, fontFamily: 'Montserrat,sans-serif' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '2px solid #e8e4de', background: '#fff',
                  fontSize: 14, fontFamily: 'Open Sans,sans-serif', color: '#2a2a32',
                  outline: 'none', transition: 'border-color .15s, box-shadow .15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1b4b85'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,75,133,0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e8e4de'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2a2a32', marginBottom: 6, fontFamily: 'Montserrat,sans-serif' }}>
                {'Contrase\u00f1a'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={'Ingresa tu contrase\u00f1a'}
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10,
                    border: '2px solid #e8e4de', background: '#fff',
                    fontSize: 14, fontFamily: 'Open Sans,sans-serif', color: '#2a2a32',
                    outline: 'none', transition: 'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1b4b85'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,75,133,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e8e4de'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#a8b8d8', padding: 2,
                  }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(139,47,58,0.08)', color: '#8b2f3a',
                fontSize: 13, fontFamily: 'Open Sans,sans-serif',
                border: '1px solid rgba(139,47,58,0.15)',
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={!username.trim() || !password.trim() || loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: username.trim() && password.trim() && !loading ? '#1b4b85' : '#d4cfc8',
                color: '#fff', cursor: username.trim() && password.trim() && !loading ? 'pointer' : 'not-allowed',
                fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 700,
                transition: 'background .18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
              onMouseEnter={e => { if (username.trim() && password.trim() && !loading) e.currentTarget.style.background = '#8b2f3a'; }}
              onMouseLeave={e => { if (username.trim() && password.trim() && !loading) e.currentTarget.style.background = '#1b4b85'; }}>
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: 'spin .75s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Ingresando...
                </>
              ) : 'Ingresar al sistema'}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
