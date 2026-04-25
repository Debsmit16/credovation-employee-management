import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'EMPLOYEE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (isLogin) {
        res = await authService.login(form.email, form.password);
      } else {
        res = await authService.register({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
        });
      }
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative floating shapes */}
      <div style={{
        position: 'absolute', top: '15%', left: '8%', width: 120, height: 120,
        borderRadius: '50%', border: '1px solid rgba(13,148,136,0.1)',
        animation: 'float-slow 12s ease-in-out infinite', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '12%', width: 80, height: 80,
        borderRadius: '50%', border: '1px solid rgba(8,145,178,0.08)',
        animation: 'float-slow 10s ease-in-out infinite reverse', zIndex: 0
      }} />

      <div className="login-card animate-slide-up">
        <div className="brand">
          <div className="logo-icon">C</div>
          <h1>Credovation</h1>
          <p>Employee Management System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="login-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required={!isLogin}
              />
            </div>
          )}

          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@credovation.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="login-field">
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR_ADMIN">HR Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite', display: 'inline-block'
                }} />
                Please wait...
              </span>
            ) : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-primary)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Credovation Technologies
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
