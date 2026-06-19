import React, { useState, useEffect } from 'react';

const ModificationRequestsAdmin = () => {
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
            
            // On envoie le tableau avec UN SEUL champ traité pour l'instant
            // (Tu pourras optimiser pour valider tout d'un coup plus tard si tu veux)
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

    if (loading) return <div>Chargement des demandes...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Sas de validation : Demandes des familles</h2>
            
            {requests.length === 0 ? (
                <p>✅ Aucune demande en attente. Tout est à jour !</p>
            ) : (
                requests.map(request => (
                    <div key={request._id} style={{ border: '1px solid #ccc', margin: '15px 0', padding: '15px', borderRadius: '8px' }}>
                        <h3>
                            Famille {request.family?.name || 'Inconnue'} 
                            <span style={{ fontSize: '0.8em', color: 'gray', marginLeft: '10px' }}>
                                (Demandé par {request.parent?.email})
                            </span>
                        </h3>
                        <p><strong>Cible de la modification :</strong> {request.targetType === 'Child' ? 'Enfant' : 'Famille'} (ID: {request.targetId})</p>
                        
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