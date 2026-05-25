import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Workflow, 
  LayoutDashboard, 
  GitFork, 
  LogOut, 
  User,
  Settings
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ];

  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Top Section */}
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-dark-border">
          <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-brand-primary" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white font-sans">AutoFlow</span>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-primary/10 border border-brand-primary/30 text-white shadow-glow-primary' 
                    : 'text-dark-muted hover:bg-dark-input hover:text-white border border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-4 border-t border-dark-border">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-9 h-9 bg-brand-primary/20 border border-brand-primary/40 rounded-full flex items-center justify-center text-white font-semibold">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-none mb-1">Usuário</p>
              <p className="text-xs text-dark-muted truncate leading-none">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-brand-error/80 hover:bg-brand-error/10 hover:text-brand-error transition-all duration-200 border border-transparent"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
