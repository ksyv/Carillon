import React, { useState, useEffect } from 'react';
import { X, Info, CheckCircle, UploadCloud, Loader, Send } from 'lucide-react';
import api from '../../api'; // On remonte de deux niveaux pour atteindre src/api

const ChildRequestModal = ({ child, onClose, onRefresh }) => {
    const [editingChild, setEditingChild] = useState(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (child) {
            setEditingChild({
                _id: child._id,
                firstName: child.firstName, 
                lastName: child.lastName, 
                category: child.category || 'Maternelle', 
                classGroup: child.classGroup?.name || 'Non assignée',
                sexe: child.sexe || '',
                birthDate: child.birthDate ? child.birthDate.split('T')[0] : '', 
                droitImage: child.droitImage || false, 
                autorisationSortieSeul: child.autorisationSortieSeul || false,
                medical: child.medical ? JSON.parse(JSON.stringify(child.medical)) : { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '' },
                hasPAI: child.hasPAI || false, 
                paiDetails: child.paiDetails || '', 
                isPAIAlimentaire: child.isPAIAlimentaire || false, 
                paiDocument: child.paiDocument || '', 
                regimeAlimentaire: child.regimeAlimentaire || 'Standard',
                personnesAutorisees: child.personnesAutorisees ? JSON.parse(JSON.stringify(child.personnesAutorisees)) : [],
                documents: child.documents ? JSON.parse(JSON.stringify(child.documents)) : { vaccins: {}, assurance: {} }
            });
        }
    }, [child]);

    const handleContactChange = (index, field, value) => {
        const newContacts = [...editingChild.personnesAutorisees];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setEditingChild({ ...editingChild, personnesAutorisees: newContacts });
    };

    const handleChildDocUpload = (docType, e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingChild(prev => {
                const updatedDocs = JSON.parse(JSON.stringify(prev.documents || {}));
                if (!updatedDocs[docType]) updatedDocs[docType] = {};
                updatedDocs[docType].fileUrl = reader.result;
                updatedDocs[docType].status = 'En attente de validation';
                return { ...prev, documents: updatedDocs };
            });
        };
        reader.readAsDataURL(file);
    };

    const handlePaiDocumentUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingChild(prev => ({ ...prev, paiDocument: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        const changes = [];
        
        const compare = (key, nameFr, oldV, newV) => {
            if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
                changes.push({ fieldKey: key, fieldNameFr: nameFr, oldValue: oldV, newValue: newV });
            }
        };

        compare('lastName', 'Nom', child.lastName, editingChild.lastName);
        compare('firstName', 'Prénom', child.firstName, editingChild.firstName);
        compare('sexe', 'Sexe', child.sexe, editingChild.sexe);
        compare('birthDate', 'Date de naissance', child.birthDate ? child.birthDate.split('T')[0] : '', editingChild.birthDate);
        compare('droitImage', "Droit à l'image", child.droitImage, editingChild.droitImage);
        compare('autorisationSortieSeul', "Sortie Seul", child.autorisationSortieSeul, editingChild.autorisationSortieSeul);
        compare('hasPAI', "Présence d'un PAI", child.hasPAI, editingChild.hasPAI);
        compare('paiDetails', "Détails PAI", child.paiDetails, editingChild.paiDetails);
        compare('isPAIAlimentaire', "PAI Alimentaire", child.isPAIAlimentaire, editingChild.isPAIAlimentaire);
        compare('paiDocument', "Document Protocole PAI", child.paiDocument, editingChild.paiDocument); 
        compare('regimeAlimentaire', "Régime Alimentaire", child.regimeAlimentaire, editingChild.regimeAlimentaire);
        compare('medical', "Informations Médicales", child.medical, editingChild.medical);
        compare('personnesAutorisees', "Personnes Autorisées", child.personnesAutorisees, editingChild.personnesAutorisees);
        compare('documents', "Documents Justificatifs", child.documents, editingChild.documents);

        if (changes.length === 0) {
            alert("Aucune modification n'a été détectée.");
            return;
        }

        setIsSending(true);
        try {
            await api.post('/requests', {
                targetType: 'Child',
                targetId: child._id,
                fields: changes
            });
            alert("✅ Vos demandes de modifications (et documents) ont bien été envoyées au secrétariat.");
            onClose();
            if (onRefresh) onRefresh();
        } catch (error) {
            alert("Erreur lors de l'envoi de la demande.");
        }
        setIsSending(false);
    };

    if (!editingChild) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-3xl font-black text-car-dark">Fiche Enfant : {editingChild.firstName}</h3>
                    <button type="button" onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm font-bold flex gap-3 items-center">
                    <Info size={24} className="shrink-0" />
                    <p>Toute modification ou document transmis sera envoyé au service périscolaire pour validation.</p>
                </div>

                <form onSubmit={submitRequest} className="space-y-8">
                    {/* IDENTITÉ */}
                    <div>
                        <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Identité & Scolarité</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-black uppercase text-car-dark" placeholder="NOM" value={editingChild.lastName} onChange={e => setEditingChild({...editingChild, lastName: e.target.value.toUpperCase()})} required/>
                            <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-bold text-car-dark capitalize" placeholder="Prénom" value={editingChild.firstName} onChange={e => setEditingChild({...editingChild, firstName: e.target.value})} required/>
                            <select className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" value={editingChild.sexe} onChange={e => setEditingChild({...editingChild, sexe: e.target.value})}>
                                <option value="">Sexe...</option><option value="Féminin">Féminin</option><option value="Masculin">Masculin</option>
                            </select>
                            <input type="date" className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-medium text-car-dark" value={editingChild.birthDate} onChange={e => setEditingChild({...editingChild, birthDate: e.target.value})} required/>
                            <div className="col-span-2 sm:col-span-2 bg-slate-100 border border-slate-200 p-4 rounded-xl font-bold text-slate-500 flex items-center justify-between">
                                <span>Classe (Lecture seule) :</span>
                                <span className="text-car-dark bg-white px-3 py-1 rounded-lg border border-slate-200">{editingChild.classGroup}</span>
                            </div>
                        </div>
                    </div>

                    {/* DOCUMENTS ENFANTS */}
                    <div>
                        <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Documents Administratifs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-black text-slate-500 uppercase block mb-1">Carnet de Vaccins</span>
                                    {editingChild.documents?.vaccins?.fileUrl ? (
                                        <span className="text-xs font-bold text-car-green flex items-center gap-1 mb-3"><CheckCircle size={14}/> Document chargé</span>
                                    ) : (
                                        <span className="text-xs text-slate-400 block mb-3">Aucun document transmis</span>
                                    )}
                                </div>
                                <label className="cursor-pointer bg-white border-2 border-dashed border-slate-200 hover:border-car-blue p-4 rounded-xl flex flex-col items-center justify-center gap-2 group transition-colors">
                                    <UploadCloud size={24} className="text-slate-300 group-hover:text-car-blue transition-colors" />
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-car-blue text-center">Transmettre un PDF ou une photo</span>
                                    <input type="file" accept=".pdf, image/*" className="hidden" onChange={e => handleChildDocUpload('vaccins', e)} />
                                </label>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-black text-slate-500 uppercase block mb-1">Assurance Responsabilité Civile</span>
                                    {editingChild.documents?.assurance?.fileUrl ? (
                                        <span className="text-xs font-bold text-car-green flex items-center gap-1 mb-3"><CheckCircle size={14}/> Document chargé</span>
                                    ) : (
                                        <span className="text-xs text-slate-400 block mb-3">Aucun document transmis</span>
                                    )}
                                </div>
                                <label className="cursor-pointer bg-white border-2 border-dashed border-slate-200 hover:border-car-blue p-4 rounded-xl flex flex-col items-center justify-center gap-2 group transition-colors">
                                    <UploadCloud size={24} className="text-slate-300 group-hover:text-car-blue transition-colors" />
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-car-blue text-center">Transmettre un PDF ou une photo</span>
                                    <input type="file" accept=".pdf, image/*" className="hidden" onChange={e => handleChildDocUpload('assurance', e)} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CONTACTS AUTORISÉS */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase">Personnes Autorisées</h4>
                            <button type="button" onClick={() => setEditingChild({...editingChild, personnesAutorisees: [...editingChild.personnesAutorisees, {firstName:'', lastName:'', phone:'', isEmergency: false}]})} className="text-xs font-bold text-car-blue bg-car-blue/10 px-3 py-1.5 rounded-lg">+ AJOUTER</button>
                        </div>
                        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {editingChild.personnesAutorisees.map((c, i) => (
                                <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                                    <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold uppercase outline-none" placeholder="NOM" value={c.lastName} onChange={e => handleContactChange(i, 'lastName', e.target.value.toUpperCase())}/>
                                    <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold capitalize outline-none" placeholder="Prénom" value={c.firstName} onChange={e => handleContactChange(i, 'firstName', e.target.value)}/>
                                    <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold outline-none" placeholder="Téléphone" value={c.phone} onChange={e => handleContactChange(i, 'phone', e.target.value)}/>
                                    <label className="flex items-center gap-1 text-[10px] font-bold text-car-pink cursor-pointer px-2">
                                        <input type="checkbox" className="accent-car-pink" checked={c.isEmergency} onChange={e => handleContactChange(i, 'isEmergency', e.target.checked)}/> Urgence
                                    </label>
                                    <button type="button" onClick={() => {
                                        const newArr = editingChild.personnesAutorisees.filter((_, idx) => idx !== i);
                                        setEditingChild({...editingChild, personnesAutorisees: newArr});
                                    }} className="text-slate-400 hover:text-car-pink p-2"><X size={16}/></button>
                                </div>
                            ))}
                            {editingChild.personnesAutorisees.length === 0 && <p className="text-xs text-slate-400 italic text-center">Aucune personne autorisée renseignée.</p>}
                        </div>
                    </div>

                    {/* AUTORISATIONS MAIRIE */}
                    <div>
                        <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Autorisations Mairie</h4>
                        <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.droitImage} onChange={e => setEditingChild({...editingChild, droitImage: e.target.checked})} />
                                <span className="font-bold text-car-dark">Droit à l'image accordé</span>
                            </label>
                            {editingChild.category === 'Élémentaire' && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 accent-car-blue" checked={editingChild.autorisationSortieSeul} onChange={e => setEditingChild({...editingChild, autorisationSortieSeul: e.target.checked})} />
                                    <span className="font-bold text-car-blue">Autorisation de quitter l'APS seul (Élémentaire)</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* SANTÉ */}
                    <div>
                        <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Santé & Médical</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.lunettes} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, lunettes: e.target.checked}})} /> Lunettes</label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.appareilAuditif} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, appareilAuditif: e.target.checked}})} /> Appareil Auditif</label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.appareilDentaire} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, appareilDentaire: e.target.checked}})} /> Appareil Dentaire</label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.medical.activitesPhysiques} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, activitesPhysiques: e.target.checked}})} /> Apte activités physiques</label>
                            </div>
                            <div className="flex gap-4 border-t border-slate-200 pt-4">
                                <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow text-sm font-medium" placeholder="Nom du médecin traitant" value={editingChild.medical.medecinNom} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, medecinNom: e.target.value}})}/>
                                <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow text-sm font-medium" placeholder="Téléphone du médecin" value={editingChild.medical.medecinPhone} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, medecinPhone: e.target.value}})}/>
                            </div>
                        </div>
                    </div>

                    {/* PAI & CANTINE */}
                    <div>
                        <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">PAI & Cantine</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-car-pink/5 border border-car-pink/20 p-4 rounded-2xl flex flex-col gap-3">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.hasPAI} onChange={e => setEditingChild({...editingChild, hasPAI: e.target.checked})} /> Mon enfant a un PAI</label>
                                {editingChild.hasPAI && (
                                    <>
                                        <input className="bg-white border border-car-pink/30 p-3 rounded-xl outline-none focus:border-car-pink text-sm font-medium" placeholder="Motif du PAI" value={editingChild.paiDetails} onChange={e => setEditingChild({...editingChild, paiDetails: e.target.value})}/>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.isPAIAlimentaire} onChange={e => {
                                            const isAlim = e.target.checked;
                                            setEditingChild({...editingChild, isPAIAlimentaire: isAlim, regimeAlimentaire: isAlim ? 'PAI' : 'Standard'});
                                        }} /> C'est un PAI Alimentaire</label>
                                        <div className="mt-2 bg-white p-3 rounded-xl border border-car-pink/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex flex-col flex-1 w-full">
                                                <span className="text-[10px] font-black text-car-pink uppercase">Joindre le document PAI</span>
                                                {editingChild.paiDocument ? (
                                                    <span className="text-xs font-bold text-car-green flex items-center gap-1 mt-1"><CheckCircle size={14}/> Fichier chargé</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 mt-1">Aucun fichier (requis)</span>
                                                )}
                                            </div>
                                            <label className="cursor-pointer bg-slate-50 border border-slate-200 hover:border-car-pink px-4 py-2 rounded-xl flex items-center justify-center gap-2 group transition-colors shrink-0 w-full sm:w-auto">
                                                <UploadCloud size={18} className="text-slate-400 group-hover:text-car-pink transition-colors" />
                                                <span className="text-xs font-bold text-slate-500 group-hover:text-car-pink">Transmettre</span>
                                                <input type="file" accept=".pdf, image/*" className="hidden" onChange={handlePaiDocumentUpload} />
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                <label className="text-xs font-bold text-slate-500 block mb-2">Régime Alimentaire</label>
                                <select className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold text-car-dark" value={editingChild.regimeAlimentaire} onChange={e => setEditingChild({...editingChild, regimeAlimentaire: e.target.value})} disabled={editingChild.isPAIAlimentaire}>
                                    <option value="Standard">Standard</option><option value="Sans-porc">Sans-porc</option><option value="Végétarien">Végétarien</option><option value="PAI">PAI</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">Annuler</button>
                        <button type="submit" disabled={isSending} className="px-8 py-4 font-black text-white bg-car-green hover:bg-green-600 rounded-2xl flex items-center gap-2">
                            {isSending ? <Loader size={20} className="animate-spin" /> : <Send size={20}/>} SOUMETTRE LES MODIFICATIONS
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChildRequestModal;