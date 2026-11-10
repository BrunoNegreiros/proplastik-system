import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { detail?: string };
        throw new Error(errData.detail || 'Credenciais inválidas.');
      }

      const data = (await response.json()) as { access_token: string };
      onLoginSuccess(data.access_token);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao conectar com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-sm w-full shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-proplastik-dark text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-proplastik-yellow" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Acesso Restrito — Lojista</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#5D5656] mb-1">E-mail Administrativo</label>
            <input
              type="email"
              required
              placeholder="admin@proplastik.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 border border-[#D4D2D2] rounded focus:outline-none focus:border-proplastik-main"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5D5656] mb-1">Senha</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-2.5 border border-[#D4D2D2] rounded focus:outline-none focus:border-proplastik-main"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-proplastik-main hover:bg-proplastik-dark text-white font-bold py-2.5 rounded text-xs uppercase tracking-wide transition disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
};