import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Trash2, Pencil, X, Check, Utensils, AlertTriangle, Loader, Users, FileText, Search, UserMinus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ClassManager = () => {
    const [classes, setClasses] = useState([]);
    const [children, setChildren] = useState([]); // 👉 NOUVEAU : On charge les enfants
    const [editingClass, setEditingClass] = useState(null);
    const [absenceModal, setAbsenceModal] = useState(null);
    
    // 👉 NOUVEAU : État pour la gestion des élèves d'une classe
    const [manageClassModal, setManageClassModal] = useState(null);
    const [searchStudentText, setSearchStudentText] = useState('');

    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    // 👉 NOUVEAU : On charge les classes ET les enfants en même temps
    const loadData = async () => {
        try {
            const [clsRes, kidsRes] = await Promise.all([
                api.get('/classes'),
                api.get('/children')
            ]);
            setClasses(clsRes.data);
            // On exclut les adultes et les inactifs
            setChildren(kidsRes.data.filter(c => c.active !== false && c.category !== 'Adulte'));
        } catch (e) { alert("Erreur de chargement des données"); }
    };

    const startAdd = () => setEditingClass({ _id: null, name: '', category: 'Maternelle', teacher: '' });
    const startEdit = (cls) => setEditingClass({ ...cls });

    const saveClass = async (e) => {
        e.preventDefault();
        try {
            if (editingClass._id) {
                await api.put(`/classes/${editingClass._id}`, editingClass);
            } else {
                await api.post('/classes', editingClass);
            }
            setEditingClass(null);
            loadData();
        } catch (e) { alert("Erreur lors de la sauvegarde."); }
    };

    const deleteClass = async (id, name) => {
        if (window.confirm(`Supprimer la classe ${name} ?\n(Elle sera retirée de la fiche des enfants concernés).`)) {
            try {
                await api.delete(`/classes/${id}`);
                loadData();
            } catch (e) { alert("Erreur de suppression."); }
        }
    };

    const handleBulkAbsence = async (e) => {
        e.preventDefault();
        setAbsenceModal(prev => ({ ...prev, isLoading: true }));
        try {
            const classKids = children.filter(c => {
                const childClassId = c.classGroup?._id || c.classGroup;
                return childClassId === absenceModal.classObj._id;
            });
            if (classKids.length === 0) {
                alert("Aucun enfant n'est assigné à cette classe.");
                setAbsenceModal(null); return;
            }
            let successCount = 0;
            for (const kid of classKids) {
                try {
                    await api.post('/attendance/checkin', { childId: kid._id, date: absenceModal.date, sessionType: 'MIDI' });
                    successCount++;
                } catch (err) {}
            }
            alert(`${successCount} enfant(s) sur ${classKids.length} ont été marqués ABSENTS à la cantine avec succès !`);
            setAbsenceModal(null);
        } catch (error) {
            alert("Erreur");
            setAbsenceModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    // 👉 NOUVEAU : Fonction pour AJOUTER un élève à la classe
    const handleAddStudent = async (child) => {
        // Sécurité : Si l'enfant a DÉJÀ une classe différente
        const currentClassId = child.classGroup?._id || child.classGroup;
        if (currentClassId && currentClassId !== manageClassModal._id) {
            const oldClass = classes.find(c => c._id === currentClassId);
            const oldClassName = oldClass ? oldClass.name : 'une autre classe';
            if (!window.confirm(`⚠️ ${child.firstName} est déjà affecté(e) à [${oldClassName}].\nVoulez-vous le/la transférer vers [${manageClassModal.name}] ?`)) {
                return;
            }
        }

        try {
            await api.put(`/children/${child._id}`, { classGroup: manageClassModal._id });
            loadData(); // Recharge les données en arrière-plan
            setSearchStudentText(''); // Vide la barre de recherche
        } catch (e) { alert("Erreur lors de l'ajout de l'élève."); }
    };

    // 👉 NOUVEAU : Fonction pour RETIRER un élève de la classe
    const handleRemoveStudent = async (child) => {
        if (window.confirm(`Retirer ${child.firstName} de la classe ${manageClassModal.name} ?`)) {
            try {
                await api.put(`/children/${child._id}`, { classGroup: null });
                loadData();
            } catch (e) { alert("Erreur lors du retrait de l'élève."); }
        }
    };

    // 👉 NOUVEAU : Fonction Export PDF
    const exportClassPDF = (classObj, studentList) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text(`LISTE D'APPEL : ${classObj.name.toUpperCase()}`, 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Catégorie : ${classObj.category}`, 14, 28);
        doc.text(`Enseignant(e) : ${classObj.teacher || 'Non renseigné(e)'}`, 14, 34);
        doc.text(`Effectif : ${studentList.length} élève(s)`, 180, 28, { align: 'right' });
        doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 180, 34, { align: 'right' });

        const tableColumn = ["Nom", "Prénom", "Présent(e)"];
        const tableRows = studentList.sort((a, b) => a.lastName.localeCompare(b.lastName)).map(student => [
            student.lastName,
            student.firstName,
            "" // Colonne vide pour cocher au stylo
        ]);

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 11, cellPadding: 4 },
        });

        doc.save(`Classe_${classObj.name.replace(/ /g, '_')}.pdf`);
    };

    // Calculs pour la modale de gestion
    const currentClassStudents = manageClassModal 
        ? children.filter(c => (c.classGroup?._id || c.classGroup) === manageClassModal._id).sort((a, b) => a.lastName.localeCompare(b.lastName))
        : [];

    const searchResults = searchStudentText.length >= 2
        ? children.filter(c => 
            (c.lastName.toLowerCase().includes(searchStudentText.toLowerCase()) || c.firstName.toLowerCase().includes(searchStudentText.toLowerCase())) &&
            (c.classGroup?._id || c.classGroup) !== manageClassModal._id && // Exclure ceux DÉJÀ dans la classe
            c.category === manageClassModal.category // On ne cherche que dans la même catégorie (Mat/Elem)
          )
        : [];

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-4xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><GraduationCap className="text-car-blue w-8 h-8"/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Classes Scolaires</h1>
                            <p className="text-slate-500 font-medium mt-1">Gestion des classes, effectifs et enseignants</p>
                        </div>
                    </div>
                    <button onClick={startAdd} className="bg-car-blue text-white font-bold px-4 py-3 rounded-xl shadow-md shadow-car-blue/20 flex items-center gap-2 hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs">
                        <Plus size={18}/> Créer une classe
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Colonne Maternelle */}
                    <div>
                        <h2 className="font-black text-car-dark uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Maternelle</h2>
                        <div className="space-y-3">
                            {classes.filter(c => c.category === 'Maternelle').map(cls => {
                                const count = children.filter(kid => (kid.classGroup?._id || kid.classGroup) === cls._id).length;
                                return (
                                <div key={cls._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-black text-car-dark text-lg flex items-center gap-2">
                                            {cls.name} <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{count} élève(s)</span>
                                        </h3>
                                        <p className="text-sm font-bold text-slate-400">{cls.teacher || 'Enseignant non renseigné'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setManageClassModal(cls)} className="p-2 text-slate-400 hover:text-car-purple bg-slate-50 rounded-lg" title="Gérer les élèves de la classe"><Users size={18}/></button>
                                        <button onClick={() => setAbsenceModal({ classObj: cls, date: new Date().toISOString().split('T')[0], isLoading: false })} className="p-2 text-slate-400 hover:text-car-teal bg-slate-50 rounded-lg" title="Déclarer la classe absente (Sortie)"><Utensils size={18}/></button>
                                        <button onClick={() => startEdit(cls)} className="p-2 text-slate-400 hover:text-car-yellow bg-slate-50 rounded-lg" title="Modifier la classe"><Pencil size={18}/></button>
                                        <button onClick={() => deleteClass(cls._id, cls.name)} className="p-2 text-slate-400 hover:text-car-pink bg-slate-50 rounded-lg" title="Supprimer"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                    {/* Colonne Élémentaire */}
                    <div>
                        <h2 className="font-black text-car-dark uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Élémentaire</h2>
                        <div className="space-y-3">
                            {classes.filter(c => c.category === 'Élémentaire').map(cls => {
                                const count = children.filter(kid => (kid.classGroup?._id || kid.classGroup) === cls._id).length;
                                return (
                                <div key={cls._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-black text-car-dark text-lg flex items-center gap-2">
                                            {cls.name} <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{count} élève(s)</span>
                                        </h3>
                                        <p className="text-sm font-bold text-slate-400">{cls.teacher || 'Enseignant non renseigné'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setManageClassModal(cls)} className="p-2 text-slate-400 hover:text-car-purple bg-slate-50 rounded-lg" title="Gérer les élèves de la classe"><Users size={18}/></button>
                                        <button onClick={() => setAbsenceModal({ classObj: cls, date: new Date().toISOString().split('T')[0], isLoading: false })} className="p-2 text-slate-400 hover:text-car-teal bg-slate-50 rounded-lg" title="Déclarer la classe absente (Sortie)"><Utensils size={18}/></button>
                                        <button onClick={() => startEdit(cls)} className="p-2 text-slate-400 hover:text-car-yellow bg-slate-50 rounded-lg" title="Modifier la classe"><Pencil size={18}/></button>
                                        <button onClick={() => deleteClass(cls._id, cls.name)} className="p-2 text-slate-400 hover:text-car-pink bg-slate-50 rounded-lg" title="Supprimer"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            </div>

            {/* 👉 NOUVEAU : MODALE GESTION DES ÉLÈVES (REMPLISSAGE CLASSE) */}
            {manageClassModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4 shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-car-purple flex items-center gap-2">
                                    <Users size={24}/> Effectif : {manageClassModal.name}
                                </h3>
                                <p className="text-sm font-bold text-slate-500">{manageClassModal.teacher || 'Sans enseignant'} • {currentClassStudents.length} élève(s)</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => exportClassPDF(manageClassModal, currentClassStudents)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-car-blue hover:bg-car-blue/10 transition-colors" title="Télécharger liste PDF"><FileText size={20}/></button>
                                <button onClick={() => {setManageClassModal(null); setSearchStudentText('');}} className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-car-pink transition-colors"><X size={20}/></button>
                            </div>
                        </div>
                        
                        {/* Barre de recherche et ajout */}
                        <div className="relative mb-6 shrink-0 bg-car-purple/5 p-4 rounded-2xl border border-car-purple/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Search className="text-car-purple" size={16}/>
                                <label className="text-xs font-bold text-car-purple uppercase tracking-widest">Ajouter un élève (Même catégorie) :</label>
                            </div>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-car-purple outline-none font-bold text-car-dark text-sm" 
                                placeholder="Rechercher par prénom ou nom..." 
                                value={searchStudentText} 
                                onChange={e => setSearchStudentText(e.target.value)} 
                            />
                            
                            {searchStudentText.length >= 2 && (
                                <div className="absolute w-full left-0 mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 max-h-60 overflow-y-auto z-20">
                                    {searchResults.map(c => (
                                        <div key={c._id} className="p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <span className="font-bold text-car-dark uppercase">{c.lastName} <span className="font-medium capitalize text-slate-500">{c.firstName}</span></span>
                                                {c.classGroup && (
                                                    <span className="ml-2 text-[10px] text-orange-600 bg-orange-50 font-bold px-2 py-0.5 rounded-md">Déjà en: {c.classGroup.name || 'Autre'}</span>
                                                )}
                                            </div>
                                            <button onClick={() => handleAddStudent(c)} className="bg-car-purple text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform">+ Ajouter</button>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && <div className="p-4 text-center text-slate-400 text-xs font-bold italic">Aucun élève trouvé.</div>}
                                </div>
                            )}
                        </div>

                        {/* Liste des élèves de la classe */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {currentClassStudents.map(student => (
                                <div key={student._id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                                    <span className="font-bold text-car-dark uppercase text-sm">{student.lastName} <span className="font-medium text-slate-500 capitalize">{student.firstName}</span></span>
                                    <button onClick={() => handleRemoveStudent(student)} className="text-slate-300 hover:text-car-pink p-2 bg-white rounded-lg shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Retirer de la classe"><UserMinus size={16}/></button>
                                </div>
                            ))}
                            {currentClassStudents.length === 0 && (
                                <div className="text-center p-8 text-slate-400 font-bold italic border-2 border-dashed border-slate-200 rounded-2xl">Cette classe est vide.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE D'ABSENCE CANTINE */}
            {absenceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleBulkAbsence} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-teal flex items-center gap-2"><Utensils size={24}/> Absence Cantine</h3>
                            <button type="button" onClick={() => setAbsenceModal(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        <div className="space-y-6 mb-8">
                            <div className="bg-car-teal/10 border border-car-teal/20 p-4 rounded-xl flex gap-3 text-car-teal">
                                <AlertTriangle size={24} className="shrink-0"/>
                                <p className="text-sm font-medium">Vous allez marquer <span className="font-black uppercase">{absenceModal.classObj.name}</span> absente à la cantine.</p>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-2">Date de l'absence</label>
                                <input type="date" required className="w-full bg-slate-50 p-4 rounded-xl font-black text-car-dark outline-none border border-slate-200 focus:border-car-teal" value={absenceModal.date} onChange={e => setAbsenceModal({...absenceModal, date: e.target.value})} />
                            </div>
                        </div>
                        <button type="submit" disabled={absenceModal.isLoading} className="w-full bg-car-teal text-white font-black p-4 rounded-2xl hover:bg-teal-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                            {absenceModal.isLoading ? <Loader className="animate-spin" size={20}/> : <><Check size={20}/> VALIDER L'ABSENCE</>}
                        </button>
                    </form>
                </div>
            )}

            {/* MODAL CRÉATION / ÉDITION */}
            {editingClass && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveClass} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-dark">{editingClass._id ? 'Modifier' : 'Créer'} la classe</h3>
                            <button type="button" onClick={() => setEditingClass(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink" aria-label="Fermer le formulaire"><X size={24} aria-hidden="true"/></button>
                        </div>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Niveau</label>
                                <select className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200" value={editingClass.category} onChange={e => setEditingClass({...editingClass, category: e.target.value})}>
                                    <option value="Maternelle">Maternelle</option>
                                    <option value="Élémentaire">Élémentaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Nom de la classe</label>
                                <input type="text" required placeholder="Ex: CP 1 ou M. Dupont" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-blue" value={editingClass.name} onChange={e => setEditingClass({...editingClass, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Enseignant (Optionnel)</label>
                                <input type="text" placeholder="Ex: Mme Sophie MARTIN" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-blue" value={editingClass.teacher} onChange={e => setEditingClass({...editingClass, teacher: e.target.value})} />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-car-blue text-white font-black p-4 rounded-2xl hover:bg-blue-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                            <Check size={20}/> Enregistrer
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ClassManager;