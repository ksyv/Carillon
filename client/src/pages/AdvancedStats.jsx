import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Filter, Download, Activity, Users, Utensils, Calendar, Table, LayoutDashboard, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#1e3a8a', '#eab308', '#14b8a6', '#f43f5e', '#8b5cf6', '#0ea5e9'];

const AdvancedStats = () => {
    const navigate = useNavigate();
    
    // --- FILTRES ÉTENDUS ---
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [filters, setFilters] = useState({
        sessions: ['MATIN', 'MIDI', 'SOIR'],
        categories: ['Maternelle', 'Élémentaire'],
        hasPAI: '', 
        regimes: [], 
        minQf: '',
        maxQf: '',
        minAge: '',
        maxAge: '',
        droitImage: '',
        autorisationSortieSeul: '',
        lunettes: ''
    });

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [viewMode, setViewMode] = useState('chart'); 
    const [chartType, setChartType] = useState('bar'); 
    const [chartMetric, setChartMetric] = useState('byDay'); 

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

    // Fonction utilitaire pour calculer l'âge au moment de la session
    const calculateAge = (birthDateStr, sessionDateStr) => {
        if (!birthDateStr) return 'N/A';
        const birthDate = new Date(birthDateStr);
        const sessionDate = new Date(sessionDateStr);
        let age = sessionDate.getFullYear() - birthDate.getFullYear();
        const m = sessionDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && sessionDate.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // --- EXPORT CSV ULTRA COMPLET ---
    const exportCSV = () => {
        if (!data || !data.rawDetails || data.rawDetails.length === 0) return alert("Aucune donnée à exporter.");
        
        const headers = [
            "Date de Présence", "Activité", "Enfant", "Âge (révolu)", "Classe", "Dossier Famille", 
            "Quotient Familial", "Régime Alimentaire", "A un PAI", "Droit à l'image", 
            "Autorisation Sortie Seul", "Porte des lunettes"
        ];
        
        const rows = data.rawDetails.map(row => [
            new Date(row.date).toLocaleDateString('fr-FR'),
            row.sessionType,
            `${row.lastName} ${row.firstName}`,
            calculateAge(row.birthDate, row.date),
            row.category || 'N/A',
            row.familyName || 'Sans dossier',
            row.qf || 0,
            row.regimeAlimentaire || 'Standard',
            row.hasPAI ? 'OUI' : 'NON',
            row.droitImage ? 'OUI' : 'NON',
            row.autorisationSortieSeul ? 'OUI' : 'NON',
            row.medical?.lunettes ? 'OUI' : 'NON'
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Export_Complet_Carillon_${startDate}_au_${endDate}.csv`;
        link.click();
    };

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
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col pb-20">
            <button onClick={() => navigate('/')} className="mb-6 text-slate-400 font-bold hover:text-car-dark transition-colors self-start">← Retour Accueil</button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 w-full">
                <div className="flex items-center gap-4">
                    <div className="bg-car-dark p-4 rounded-2xl text-white"><Activity size={28}/></div>
                    <div>
                        <h1 className="text-3xl font-black text-car-dark uppercase tracking-wider">Business Intelligence</h1>
                        <p className="text-slate-500 font-medium">Extractions de données sur-mesure</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setViewMode('chart')} className={`px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'chart' ? 'bg-white shadow-sm text-car-blue' : 'text-slate-400'}`}>
                        <LayoutDashboard size={18}/> Graphiques
                    </button>
                    <button onClick={() => setViewMode('table')} className={`px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-white shadow-sm text-car-green' : 'text-slate-400'}`}>
                        <Table size={18}/> Tableur
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 h-[800px]">
                
                {/* --- PANNEAU LATÉRAL DES FILTRES (SCROLLABLE) --- */}
                <div className="w-full lg:w-80 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 h-full overflow-y-auto shrink-0 space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-car-blue"/>
                            <h3 className="font-black text-car-dark">Filtres</h3>
                        </div>
                        {isLoading && <div className="w-4 h-4 border-2 border-slate-200 border-t-car-blue rounded-full animate-spin"></div>}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Période Analysée</label>
                        <div className="flex gap-2">
                            <input type="date" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <input type="date" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Activités Péri & Extra</label>
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Niveau / Classes</label>
                        <div className="flex gap-2">
                            {['Maternelle', 'Élémentaire'].map(c => (
                                <button key={c} onClick={() => toggleArrayFilter('categories', c)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${filters.categories.includes(c) ? 'bg-car-blue text-white' : 'bg-slate-50 text-slate-500'}`}>
                                    {c === 'Élémentaire' ? 'Élém.' : 'Mat.'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Âge de l'enfant</label>
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="Min" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.minAge} onChange={e => handleFilterChange('minAge', e.target.value)} />
                            <span className="text-slate-300">à</span>
                            <input type="number" placeholder="Max ans" className="w-1/2 bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.maxAge} onChange={e => handleFilterChange('maxAge', e.target.value)} />
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Régime Alimentaire</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Standard', 'Sans-porc', 'Végétarien', 'PAI'].map(r => (
                                <button key={r} onClick={() => toggleArrayFilter('regimes', r)} className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-colors ${filters.regimes.includes(r) ? 'bg-car-blue text-white' : 'bg-slate-50 text-slate-500'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Affinage Avancé</label>
                        <div className="space-y-3">
                            <select className="w-full bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.hasPAI} onChange={e => handleFilterChange('hasPAI', e.target.value)}>
                                <option value="">PAI : Indifférent</option>
                                <option value="true">Uniquement avec PAI</option>
                                <option value="false">Sans PAI</option>
                            </select>
                            
                            <select className="w-full bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.droitImage} onChange={e => handleFilterChange('droitImage', e.target.value)}>
                                <option value="">Droit Image : Indifférent</option>
                                <option value="true">Autorisé (OUI)</option>
                                <option value="false">Refusé (NON)</option>
                            </select>
                            
                            <select className="w-full bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.autorisationSortieSeul} onChange={e => handleFilterChange('autorisationSortieSeul', e.target.value)}>
                                <option value="">Sortie Seul : Indifférent</option>
                                <option value="true">Autorisé (OUI)</option>
                                <option value="false">Non Autorisé (NON)</option>
                            </select>
                            
                            <select className="w-full bg-slate-50 p-2.5 rounded-xl outline-none text-xs font-bold text-car-dark" value={filters.lunettes} onChange={e => handleFilterChange('lunettes', e.target.value)}>
                                <option value="">Lunettes : Indifférent</option>
                                <option value="true">Porte des lunettes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- ZONE PRINCIPALE DE RESTITUTION --- */}
                <div className="flex-1 flex flex-col gap-6 w-full h-full">
                    
                    {/* KPI TOP BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                        <div className="bg-car-dark text-white p-6 rounded-[2rem] shadow-md relative overflow-hidden flex flex-col justify-center">
                            <Activity className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24" />
                            <p className="text-xs font-black tracking-widest uppercase opacity-80 mb-1">Actes sur la sélection</p>
                            <p className="text-4xl font-black relative z-10">{isLoading ? '...' : totalActs}</p>
                        </div>
                        {viewMode === 'table' && (
                            <button onClick={exportCSV} className="sm:col-span-2 bg-car-green text-white p-6 rounded-[2rem] shadow-lg shadow-car-green/20 hover:bg-green-600 transition-all flex items-center justify-center gap-4 group">
                                <FileSpreadsheet size={32} className="group-hover:scale-110 transition-transform" />
                                <div className="text-left">
                                    <h3 className="font-black text-xl uppercase tracking-widest">Exporter la sélection</h3>
                                    <p className="text-xs font-bold opacity-80">Télécharger {totalActs} lignes de détail en CSV (Excel)</p>
                                </div>
                            </button>
                        )}
                        {viewMode === 'chart' && (
                            <div className="sm:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-1">Période Analysée</p>
                                    <p className="text-xl font-black text-car-dark">{new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <Calendar size={40} className="text-slate-100" />
                            </div>
                        )}
                    </div>

                    {/* VUE GRAPHIQUE */}
                    {viewMode === 'chart' && (
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                                <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl">
                                    <button onClick={() => setChartMetric('byDay')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byDay' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Jour</button>
                                    <button onClick={() => setChartMetric('bySession')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'bySession' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Activité</button>
                                    <button onClick={() => setChartMetric('byCategory')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byCategory' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Par Classe</button>
                                    <button onClick={() => setChartMetric('byRegime')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartMetric === 'byRegime' ? 'bg-white shadow-sm text-car-dark' : 'text-slate-400'}`}>Régime (Midi)</button>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => setChartType('bar')} className={`p-2 rounded-xl transition-colors ${chartType === 'bar' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><BarChartIcon size={20}/></button>
                                    <button onClick={() => setChartType('line')} className={`p-2 rounded-xl transition-colors ${chartType === 'line' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><LineChartIcon size={20}/></button>
                                    <button onClick={() => setChartType('pie')} className={`p-2 rounded-xl transition-colors ${chartType === 'pie' ? 'bg-car-blue/10 text-car-blue' : 'text-slate-400 hover:bg-slate-50'}`}><PieChartIcon size={20}/></button>
                                </div>
                            </div>

                            <div className="flex-1 w-full relative min-h-0">
                                {renderChart()}
                            </div>
                        </div>
                    )}

                    {/* VUE TABLEUR DÉTAILLÉE */}
                    {viewMode === 'table' && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
                            <div className="p-6 border-b border-slate-100 shrink-0 flex justify-between items-center">
                                <h3 className="font-black text-car-dark text-lg">Aperçu des données brutes</h3>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Affiche les {data?.rawDetails?.length || 0} résultats</span>
                            </div>
                            <div className="flex-1 overflow-auto w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                                        <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <th className="p-4 border-b border-slate-200 whitespace-nowrap">Date</th>
                                            <th className="p-4 border-b border-slate-200">Activité</th>
                                            <th className="p-4 border-b border-slate-200">Enfant</th>
                                            <th className="p-4 border-b border-slate-200">Âge</th>
                                            <th className="p-4 border-b border-slate-200">Classe</th>
                                            <th className="p-4 border-b border-slate-200 text-center">QF</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Régime</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Particularités</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.rawDetails && data.rawDetails.length > 0 ? data.rawDetails.map((row) => (
                                            <tr key={row._id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                                <td className="p-4 font-bold text-car-dark text-xs whitespace-nowrap">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                                                <td className="p-4 text-xs font-black text-car-blue">{row.sessionType}</td>
                                                <td className="p-4 text-sm font-black text-car-dark uppercase">{row.lastName} <span className="capitalize font-medium text-slate-500">{row.firstName}</span></td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{calculateAge(row.birthDate, row.date)} ans</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{row.category || '-'}</td>
                                                <td className="p-4 text-center text-xs font-black text-car-dark">{row.qf || 0}</td>
                                                <td className="p-4 text-center text-[10px] font-bold text-slate-500">{row.regimeAlimentaire}</td>
                                                <td className="p-4 flex gap-1 justify-center flex-wrap max-w-[150px]">
                                                    {row.hasPAI && <span className="bg-car-pink/10 text-car-pink px-2 py-0.5 rounded text-[9px] font-black">PAI</span>}
                                                    {row.medical?.lunettes && <span className="bg-car-yellow/10 text-car-yellow px-2 py-0.5 rounded text-[9px] font-black">LUNETTES</span>}
                                                    {row.autorisationSortieSeul && <span className="bg-car-teal/10 text-car-teal px-2 py-0.5 rounded text-[9px] font-black">SORTIE SEUL</span>}
                                                    {!row.droitImage && <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black">SANS IMAGE</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="8" className="p-8 text-center text-slate-400 font-bold italic">Aucune donnée correspondant aux filtres.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedStats;