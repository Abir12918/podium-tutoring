import { Outlet, NavLink } from 'react-router-dom';
import { Home, UserPlus, Users, CalendarCheck, LogOut, CreditCard, Target, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/firebaseConfig';

const SidebarLink = ({ to, icon: Icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-ring ${
        isActive
          ? 'bg-white text-brand-blue shadow-podium-soft ring-1 ring-brand-blue/15'
          : 'text-slate-600 hover:bg-white/70 hover:text-brand-blue hover:shadow-sm'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 ${
            isActive
              ? 'bg-brand-blue text-white shadow-sm'
              : 'bg-white/55 text-slate-500 ring-1 ring-brand-blue/10 group-hover:bg-brand-blue/10 group-hover:text-brand-blue'
          }`}
        >
          <Icon size={19} strokeWidth={2.25} />
        </span>
        <span className="flex-1">{children}</span>
        {isActive && (
          <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
        )}
      </>
    )}
  </NavLink>
);

const Layout = () => {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="app-shell h-screen overflow-hidden text-brand-ink">
      <div className="flex h-full gap-5 p-4 lg:p-6">
        {/* Sidebar */}
        <aside className="glass-card flex w-72 shrink-0 flex-col overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
          <div className="px-5 pb-5 pt-6">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/55 p-4 shadow-sm">
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-brand-blue">
                <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-brand-yellow text-2xl font-black text-brand-blue shadow-sm ring-1 ring-brand-blue/10">
                  P
                </span>
                <span className="leading-none">
                  Podium
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Tutoring
                  </span>
                </span>
              </h1>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4">
            <SidebarLink to="/" icon={Home}>Home</SidebarLink>
            <SidebarLink to="/add-student" icon={UserPlus}>Add Student</SidebarLink>
            <SidebarLink to="/students" icon={Users}>Students</SidebarLink>
            <SidebarLink to="/attendance" icon={CalendarCheck}>Attendance</SidebarLink>
            <SidebarLink to="/tuition" icon={CreditCard}>Tuition</SidebarLink>
            <SidebarLink to="/goals" icon={Target}>Goals</SidebarLink>
            <SidebarLink to="/leads" icon={ClipboardList}>Leads</SidebarLink>
          </nav>

          <div className="m-4 rounded-3xl border border-brand-blue/10 bg-white/55 p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-brand-cream/70 px-3 py-3 ring-1 ring-white/70">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green/10 text-base font-black text-brand-green ring-1 ring-brand-green/15">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {currentUser?.displayName || 'Teacher'}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {currentUser?.email || 'Podium team'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-red/10 bg-white/70 px-4 py-3 text-sm font-bold text-brand-red shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-red/10 hover:shadow-podium-soft"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="relative min-w-0 flex-1 overflow-y-auto rounded-4xl border border-white/45 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] backdrop-blur-[2px]">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6 md:px-8 lg:px-10 lg:py-9">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
