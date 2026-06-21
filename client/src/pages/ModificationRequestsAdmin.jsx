import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Coffee, ArrowLeft } from 'lucide-react';

const ModificationRequestsAdmin = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fonction pour récupérer les demandes en attente
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

    // Gérer la décision pour un champ spécifique
    const handleDecision = async (requestId, fieldId, status, oldDecision) => {
        let rejectionReason = '';
        if (status === 'rejected') {
            rejectionReason = window.prompt("Motif du refus (sera envoyé aux parents) :");
            if (rejectionReason === null) return; // Annulé par le staff
        }

        try {
            const token = localStorage.getItem('token');
            
            const payload = {
                processedFields: [{ fieldId, status, rejectionReason }]
            };

            const response = await fetch(`/api/requests/${requestId}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Décision enregistrée et notifiée à la famille !");
                fetchRequests(); // On rafraîchit la liste
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
        <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
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
                requests.map(request => (
                    <div key={request._id} style={{ border: '1px solid #ccc', margin: '15px 0', padding: '15px', borderRadius: '8px', backgroundColor: 'white' }}>
                        <h3>
                            Famille {request.family?.name || 'Inconnue'} 
                            <span style={{ fontSize: '0.8em', color: 'gray', marginLeft: '10px' }}>
                                (Demandé par {request.parent?.email})
                            </span>
                        </h3>
                        
                        {/* C'EST ICI QU'ON A CORRIGÉ L'ERREUR 31 : on extrait intelligemment le prénom/nom */}
                        <p>
                            <strong>Cible de la modification :</strong> {request.targetType === 'Child' ? 'Fiche Enfant' : 'Dossier Famille'} 
                            <span className="font-bold text-car-blue ml-2">
                                ({request.targetType === 'Child' 
                                    ? `${request.targetId?.firstName} ${request.targetId?.lastName}` 
                                    : request.targetId?.name})
                            </span>
                        </p>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Champ</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Ancienne valeur</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Nouvelle valeur demandée</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {request.fields.map(field => (
                                    field.status === 'pending' && (
                                        <tr key={field._id}>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>{field.fieldNameFr}</strong></td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: 'red' }}>{JSON.stringify(field.oldValue) || 'Vide'}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: 'green' }}>{JSON.stringify(field.newValue)}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                                                <button 
                                                    onClick={() => handleDecision(request._id, field._id, 'approved')}
                                                    style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px', marginRight: '5px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    ✓ Accepter
                                                </button>
                                                <button 
                                                    onClick={() => handleDecision(request._id, field._id, 'rejected')}
                                                    style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    ✗ Refuser
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </div>
    );
};

export default ModificationRequestsAdmin;