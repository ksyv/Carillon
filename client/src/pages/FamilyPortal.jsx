import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, FolderHeart, FileEdit, Banknote, LogOut, Info, AlertTriangle, CheckCircle, Newspaper, Calendar, Send, Loader, User, Lock, KeyRound, Mail, X, Check, Copy, Users, Pencil, GraduationCap, UploadCloud } from 'lucide-react';
import LogoTexte from '../components/LogoTexte';
import api from '../api';

// ==========================================
// MODAL DE LECTURE COMPLÈTE D'UNE NEWS
// ==========================================
const NewsViewModal = ({ news, onClose, onImageClick }) => {
    if (!news) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="h-4 w-full shrink-0" style={{ backgroundColor: news.borderColor || '#0ea5e9' }}></div>
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6 gap-4">
                        <h2 className="text-2xl sm:text-3xl font-black text-car-dark">{news.title}</h2>
                        <button onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink transition-colors shrink-0"><X size={24}/></button>
                    </div>
                    <div 
                        onClick={(e) => {
                            if (e.target.tagName === 'IMG') {
                                onImageClick(e.target.src);
                            }
                        }}
                        className="prose prose-sm sm:prose-base max-w-none text-slate-600 prose-headings:font-black prose-a:text-car-blue prose-img:rounded-xl prose-img:shadow-sm prose-img:cursor-zoom-in hover:prose-img:opacity-95 transition-opacity"
                        dangerouslySetInnerHTML={{ __html: news.content }} 
                    />
                </div>
            </div>
        </div>
    );
};

// ==========================================
// LIGHTBOX PLEIN ÉCRAN POUR ZOOMER SUR LES IMAGES
// ==========================================
const ImageLightbox = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
            <button onClick={onClose} className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors">
                <X size={24}/>
            </button>
            <img 
                src={src} 
                alt="Zoom publication" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    );
};

// ==========================================
// MODAL ENFANT (Vue Parent)
// ==========================================
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

// ==========================================
// PORTAIL FAMILLE PRINCIPAL
// ==========================================
const FamilyPortal = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activationToken = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState(false);

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeTab, setActiveTab] = useState('HUB');
    const [parentData, setParentData] = useState(null);
    const [newsList, setNewsList] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    
    const [editFamily, setEditFamily] = useState(null);
    const [childToEdit, setChildToEdit] = useState(null);

    const [newsToView, setNewsToView] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    useEffect(() => {
        if (activationToken) {
            setIsLoading(false);
            return;
        }
        loadParentData();
    }, [activationToken]);

    const loadParentData = async () => {
        if (!localStorage.getItem('token')) {
            setIsLoading(false);
            return;
        }
        try {
            const [meRes, newsRes] = await Promise.all([
                api.get('/parent/me'),
                api.get('/news')
            ]);
            
            const data = meRes.data;
            setParentData(data);
            setNewsList(newsRes.data || []);
            
            const resps = data.family.responsables ? JSON.parse(JSON.stringify(data.family.responsables)) : [];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', birthDate: '', adressePostale: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            
            const docs = data.family.documents ? JSON.parse(JSON.stringify(data.family.documents)) : {};
            
            setEditFamily({ ...data.family, wombResps: resps, responsables: resps, documents: docs });

        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) {
                localStorage.removeItem('token');
            }
        } finally {
            fillAllData();
        }
    };

    const fillAllData = () => {
        setIsLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const { data } = await api.post('/parent/login', { email: loginEmail, password: loginPassword });
            localStorage.setItem('token', data.token);
            window.location.href = '/parent/portal';
        } catch (e) {
            alert("Email ou mot de passe incorrect.");
        }
        setIsLoggingIn(false);
    };

    const handleActivation = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Les mots de passe ne correspondent pas.");
            return;
        }
        setIsActivating(true);
        try {
            await api.post('/parent/activate', { token: activationToken, password: newPassword });
            setActivationSuccess(true);
        } catch (error) {
            alert("Erreur d'activation. Le lien a peut-être expiré.");
        } finally {
            setIsActivating(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/parent/portal';
    };

    const handleRespChange = (index, field, value) => {
        const newResps = [...editFamily.responsables];
        newResps[index] = { ...newResps[index], [field]: value };
        setEditFamily({ ...editFamily, responsables: newResps });
    };

    const handleFamilyDocUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditFamily(prev => {
                const updatedDocs = JSON.parse(JSON.stringify(prev.documents || {}));
                if (!updatedDocs.attestationCAF) updatedDocs.attestationCAF = {};
                
                updatedDocs.attestationCAF.fileUrl = reader.result;
                updatedDocs.attestationCAF.status = 'En attente de validation';
                
                return { ...prev, documents: updatedDocs };
            });
        };
        reader.readAsDataURL(file);
    };

    const submitFamilyChanges = async () => {
        const changes = [];
        
        if (JSON.stringify(editFamily.responsables) !== JSON.stringify(parentData.family.responsables)) {
            changes.push({ fieldKey: 'responsables', fieldNameFr: 'Informations des responsables', oldValue: parentData.family.responsables, newValue: editFamily.responsables });
        }
        
        if (JSON.stringify(editFamily.documents) !== JSON.stringify(parentData.family.documents)) {
            changes.push({ fieldKey: 'documents', fieldNameFr: 'Justificatif (CAF/Impôts)', oldValue: parentData.family.documents, newValue: editFamily.documents });
        }
        
        if (changes.length === 0) {
            alert("Aucune modification détectée sur le dossier.");
            return;
        }

        try {
            await api.post('/requests', {
                targetType: 'Family',
                targetId: parentData.family._id,
                fields: changes
            });
            alert("✅ Vos demandes de modifications et justificatifs ont bien été envoyés au secrétariat !");
            loadParentData(); 
        } catch (e) {
            alert("Erreur lors de l'envoi de la demande.");
        }
    };

    const TabHub = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-car-blue text-white p-8 rounded-[2rem] shadow-lg relative overflow-hidden mb-6">
                <div className="relative z-10">
                    <h2 className="text-sm font-bold tracking-widest opacity-80 uppercase mb-2">Bienvenue sur votre espace</h2>
                    <h1 className="text-3xl sm:text-4xl font-black mb-2">Service Périscolaire</h1>
                    <p className="text-sm font-medium opacity-90 max-w-md">Retrouvez ici toutes les actualités de la structure et les informations importantes.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none"><Newspaper size={200} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsList.length > 0 ? (
                    newsList.map(news => (
                        <div 
                            key={news._id} 
                            onClick={() => setNewsToView(news)}
                            className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-80 relative group"
                        >
                            <div className="h-2.5 w-full shrink-0" style={{ backgroundColor: news.borderColor || '#0ea5e9' }}></div>
                            
                            <div className="p-6 flex flex-col flex-1 overflow-hidden">
                                <h3 className="text-lg font-black text-car-dark mb-3 line-clamp-2 group-hover:text-car-blue transition-colors">{news.title}</h3>
                                <div className="relative flex-1 overflow-hidden pointer-events-none text-xs text-slate-500">
                                    <div 
                                        className="prose prose-sm max-w-none text-slate-500 prose-headings:font-black prose-img:max-h-24 prose-img:object-cover prose-img:rounded-xl"
                                        dangerouslySetInnerHTML={{ __html: news.content }} 
                                    />
                                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                                </div>
                                <div className="mt-3 text-[10px] font-black uppercase text-car-blue tracking-wider flex items-center gap-1 shrink-0">
                                    Lire la suite →
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full bg-slate-100/50 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-bold">Aucune actualité pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const TabDossier = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 w-full mb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="bg-car-green/10 p-3 rounded-2xl text-car-green"><FolderHeart size={24}/></div>
                            <h2 className="text-3xl font-black text-car-dark uppercase">DOSSIER FAMILLE</h2>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Visualisez et demandez la modification de vos informations.</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${parentData?.family?.dossierComplet ? 'bg-car-green/10 text-car-green' : 'bg-car-pink/10 text-car-pink'}`}>
                        {parentData?.family?.dossierComplet ? <><CheckCircle size={16}/> DOSSIER COMPLET</> : <><AlertTriangle size={16}/> DOSSIER INCOMPLET</>}
                    </div>
                </div>

                {/* FACTURATION */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col mb-8">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                        <h3 className="font-black text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Facturation & QF (Géré par la mairie)</h3>
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-bold text-xs">Payeur : {parentData?.family?.payeur || 'Non assigné'}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Revenu Réf. (€)</label>
                                <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-500 text-sm">{parentData?.family?.revenuReference || '-'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Nb Parts</label>
                                <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-500 text-sm">{parentData?.family?.nombreParts || '-'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold block mb-1 uppercase text-car-blue">QF Calculé</label>
                                <div className="w-full bg-car-blue/10 border border-car-blue/20 p-3 rounded-xl font-black text-car-blue text-center text-sm">{parentData?.family?.quotientFamilial || '-'}</div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="flex-1 w-full text-center sm:text-left">
                                <span className="text-xs font-black text-slate-500 uppercase block mb-1">Justificatif CAF / Impôts</span>
                                {editFamily?.documents?.attestationCAF?.fileUrl ? (
                                    <span className="text-xs font-bold text-car-green flex items-center justify-center sm:justify-start gap-1"><CheckCircle size={14}/> Document chargé</span>
                                ) : (
                                    <span className="text-xs text-slate-400 block">Aucun document transmis</span>
                                )}
                            </div>
                            <label className="cursor-pointer bg-white border border-slate-200 hover:border-car-blue px-4 py-2 w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 group transition-colors">
                                <UploadCloud size={18} className="text-slate-400 group-hover:text-car-blue transition-colors" />
                                <span className="text-xs font-bold text-slate-500 group-hover:text-car-blue">Transmettre</span>
                                <input type="file" accept=".pdf, image/*" className="hidden" onChange={handleFamilyDocUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* RESPONSABLES */}
                {editFamily && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {editFamily.responsables.map((resp, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl relative">
                                <h3 className={`font-black mb-4 text-sm tracking-widest uppercase border-b border-slate-100 pb-2 ${idx === 0 ? 'text-car-blue' : 'text-car-teal'}`}>
                                    Responsable {idx + 1}
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold uppercase ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="NOM" value={resp.lastName} onChange={e => handleRespChange(idx, 'lastName', e.target.value.toUpperCase())}/>
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold capitalize ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Prénom" value={resp.firstName} onChange={e => handleRespChange(idx, 'firstName', e.target.value)}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Qualité" value={resp.qualite} onChange={e => handleRespChange(idx, 'qualite', e.target.value)}/>
                                        <input type="date" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium text-slate-600 ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} value={resp.birthDate ? resp.birthDate.split('T')[0] : ''} onChange={e => handleRespChange(idx, 'birthDate', e.target.value)}/>
                                    </div>
                                    <textarea className={`w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium resize-none ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} rows="2" placeholder="Adresse..." value={resp.adressePostale || ''} onChange={e => handleRespChange(idx, 'adressePostale', e.target.value)}></textarea>
                                    <div className="flex gap-2">
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Téléphone" value={resp.phoneMobile} onChange={e => handleRespChange(idx, 'phoneMobile', e.target.value)}/>
                                        <input type="email" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Email" value={resp.email} onChange={e => handleRespChange(idx, 'email', e.target.value)}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Profession" value={resp.profession} onChange={e => handleRespChange(idx, 'profession', e.target.value)}/>
                                        <input type="text" className={`w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="Employeur" value={resp.employeur} onChange={e => handleRespChange(idx, 'employeur', e.target.value)}/>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <select className="w-1/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold text-slate-500" value={resp.couvertureSociale} onChange={e => handleRespChange(idx, 'couvertureSociale', e.target.value)}>
                                            <option value="CPAM">CPAM</option><option value="MSA">MSA</option><option value="AUTRE">Autre</option>
                                        </select>
                                        <input type="text" className={`w-2/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium ${idx === 0 ? 'focus:border-car-blue' : 'focus:border-car-teal'}`} placeholder="N° Allocataire" value={resp.numAllocataireCAF} onChange={e => handleRespChange(idx, 'numAllocataireCAF', e.target.value)}/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button onClick={submitFamilyChanges} className="bg-car-blue text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-car-blue/20">
                        <Send size={18}/> SOUMETTRE LES MODIFICATIONS
                    </button>
                </div>

                {/* ENFANTS */}
                <div className="mt-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-2 w-2 rounded-full bg-car-blue"></div>
                        <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Enfants rattachés</h3>
                    </div>
                    {parentData?.children && parentData.children.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parentData.children.map(child => (
                                <div key={child._id} className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-50 p-4 rounded-full text-slate-300"><Users size={24}/></div>
                                            <div>
                                                <span className="font-black text-car-dark text-xl block leading-tight">{child.lastName} <span className="font-medium text-slate-500 capitalize">{child.firstName}</span></span>
                                                <div className="flex flex-wrap gap-2 mt-2 items-center">
                                                    <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-widest ${child.category === 'Élémentaire' ? 'bg-car-blue/10 text-car-blue' : 'bg-car-yellow/10 text-car-yellow'}`}>
                                                        {child.category || 'Maternelle'}
                                                    </span>
                                                    {child.classGroup && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-slate-100 text-slate-600 flex items-center gap-1">
                                                            <GraduationCap size={12}/> {child.classGroup.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setChildToEdit(child)} className="text-slate-400 hover:text-car-blue p-3 bg-slate-50 hover:bg-car-blue/10 rounded-xl transition-colors flex items-center gap-2">
                                            <Pencil size={18}/> <span className="text-xs font-bold uppercase hidden sm:inline">Modifier</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-100/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center py-12">
                            <h4 className="font-black text-slate-400 text-lg mb-2">Aucun enfant trouvé</h4>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const TabFactures = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-dark"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mes Factures</h3>
            </div>
            <div className="bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Banknote size={64} className="text-slate-300 mb-4" />
                <h4 className="font-black text-slate-400 text-xl mb-2">Module en construction</h4>
            </div>
        </div>
    );


    // ===================================================================
    // --- RENDUS CONDITIONNELS STRUCTURELS SÉCURISÉS (WALL ANTI-BYPASS) ---
    // ===================================================================

    // 1. Écran de chargement universel
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader className="animate-spin text-car-blue" size={48} />
            </div>
        );
    }

    // 2. Écran d'Activation (si un token est présent dans l'URL et non connecté)
    if (!parentData && activationToken) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8 flex items-center justify-center gap-4 sm:gap-6">
                    <img src="/logo-mairie.png" alt="Mairie" className="h-12 sm:h-16 object-contain" />
                    <div className="w-px h-10 sm:h-12 bg-slate-300"></div>
                    <LogoTexte className="text-3xl sm:text-4xl" />
                </div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-purple"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Activation de compte</h1>
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Définissez votre mot de passe pour activer votre espace parent Carillon.</p>
                    
                    {activationSuccess ? (
                        <div className="text-center space-y-4">
                            <div className="bg-car-green/10 p-4 rounded-full text-car-green w-16 h-16 mx-auto flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <p className="font-bold text-car-dark">Compte activé avec succès !</p>
                            <button onClick={() => window.location.href = '/parent/portal'} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg mt-2">
                                Se connecter
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleActivation} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nouveau mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-purple font-bold text-car-dark" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-purple font-bold text-car-dark" required />
                                </div>
                            </div>
                            <button type="submit" disabled={isActivating || !newPassword || newPassword !== confirmPassword} className="w-full bg-car-purple text-white font-black py-4 rounded-2xl shadow-lg mt-4 flex justify-center items-center gap-2 disabled:opacity-50">
                                {isActivating ? <Loader className="animate-spin" size={20}/> : "Activer mon compte"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // 3. Écran de connexion classique (si non connecté)
    if (!parentData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8 flex items-center justify-center gap-4 sm:gap-6">
                    <img src="/logo-mairie.png" alt="Mairie de Carignan-de-Bordeaux" className="h-12 sm:h-16 object-contain" />
                    <div className="w-px h-10 sm:h-12 bg-slate-300"></div>
                    <LogoTexte className="text-3xl sm:text-4xl" />
                </div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-blue"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Espace Famille</h1>
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Connectez-vous pour gérer votre dossier.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email parent</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <button type="submit" disabled={isLoggingIn || !loginEmail || !loginPassword} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg mt-4 flex justify-center items-center gap-2">
                            {isLoggingIn ? <Loader className="animate-spin" size={20}/> : "Se connecter"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 4. Écran connecté (Uniquement accessible si parentData est vérifié et présent)
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white px-4 sm:px-6 py-3 sm:py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3 sm:gap-5">
                    <img src="/logo-mairie.png" alt="Mairie" className="h-8 sm:h-10 object-contain" />
                    <div className="w-px h-6 sm:h-8 bg-slate-200"></div>
                    <LogoTexte className="text-lg sm:text-xl md:text-2xl" />
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-car-pink transition-colors font-bold text-sm bg-slate-50 px-3 py-2 sm:px-4 rounded-xl shrink-0">
                    <span className="hidden sm:inline">Déconnexion</span><LogOut size={18} />
                </button>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-40 md:pb-32">
                {activeTab === 'HUB' && <TabHub />}
                {activeTab === 'DOSSIER' && <TabDossier />}
                {activeTab === 'FACTURES' && <TabFactures />}
            </main>

            {childToEdit && <ChildRequestModal child={childToEdit} onClose={() => setChildToEdit(null)} onRefresh={loadParentData} />}

            {newsToView && <NewsViewModal news={newsToView} onClose={() => setNewsToView(null)} onImageClick={(src) => setZoomedImage(src)} />}
            {zoomedImage && <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} />}

            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 pb-safe">
                <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center px-4 py-3">
                    <button onClick={() => setActiveTab('HUB')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'HUB' ? 'text-car-blue' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'HUB' ? 'bg-car-blue/10' : ''}`}><Home size={22} strokeWidth={activeTab === 'HUB' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Accueil</span>
                    </button>
                    <button onClick={() => setActiveTab('DOSSIER')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'DOSSIER' ? 'text-car-green' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'DOSSIER' ? 'bg-car-green/10' : ''}`}><FolderHeart size={22} strokeWidth={activeTab === 'DOSSIER' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Dossier</span>
                    </button>
                    <button onClick={() => setActiveTab('FACTURES')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'FACTURES' ? 'text-car-dark' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'FACTURES' ? 'bg-slate-100' : ''}`}><Banknote size={22} strokeWidth={activeTab === 'FACTURES' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Factures</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default FamilyPortal;