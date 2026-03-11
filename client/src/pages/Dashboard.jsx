import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogOut, Sun, Moon, FileText, Users, Shield, CalendarDays, Banknote, Utensils, FolderHeart, Lock } from 'lucide-react';
import LogoTexte from '../components/LogoTexte';

const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const access = localStorage.getItem('categoryAccess') || 'Tous';
  
  const getSessionStatus = (session) => {
      if (role === 'admin') return { locked: false, text: 'Admin' };
      const now = new Date();
      const time = now.getHours() * 60 + now.getMinutes();

      if (session === 'MATIN') {
          if (time >= 435 && time <= 525) return { locked: false };
          return { locked: true, text: '7h15 - 8h45' };
      }
      if (session === 'MIDI') {
          if (time >= 705 && time <= 845) return { locked: false };
          return { locked: true, text: '11h45 - 14h05' };
      }
      if (session === 'SOIR') {
          if (time >= 975 && time <= 1155) return { locked: false };
          return { locked: true, text: '16h15 - 19h15' };
      }
      return { locked: true, text: 'Fermé' };
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  const SessionButton = ({ title, icon: Icon, type, colorClass }) => {
      const status = getSessionStatus(type);
      return (
          <button onClick={() => !status.locked && navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/${type}`)} disabled={status.locked}
              className={`group relative p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all bg-white ${status.locked ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : `border-${colorClass} hover:shadow-2xl hover:-translate-y-1 shadow-lg shadow-${colorClass}/10`}`}>
              {!status.locked && <div className={`absolute top-4 right-4 w-3 h-3 rounded-full bg-${colorClass} opacity-50 group-hover:animate-ping`}></div>}
              {status.locked && <div className="absolute top-4 right-4 text-slate-400"><Lock size={20}/></div>}
              <div className={`p-5 rounded-3xl mb-4 ${status.locked ? 'bg-slate-200 text-slate-400' : `bg-${colorClass}/10 text-${colorClass} group-hover:scale-110`} transition-transform`}><Icon strokeWidth={2.5} size={40} /></div>
              <span className={`font-black text-xl uppercase tracking-wider ${status.locked ? 'text-slate-400' : 'text-car-dark'}`}>{title}</span>
              {status.locked && <span className="text-xs font-bold text-slate-400 mt-2 bg-slate-200 px-3 py-1 rounded-lg">{status.text}</span>}
          </button>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <LogoTexte className="text-2xl" />
        <div className="flex items-center gap-4">
            {access !== 'Tous' && <span className="text-xs font-black text-car-teal bg-car-teal/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{access}</span>}
            <span className="text-xs font-black text-car-purple bg-car-purple/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{role}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-car-pink transition-colors p-2"><LogOut size={22} /></button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-10 mt-4">
        <section>
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-teal"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Pointage en cours</h2>
                <span className="ml-auto text-sm font-bold text-car-dark">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <SessionButton title="Matin" icon={Sun} type="MATIN" colorClass="car-yellow" />
                <SessionButton title="Midi (Cantine)" icon={Utensils} type="MIDI" colorClass="car-teal" />
                <SessionButton title="Soir" icon={Moon} type="SOIR" colorClass="car-blue" />
            </div>
        </section>

        {(role === 'admin' || role === 'responsable') && (
          <section className="pt-6 border-t border-slate-200 border-dashed">
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Administration</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button onClick={() => navigate('/admin/children')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-green/10 p-4 rounded-2xl w-fit group-hover:bg-car-green group-hover:text-white text-car-green transition-colors"><Users size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Enfants & Fiches</h3><p className="text-xs text-slate-500 font-medium mt-1">Base de données, PAI...</p></div>
                </button>
                {role === 'admin' && (
                    <>
                        <button onClick={() => navigate('/admin/families')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group relative overflow-hidden">
                            <div className="bg-car-yellow/10 p-4 rounded-2xl w-fit group-hover:bg-car-yellow group-hover:text-white text-car-yellow transition-colors"><FolderHeart size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Dossiers Familles</h3><p className="text-xs text-slate-500 font-medium mt-1">Rattachement & CAF</p></div>
                        </button>
                        <button onClick={() => navigate('/report')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-teal/10 p-4 rounded-2xl w-fit group-hover:bg-car-teal group-hover:text-white text-car-teal transition-colors"><FileText size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Rapports & Listes</h3><p className="text-xs text-slate-500 font-medium mt-1">Historique & PDF</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/users')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-purple/10 p-4 rounded-2xl w-fit group-hover:bg-car-purple group-hover:text-white text-car-purple transition-colors"><Shield size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Équipe</h3><p className="text-xs text-slate-500 font-medium mt-1">Accès & Rôles</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/planned-notes')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-pink/10 p-4 rounded-2xl w-fit group-hover:bg-car-pink group-hover:text-white text-car-pink transition-colors"><CalendarDays size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Notes plannifiées</h3><p className="text-xs text-slate-500 font-medium mt-1">& notes récurrentes</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/billing')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-blue/10 p-4 rounded-2xl w-fit group-hover:bg-car-blue group-hover:text-white text-car-blue transition-colors"><Banknote size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Facturation</h3><p className="text-xs text-slate-500 font-medium mt-1">Payeurs séparés</p></div>
                        </button>
                    </>
                )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;