import React from 'react';
import { FolderHeart, CheckCircle, AlertTriangle, Banknote, UploadCloud, Send, Users, GraduationCap, Pencil } from 'lucide-react';

const TabDossier = ({ parentData, editFamily, handleRespChange, handleFamilyDocUpload, submitFamilyChanges, setChildToEdit }) => {
    if (!parentData || !editFamily) return null;

    return (
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
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${parentData.family.dossierComplet ? 'bg-car-green/10 text-car-green' : 'bg-car-pink/10 text-car-pink'}`}>
                        {parentData.family.dossierComplet ? <><CheckCircle size={16}/> DOSSIER COMPLET</> : <><AlertTriangle size={16}/> DOSSIER INCOMPLET</>}
                    </div>
                </div>

                {/* FACTURATION / QF */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col mb-8">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                        <h3 className="font-black text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Facturation & QF (Géré par la mairie)</h3>
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-bold text-xs">Payeur : {parentData.family.payeur || 'Non assigné'}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Revenu Réf. (€)</label>
                                <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-500 text-sm">{parentData.family.revenuReference || '-'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Nb Parts</label>
                                <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-500 text-sm">{parentData.family.nombreParts || '-'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold block mb-1 uppercase text-car-blue">QF Calculé</label>
                                <div className="w-full bg-car-blue/10 border border-car-blue/20 p-3 rounded-xl font-black text-car-blue text-center text-sm">{parentData.family.quotientFamilial || '-'}</div>
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
};

export default TabDossier;