
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LayoutDashboard, Briefcase, FileSearch, Settings, PieChart, Clock, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "لوحة التحكم" },
    { to: "/jobs", icon: Briefcase, label: "إدارة الوظائف" },
    { to: "/cv-analyzer", icon: FileSearch, label: "تحليل المرشحين" },
    { to: "/attendance", icon: Clock, label: "الحضور والانصراف" },
    { to: "/operations", icon: PieChart, label: "العمليات والتقارير" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl fixed right-0 top-0 z-50 h-full">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          نادر للموارد البشرية
        </h1>
        <p className="text-xs text-slate-400 mt-1">Nader Smart HR</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors px-4 py-2 w-full">
          <Settings className="w-5 h-5" />
          <span>الإعدادات</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors px-4 py-2 w-full rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
