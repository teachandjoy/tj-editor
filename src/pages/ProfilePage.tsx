import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { useState, useRef } from 'react';
import { Camera, Eye, EyeOff, Save } from 'lucide-react';
import type { SalesAccessLevel } from '../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de', text: '#2a2a32' };

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  coordinador: 'Coordinador Acad\u00e9mico',
  editor: 'Editor',
};

export default function ProfilePage() {
  const { currentUser, updateUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  if (!currentUser) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es requerido';
    if (!email.trim()) errs.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email inv\u00e1lido';

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) errs.currentPassword = 'Ingresa tu contrase\u00f1a actual';
      else if (currentPassword !== currentUser.password) errs.currentPassword = 'Contrase\u00f1a actual incorrecta';
      if (!newPassword) errs.newPassword = 'Ingresa la nueva contrase\u00f1a';
      else if (newPassword.length < 6) errs.newPassword = 'M\u00ednimo 6 caracteres';
      if (newPassword !== confirmPassword) errs.confirmPassword = 'Las contrase\u00f1as no coinciden';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSuccessMsg('');

    const updates: Record<string, string | undefined> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      avatar: avatar || undefined,
    };
    if (newPassword) {
      updates.password = newPassword;
    }

    await updateUser(currentUser.id, updates);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg('Cambios guardados correctamente');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid ' + (hasError ? '#c53030' : '#e8e4de'), background: '#fff',
    fontSize: 13, fontFamily: 'Open Sans,sans-serif', color: '#2a2a32',
    outline: 'none', transition: 'border-color .15s',
  });

  return (
    <div className="page-enter">
      <Header title="Mi Perfil" />
      <div className="p-6 max-w-2xl mx-auto">
        {/* Avatar section */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: TJ.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: avatar ? 'transparent' : TJ.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', border: '3px solid ' + TJ.gold,
              }}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 28, color: '#fff' }}>
                    {currentUser.name.charAt(0)}
                  </span>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: TJ.primary, border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}>
                <Camera size={13} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange}
                style={{ display: 'none' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 18, color: TJ.text }}>
                {currentUser.name}
              </h2>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 20,
                background: 'rgba(27,75,133,0.08)', color: TJ.primary,
                fontFamily: 'Montserrat,sans-serif',
              }}>
                {roleLabels[currentUser.role] || currentUser.role}
              </span>
            </div>
          </div>
        </div>

        {/* Personal info section */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: TJ.border }}>
          <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 15, color: TJ.text, marginBottom: 16 }}>
            {'Informaci\u00f3n Personal'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle(!!errors.name)} placeholder="Tu nombre" />
              {errors.name && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{errors.name}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle(!!errors.email)} placeholder="tu@email.com" />
              {errors.email && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{errors.email}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>{'Tel\u00e9fono'}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle(false)} placeholder="+52 555 123 4567" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Rol</label>
              <input value={roleLabels[currentUser.role] || currentUser.role} disabled
                style={{ ...inputStyle(false), background: '#f8f7f5', color: '#a8b8d8', cursor: 'not-allowed' }} />
            </div>
          </div>
        </div>

        {/* Change password section */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: TJ.border }}>
          <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 15, color: TJ.text, marginBottom: 16 }}>
            {'Cambiar Contrase\u00f1a'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                {'Contrase\u00f1a actual'}
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPasswords ? 'text' : 'password'} value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ ...inputStyle(!!errors.currentPassword), paddingRight: 40 }}
                  placeholder={'Ingresa tu contrase\u00f1a actual'} />
                <button type="button" onClick={() => setShowPasswords(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a8b8d8', padding: 2 }}>
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.currentPassword && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{errors.currentPassword}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                  {'Nueva contrase\u00f1a'}
                </label>
                <input type={showPasswords ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={inputStyle(!!errors.newPassword)}
                  placeholder={'M\u00ednimo 6 caracteres'} />
                {errors.newPassword && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{errors.newPassword}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>
                  {'Confirmar contrase\u00f1a'}
                </label>
                <input type={showPasswords ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={inputStyle(!!errors.confirmPassword)}
                  placeholder={'Repite la nueva contrase\u00f1a'} />
                {errors.confirmPassword && <p style={{ fontSize: 11, color: '#c53030', marginTop: 3 }}>{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Sales access read-only section (Correction 13) */}
        {currentUser.salesAccess?.enabled && (() => {
          const sa = currentUser.salesAccess;
          const levelLabels: Record<SalesAccessLevel, string> = {
            solo_lectura: 'Solo lectura',
            lectura_escritura: 'Lectura y escritura',
            admin_ventas: 'Administrador de ventas',
          };
          return (
            <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: TJ.border }}>
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 15, color: TJ.text, marginBottom: 16 }}>
                Acceso de Ventas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Nivel de acceso</label>
                  <input value={levelLabels[sa.level]} disabled
                    style={{ ...inputStyle(false), background: '#f8f7f5', color: '#a8b8d8', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 4, fontFamily: 'Montserrat,sans-serif' }}>Limite de descuento</label>
                  <input value={`${sa.discountLimit}%`} disabled
                    style={{ ...inputStyle(false), background: '#f8f7f5', color: '#a8b8d8', cursor: 'not-allowed' }} />
                </div>
              </div>
              {sa.regions.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TJ.text, marginBottom: 6, fontFamily: 'Montserrat,sans-serif' }}>Regiones asignadas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sa.regions.map(r => (
                      <span key={r} style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: 'rgba(27,75,133,0.08)', color: TJ.primary, fontFamily: 'Montserrat,sans-serif',
                      }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Success message */}
        {successMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(39,103,73,0.08)', color: '#276749',
            fontSize: 13, fontFamily: 'Open Sans,sans-serif',
            border: '1px solid rgba(39,103,73,0.15)',
          }}>
            {successMsg}
          </div>
        )}

        {/* Save button */}
        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
          borderRadius: 10, border: 'none', background: TJ.primary, color: '#fff',
          fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
        onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
          <Save size={16} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
