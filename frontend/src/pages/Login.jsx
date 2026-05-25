import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { KeyRound, Mail, AlertTriangle, Workflow, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingForm(true);

    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
      setLoadingForm(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-dark-card border border-dark-border p-8 rounded-2xl shadow-glass relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-xl flex items-center justify-center mb-3">
            <Workflow className="w-6 h-6 text-brand-primary" />
          </div>
          <h2 className="text-3xl font-extrabold font-sans tracking-tight text-white">AutoFlow</h2>
          <p className="text-sm text-dark-muted mt-1">Conecte seus apps e automatize processos</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-brand-error/10 border border-brand-error/30 text-brand-error p-3 rounded-lg text-sm mb-6"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-muted">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="w-full bg-dark-input border border-dark-border rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-muted">
                <KeyRound className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-input border border-dark-border rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingForm}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow-primary"
          >
            {loadingForm ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar na Conta</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-dark-muted">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-brand-primary hover:underline font-medium">
            Cadastre-se gratuitamente
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
