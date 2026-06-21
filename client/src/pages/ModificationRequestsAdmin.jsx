import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Coffee, ArrowLeft, ArrowRight, Check, X, User, FolderHeart, Mail } from 'lucide-react';

// --- COMPOSANT INTELLIGENT POUR FORMATER LES DONNÉES COMPLEXES ---
const ValueFormatter = ({ value }) => {
    if (value === null || value === undefined || value === '') {
        return <span className="italic opacity-50">Vide</span>;
    }
    
    if (typeof value === 'boolean') {
        return <span className="font-bold">{value ? 'Oui' : 'Non'}</span>;
    }
    
    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="italic opacity-50">Aucun</span>;
        return (
            <div className="flex flex-col gap-2">
                {value.map((item, idx) => (
                    <div key={idx} className="bg-white/40 p-2 rounded-lg border border-black/5 text-xs">
                        <ValueFormatter value={item} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof value === 'object') {
        if (value.lastName !== undefined || value.firstName !== undefined) {
            const name = `${value.lastName || ''} ${value.firstName || ''}`.trim();
            const phone = value.phone || value.phoneMobile || value.phoneFixe;
            const extra = value.qualite ? `(${value.qualite})` : value.isEmergency ? '(Contact Urgence)' : '';
            return (
                <div>
                    <div className="font-black uppercase">{name} {extra && <span className="text-[10px] text-car-pink ml-1">{extra}</span>}</div>
                    {phone && <div>📞 {phone}</div>}
                    {value.email && <div>✉️ {value.email}</div>}
                </div>
            );
        }
        
        return (
            <div className="flex flex-col gap-1 text-xs">
                {Object.entries(value).map(([k, v]) => {
                    if (v === '' || v === null || (Array.isArray(v) && v.length === 0)) return null; 
                    
                    const label = k.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                    return (
                        <div key={k} className="flex justify-between border-b border-black/5 pb-1 last:border-0 last:pb-0">
                            <span className="capitalize opacity-70 pr-4">{label}</span>
                            <span className="font-bold text-right"><ValueFormatter value={v} /></span>
                        </div>
                    );
                })}
            </div>
        );
    }

    return <span>{String(value)}</span>;
};
// ---------------------------------------------------------------

const ModificationRequestsAdmin = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/requests/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Traitement champ par champ
    const handleDecision = async (requestId, fieldId, status) => {
        let rejectionReason = '';
        if (status === 'rejected') {
            rejectionReason = window.prompt("Motif du refus (sera envoyé aux parents) :");
            if (rejectionReason === null) return; 
        }

        try {
            const token = localStorage.getItem('token');
            
            // On envoie le statut et l'ID du champ spécifiquement
            const payload = { fieldId, status, rejectionReason };

            const response = await fetch(`/api/requests/${requestId}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                fetchRequests(); // Rafraîchir pour faire disparaître le champ traité
            } else {
                alert("Erreur lors du traitement.");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur réseau.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <span className="text-slate-400 font-bold animate-pulse">Chargement des demandes...</span>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
            <div className="flex items-center gap-3 mb-8 ml-2">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Sas de validation : Demandes des familles</h2>
            </div>
            
            {requests.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center min-h-[50vh] mt-6">
                    <div className="bg-car-green/10 p-6 rounded-full mb-6">
                        <CheckCircle size={56} className="text-car-green" strokeWidth={2} />
                    </div>
                    <h2 className="text-2xl font-black text-car-dark mb-3">Tout est à jour !</h2>
                    <p className="text-slate-500 font-medium max-w-md text-lg">
                        Aucune famille n'a soumis de demande de modification pour le moment. Votre sas de validation est impeccable !
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-3 text-slate-400 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                        <Coffee size={20} />
                        <span className="font-semibold">C'est le moment idéal pour une pause café.</span>
                    </div>
                    <button 
                        onClick={() => navigate('/')} 
                        className="mt-8 px-6 py-3 bg-white border-2 border-slate-200 hover:border-car-purple hover:text-car-purple text-slate-600 font-bold rounded-2xl transition-all flex items-center gap-2 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Retour au tableau de bord
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {requests.map(request => {
                        // On ne garde que les champs en attente
                        const pendingFields = request.fields.filter(f => f.status === 'pending');
                        
                        // Si tous les champs ont été traités, on masque la carte (le temps que le fetchRequests la supprime définitivement)
                        if (pendingFields.length === 0) return null;

                        return (
                            <div key={request._id} className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                                
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                                                {request.family?.name || 'Inconnue'}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                <Mail size={12}/> {request.parent?.email}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-car-dark flex items-center gap-2">
                                            {request.targetType === 'Child' ? <User className="text-car-blue" size={24}/> : <FolderHeart className="text-car-yellow" size={24}/>}
                                            {request.targetType === 'Child' ? 'Fiche Enfant' : 'Dossier Famille'} 
                                            <span className="text-car-blue">
                                                ({request.targetType === 'Child' 
                                                    ? `${request.targetId?.firstName} ${request.targetId?.lastName}` 
                                                    : request.targetId?.name})
                                            </span>
                                        </h3>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {pendingFields.map(field => (
                                        <div key={field._id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            
                                            <div className="lg:col-span-2 flex items-center">
                                                <span className="font-black text-slate-500 uppercase text-xs tracking-widest">
                                                    {field.fieldNameFr}
                                                </span>
                                            </div>

                                            <div className="lg:col-span-3 bg-red-50/50 border border-red-100 rounded-xl p-4 text-red-900">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Ancienne valeur</div>
                                                <ValueFormatter value={field.oldValue} />
                                            </div>

                                            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-slate-300">
                                                <ArrowRight size={24} />
                                            </div>

                                            <div className="lg:col-span-4 bg-green-50/50 border border-green-100 rounded-xl p-4 text-green-900">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-2">Valeur demandée</div>
                                                <ValueFormatter value={field.newValue} />
                                            </div>

                                            <div className="lg:col-span-2 flex flex-row lg:flex-col gap-2 justify-center">
                                                <button 
                                                    onClick={() => handleDecision(request._id, field._id, 'approved')}
                                                    className="flex-1 bg-car-green hover:bg-green-600 text-white p-3 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shadow-sm font-bold text-xs"
                                                >
                                                    <Check size={18} className="mr-1"/> Accepter
                                                </button>
                                                <button 
                                                    onClick={() => handleDecision(request._id, field._id, 'rejected')}
                                                    className="flex-1 bg-white border-2 border-car-pink text-car-pink hover:bg-car-pink hover:text-white p-3 rounded-xl flex items-center justify-center transition-all shadow-sm font-bold text-xs"
                                                >
                                                    <X size={18} className="mr-1"/> Refuser
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ModificationRequestsAdmin;