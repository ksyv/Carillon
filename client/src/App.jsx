import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogOut, Sun, Moon, FileText, CheckCircle, Search, Trash2, Plus, Users } from 'lucide-react';

// --- CONFIG ---
const API_URL = '/api'; // Proxy Vite

// Intercepteur Token
axios.interceptors.request.use(req => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// --- COMPOSANTS ---

// 1. LOGIN
const Login = ({ setAuth }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/login`, creds);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setAuth({ token: data.token, role: data.role });
    } catch (err) { setError('Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">Carillon 🔔</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Identifiant" className="w-full p-3 border rounded-lg" 
            value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} />
          <input type="password" placeholder="Mot de passe" className="w-full p-3 border rounded-lg" 
            value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-bold hover:bg-teal-700 transition">
            Connexion
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. DASHBOARD
const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  
  const getSuggestedSlot = () => {
    const hour = new Date().getHours();
    return hour < 13 ? 'MATIN' : 'SOIR';
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-light pb-20">
      <header className="bg-primary text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold">Carillon</h1>
        <button onClick={handleLogout}><LogOut size={20} /></button>
      </header>
      
      <main className="p-4 space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center">
          <h2 className="text-gray-500 uppercase text-xs tracking-wider mb-2">Aujourd'hui, {format(new Date(), 'dd MMMM', { locale: fr })}</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button onClick={() => navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/MATIN`)} 
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${getSuggestedSlot() === 'MATIN' ? 'border-secondary bg-yellow-50' : 'border-gray-100'}`}>
              <Sun className="text-orange-500 mb-2" />
              <span className="font-bold text-dark">Matin</span>
            </button>
            <button onClick={() => navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/SOIR`)} 
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${getSuggestedSlot() === 'SOIR' ? 'border-blue-400 bg-blue-50' : 'border-gray-100'}`}>
              <Moon className="text-blue-600 mb-2" />
              <span className="font-bold text-dark">Soir</span>
            </button>
          </div>
        </div>

        {role === 'admin' && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={18}/> Administration</h3>
            <button onClick={() => navigate('/report')} className="w-full bg-gray-100 p-3 rounded-lg text-left mb-2 flex items-center gap-2">
                📊 Rapports Journaliers
            </button>
            <button onClick={() => navigate('/admin/children')} className="w-full bg-gray-100 p-3 rounded-lg text-left flex items-center gap-2">
                <Users size={18}/> Gérer les enfants (Ajout/Suppr)
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

// 3. GESTION DES ENFANTS (NOUVEAU !)
const ChildrenManager = () => {
    const [children, setChildren] = useState([]);
    const [newChild, setNewChild] = useState({ firstName: '', lastName: '' });
    const navigate = useNavigate();

    useEffect(() => { loadChildren(); }, []);

    const loadChildren = async () => {
        const { data } = await axios.get(`${API_URL}/children`);
        setChildren(data);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if(!newChild.lastName || !newChild.firstName) return;
        try {
            await axios.post(`${API_URL}/children`, newChild);
            setNewChild({ firstName: '', lastName: '' });
            loadChildren(); // Recharge la liste
        } catch (e) { alert('Erreur ajout'); }
    };

    // Note: Pour l'instant on fait un "Soft Delete" via l'update si on voulait, 
    // mais ici on ne met pas de bouton supprimer pour éviter les accidents en prod.
    // Ajoutons juste l'ajout pour le MVP.

    return (
        <div className="min-h-screen bg-light p-4">
            <button onClick={() => navigate('/')} className="mb-4 text-gray-500">← Retour Accueil</button>
            <h1 className="text-2xl font-bold mb-6">Gestion des Enfants ({children.length})</h1>

            {/* Formulaire Ajout */}
            <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-2">
                <input 
                    className="border p-2 rounded w-1/2" 
                    placeholder="Nom" 
                    value={newChild.lastName}
                    onChange={e => setNewChild({...newChild, lastName: e.target.value.toUpperCase()})}
                />
                <input 
                    className="border p-2 rounded w-1/2" 
                    placeholder="Prénom" 
                    value={newChild.firstName}
                    onChange={e => setNewChild({...newChild, firstName: e.target.value})}
                />
                <button type="submit" className="bg-primary text-white p-2 rounded shadow">
                    <Plus />
                </button>
            </form>

            {/* Liste */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {children.map(child => (
                    <div key={child._id} className="p-4 border-b flex justify-between items-center">
                        <span className="font-bold text-dark">{child.lastName} {child.firstName}</span>
                        <span className="text-xs text-gray-400">Actif</span>
                    </div>
                ))}
                {children.length === 0 && <div className="p-4 text-center text-gray-400">Aucun enfant. Ajoutez-en un !</div>}
            </div>
        </div>
    );
};

// 4. SESSION / LISTE DE PRÉSENCE
const SessionView = () => {
    const { date, type } = useParams();
    const [children, setChildren] = useState([]); 
    const [attendance, setAttendance] = useState([]); 
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadData(); }, [date, type]);

    const loadData = async () => {
        try {
            const [kidsRes, attRes] = await Promise.all([
                axios.get(`${API_URL}/children`),
                axios.get(`${API_URL}/attendance?date=${date}&sessionType=${type}`)
            ]);
            setChildren(kidsRes.data);
            setAttendance(attRes.data);
            setLoading(false);
        } catch (e) { console.error(e); setLoading(false); }
    };

    const presentIds = useMemo(() => attendance.map(a => a.child._id), [attendance]);
    
    const filteredChildren = useMemo(() => {
        if (search.length < 2) return [];
        const lowerSearch = search.toLowerCase();
        return children.filter(c => 
            !presentIds.includes(c._id) && 
            (c.lastName.toLowerCase().includes(lowerSearch) || c.firstName.toLowerCase().includes(lowerSearch))
        );
    }, [children, search, presentIds]);

    const sortedAttendance = useMemo(() => {
        return [...attendance].sort((a, b) => {
            if (a.checkOut && !b.checkOut) return 1;
            if (!a.checkOut && b.checkOut) return -1;
            return a.child.lastName.localeCompare(b.child.lastName);
        });
    }, [attendance]);

    const activeCount = attendance.filter(a => !a.checkOut).length;

    const handleCheckIn = async (childId) => {
        try {
            const { data } = await axios.post(`${API_URL}/attendance/checkin`, { childId, date, sessionType: type });
            setAttendance([data, ...attendance]);
            setSearch('');
        } catch (e) { alert('Erreur ajout'); }
    };

    const handleCheckOut = async (attendanceId) => {
        try {
            const { data } = await axios.put(`${API_URL}/attendance/checkout/${attendanceId}`);
            setAttendance(attendance.map(a => a._id === attendanceId ? data : a));
        } catch (e) { alert('Erreur départ'); }
    };

    if (loading) return <div className="p-10 text-center">Chargement...</div>;

    return (
        <div className="h-screen flex flex-col bg-light">
            <div className="bg-white shadow-md z-20">
                <div className="p-4 flex justify-between items-center border-b">
                    <button onClick={() => navigate('/')} className="text-gray-500">← Retour</button>
                    <h2 className="font-bold text-lg">{type === 'MATIN' ? 'Matin' : 'Soir'} - {activeCount} Présents</h2>
                </div>
                <div className="p-4 bg-primary">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                        <input 
                            type="text" 
                            className="w-full pl-10 p-3 rounded-lg shadow-inner outline-none"
                            placeholder="Ajouter un enfant..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {search.length >= 2 && (
                <div className="bg-white border-b shadow-lg max-h-60 overflow-y-auto absolute w-full top-36 z-30">
                    {filteredChildren.map(child => (
                        <div key={child._id} onClick={() => handleCheckIn(child._id)}
                             className="p-4 border-b flex justify-between items-center hover:bg-green-50 active:bg-green-100 cursor-pointer">
                            <span className="font-bold text-dark">{child.lastName} {child.firstName}</span>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">+ Ajouter</span>
                        </div>
                    ))}
                    {filteredChildren.length === 0 && <div className="p-4 text-center text-gray-500">Aucun enfant trouvé</div>}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedAttendance.map(record => {
                    const isGone = !!record.checkOut;
                    return (
                        <div key={record._id} className={`p-4 rounded-xl flex justify-between items-center shadow-sm border-l-4 transition-all 
                            ${isGone ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-white border-primary'}`}>
                            <div>
                                <div className={`font-bold ${isGone ? 'text-gray-500 line-through' : 'text-dark'}`}>
                                    {record.child.lastName} {record.child.firstName}
                                </div>
                                {isGone && <div className="text-xs text-gray-500">Parti à {format(new Date(record.checkOut), 'HH:mm')}</div>}
                                {record.isLate && <span className="text-xs text-red-500 font-bold">⚠️ Supplément</span>}
                            </div>
                            {type === 'SOIR' && !isGone && (
                                <button onClick={() => handleCheckOut(record._id)}
                                    className="bg-secondary text-white px-4 py-2 rounded-lg font-bold shadow-md active:scale-95 transition">
                                    DÉPART
                                </button>
                            )}
                            {(type === 'MATIN' || isGone) && <CheckCircle size={24} className="text-gray-300" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// 5. RAPPORT (Admin)
const Report = () => {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${API_URL}/report?date=${date}`).then(res => setData(res.data));
    }, [date]);

    return (
        <div className="min-h-screen bg-white p-4">
             <button onClick={() => navigate('/')} className="mb-4 text-gray-500">← Retour</button>
             <div className="flex justify-between items-center mb-6 no-print">
                 <h1 className="text-2xl font-bold">Rapport</h1>
                 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded" />
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead>
                         <tr className="bg-gray-100 border-b-2 border-gray-300">
                             <th className="p-3">Enfant</th>
                             <th className="p-3 text-center">Matin</th>
                             <th className="p-3 text-center">Soir</th>
                             <th className="p-3 text-center text-red-600">Supp.</th>
                         </tr>
                     </thead>
                     <tbody>
                         {data.map((row, i) => (
                             <tr key={i} className="border-b hover:bg-gray-50">
                                 <td className="p-3 font-medium">{row.child.lastName} {row.child.firstName}</td>
                                 <td className="p-3 text-center">{row.matin ? '✅' : '-'}</td>
                                 <td className="p-3 text-center">{row.soir ? '✅' : '-'}</td>
                                 <td className="p-3 text-center font-bold text-red-600">{row.supplement ? 'OUI' : '-'}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
             <style>{`@media print { .no-print { display: none; } }`}</style>
        </div>
    );
};

// --- ROUTER ---
function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), role: localStorage.getItem('role') });

  if (!auth.token) return <Login setAuth={setAuth} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:date/:type" element={<SessionView />} />
        <Route path="/report" element={<Report />} />
        <Route path="/admin/children" element={<ChildrenManager />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;