import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Filter, Download, Activity, Users, Utensils, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#1e3a8a', '#eab308', '#14b8a6', '#f43f5e', '#8b5cf6', '#0ea5e9'];

const AdvancedStats = () => {
    const navigate = useNavigate();
    
    // --- FILTRES ---
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [filters, setFilters] = useState({
        sessions: ['MATIN', 'MIDI', 'SOIR'],
        categories: ['Maternelle', 'Élémentaire'],
        hasPAI: '', // '' = Tous, 'true' = Oui, 'false' = Non
        regimes: [], // Vide = Tous
        minQf: '',
        maxQf: ''
    });

    // --- DONNÉES & UI ---
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'pie'
    const [chartMetric, setChartMetric] = useState('byDay'); // 'byDay', 'bySession', 'byCategory', 'byRegime'

    useEffect(() => {
        loadData();
    }, [startDate, endDate, filters]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await api.post('/stats/advanced', { startDate, endDate, filters });
            setData(res.data);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleArrayFilter = (key, value) => {
        setFilters(prev => {
            const arr = prev[key];
            if (arr.includes(value)) return { ...prev, [key]: arr.filter(v => v !== value) };
            return { ...prev, [key]: [...arr, value] };
        });
    };

    // Formatage des données pour Recharts
    const getChartData = () => {
        if (!data || !data[chartMetric]) return [];
        return data[chartMetric].map(item => ({
            name: chartMetric === 'byDay' ? new Date(item._id).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'}) : (item._id || 'Inconnu'),
            Valeur: item.count
        }));
    };

    const renderChart = () => {
        const chartData = getChartData();
        if (chartData.length === 0) return <div className="flex h-full items-center justify-center text-slate-400 font-bold">Aucune donnée à afficher</div>;

        if (chartType === 'pie') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="Valeur">
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="Valeur" fill="#1e3a8a" radius={[6, 6, 0, 0]} barSize={40}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                ) : (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Line type="monotone" dataKey="Valeur" stroke="#1e3a8a" strokeWidth={4} dot={{r: 6, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        );
    };

    const totalActs = data?.totals[0]?.count || 0;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col">
            <button onClick={() => navigate('/')} className="mb-6 text-slate-400 font-bold hover:text-car-dark transition-colors self-start">← Retour Accueil</button>
            
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-car-dark p-4 rounded-2xl text-white"><Activity size={28}/></div>
                <div>
                    <h1 className="text-3xl font-black text-car-dark uppercase tracking-wider">Business Intelligence</h1>
                    <p className="text-slate-500 font-medium">Statistiques avancées & Tableaux de bord</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">
                
                {/* --- PANNEAU LATÉRAL DES FILTRES --- */}
                <div className="w-full lg:w-80 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 h-fit shrink-0 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Filter size={20} className="text-car-blue"/>
                        <h3 className="font-black text-car-dark">Filtres</h3>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Période</label>
                        <div className="flex gap-2">
                            <input type="date" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <input type="date" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Activités</label>
                        <div className="flex flex-col gap-2">
                            {['MATIN', 'MIDI', 'SOIR'].map(s => (
                                <label key={s} className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 accent-car-blue" checked={filters.sessions.includes(s)} onChange={() => toggleArrayFilter('sessions', s)} />
                                    {s}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Classes</label>
                        <div className="flex gap-2">
                            {['Maternelle', 'Élémentaire'].map(c => (
                                <button key={c} onClick={() => toggleArrayFilter('categories', c)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${filters.categories.includes(c) ? 'bg-car-blue text-white' : 'bg-slate-50 text-slate-500'}`}>
                                    {c === 'Élémentaire' ? 'Élém.' : 'Mat.'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Quotient Familial (€)</label>
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="Min" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.minQf} onChange={e => handleFilterChange('minQf', e.target.value)} />
                            <span className="text-slate-300">-</span>
                            <input type="number" placeholder="Max" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.maxQf} onChange={e => handleFilterChange('maxQf', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Particularités</label>
                        <select className="w-full bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark mb-2" value={filters.hasPAI} onChange={e => handleFilterChange('hasPAI', e.target.value)}>
                            <option value="">Santé : Tous les enfants</option>
                            <option value="true">Uniquement avec PAI</option>
                            <option value="false">Sans PAI</option>
                        </select>
                    </div>
                </div>

                {/* --- ZONE PRINCIPALE DE RESTITUTION --- */}
                <div className="flex-1 flex flex-col gap-6">
                    
                    {/* KPI TOP BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-car-blue text-white p-6 rounded-[2rem] shadow-md relative overflow-hidden">
                            <Activity className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24" />
                            <p className="text-xs font-black tracking-widest uppercase opacity-80 mb-1">Volume Total Actes</p>
                            <p className="text-4xl font-black relative z-10">{isLoading ? '...' : totalActs}</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-1">Période Analysée</p>
                                <p className="text-lg font-black text-car-dark">{new Date(startDate).toLocaleDateString('fr-FR')} - {new Date(endDate).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <Calendar size={32} className="text-slate-200" />
                        </div>
                    </div>

                    {/* ZONE GRAPHIQUE */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[400px]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            
                            {/* Sélecteur de Métrique */}
                            <div className="flex bg-slate-50 p-1 rounded-xl">
                                <button onClick={() => setChartMetric('byDay')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byDay' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Jour</button>
                                <button onClick={() => setChartMetric('bySession')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'bySession' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Activité</button>
                                <button onClick={() => setChartMetric('byCategory')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byCategory' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Classe</button>
                                <button onClick={() => setChartMetric('byRegime')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byRegime' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Régime (Midi)</button>
                            </div>

                            {/* Sélecteur de Type de Graphique */}
                            <div className="flex gap-2">
                                <button onClick={() => setChartType('bar')} className={`p-2 rounded-xl transition-colors ${chartType === 'bar' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><BarChartIcon size={20}/></button>
                                <button onClick={() => setChartType('line')} className={`p-2 rounded-xl transition-colors ${chartType === 'line' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><LineChartIcon size={20}/></button>
                                <button onClick={() => setChartType('pie')} className={`p-2 rounded-xl transition-colors ${chartType === 'pie' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><PieChartIcon size={20}/></button>
                            </div>
                        </div>

                        {/* Le Graphique Recharts */}
                        <div className="flex-1 w-full relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-slate-200 border-t-car-blue rounded-full animate-spin"></div>
                                </div>
                            ) : renderChart()}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdvancedStats;