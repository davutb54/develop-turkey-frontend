import React, { useState, useEffect } from 'react';
import { featureService } from '../../services/featureService';
import type { FeatureGroup, FeatureDefinition } from '../../types';
import Navbar from '../../components/Navbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../components/Can';
import InstitutionFeaturePanel from './InstitutionFeaturePanel';
import { institutionService } from '../../services/institutionService';

const FeatureManager = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [groups, setGroups] = useState<FeatureGroup[]>([]);
    const [definitions, setDefinitions] = useState<FeatureDefinition[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    // Form States
    const [editingGroup, setEditingGroup] = useState<FeatureGroup | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupOrder, setGroupOrder] = useState(0);

    const [editingDef, setEditingDef] = useState<FeatureDefinition | null>(null);
    const [defKey, setDefKey] = useState('');
    const [defDisplayName, setDefDisplayName] = useState('');
    const [defGroupId, setDefGroupId] = useState(0);
    const [defInputType, setDefInputType] = useState('Boolean');
    const [defDefaultValue, setDefDefaultValue] = useState('');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadData();
    }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [gRes, dRes, iRes] = await Promise.all([
                featureService.getFeatureGroups(),
                featureService.getFeatureDefinitions(),
                institutionService.getAll()
            ]);
            if (gRes.data.success) setGroups(gRes.data.data);
            if (dRes.data.success) setDefinitions(dRes.data.data);
            if (iRes.data.success) {
                setInstitutions(iRes.data.data);
                
                // URL'den instId kontrolü
                const params = new URLSearchParams(location.search);
                const urlInstId = params.get('instId');
                if (urlInstId) {
                    setSelectedInstId(parseInt(urlInstId));
                }
            }
        } catch (err) {
            console.error("Veriler yüklenemedi", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { name: groupName, orderIndex: groupOrder };
        try {
            if (editingGroup) {
                await featureService.updateFeatureGroup({ ...editingGroup, ...payload });
            } else {
                await featureService.addFeatureGroup(payload);
            }
            setEditingGroup(null);
            setGroupName('');
            setGroupOrder(0);
            loadData();
        } catch (err) {
            alert("Grup kaydedilemedi.");
        }
    };

    const handleDeleteGroup = async (id: number) => {
        if (!window.confirm("Bu grubu silmek istediğinize emin misiniz? Altındaki tanımlar etkilenebilir.")) return;
        try {
            await featureService.deleteFeatureGroup(id);
            loadData();
        } catch (err) {
            alert("Grup silinemedi.");
        }
    };

    const handleSaveDef = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            key: defKey,
            displayName: defDisplayName,
            groupId: defGroupId,
            inputType: defInputType,
            defaultValue: defDefaultValue
        };
        try {
            if (editingDef) {
                await featureService.updateFeatureDefinition({ ...editingDef, ...payload });
            } else {
                await featureService.addFeatureDefinition(payload);
            }
            setEditingDef(null);
            setDefKey('');
            setDefDisplayName('');
            setDefInputType('Boolean');
            setDefDefaultValue('');
            loadData();
        } catch (err) {
            alert("Tanım kaydedilemedi.");
        }
    };

    const handleDeleteDef = async (id: number) => {
        if (!window.confirm("Bu tanımı silmek istediğinize emin misiniz?")) return;
        try {
            await featureService.deleteFeatureDefinition(id);
            loadData();
        } catch (err) {
            alert("Tanım silinemedi.");
        }
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Özellik Yönetimi</h1>
                    <button onClick={() => navigate('/admin')} className="text-sm font-bold text-indigo-600 hover:underline">← Admin Panel'e Dön</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* GRUPLAR */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">📁</span>
                            Özellik Grupları
                        </h2>

                        <Can capability="admin.feature_group_manage">
                        <form onSubmit={handleSaveGroup} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Grup Adı</label>
                                    <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Sıra No</label>
                                    <input type="number" value={groupOrder} onChange={e => setGroupOrder(parseInt(e.target.value))} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl text-sm shadow-md hover:bg-indigo-700 transition">
                                    {editingGroup ? 'Güncelle' : 'Grup Ekle'}
                                </button>
                                {editingGroup && (
                                    <button type="button" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupOrder(0); }} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm">İptal</button>
                                )}
                            </div>
                        </form>
                        </Can>

                        <div className="space-y-3">
                            {groups.sort((a, b) => a.orderIndex - b.orderIndex).map(group => (
                                <div key={group.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition shadow-sm">
                                    <div>
                                        <div className="font-bold text-slate-800">{group.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sıra: {group.orderIndex}</div>
                                    </div>
                                    <Can capability="admin.feature_group_manage">
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingGroup(group); setGroupName(group.name); setGroupOrder(group.orderIndex); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">✏️</button>
                                            <button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">🗑️</button>
                                        </div>
                                    </Can>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TANIMLAR */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">⚙️</span>
                            Özellik Tanımları
                        </h2>

                        <Can capability="admin.feature_definition_manage">
                        <form onSubmit={handleSaveDef} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Key (Kod Adı)</label>
                                    <input type="text" value={defKey} onChange={e => setDefKey(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Orn: Content_AllowMap" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Görünen Ad</label>
                                    <input type="text" value={defDisplayName} onChange={e => setDefDisplayName(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Orn: Harita Kullanımı" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Grup</label>
                                    <select value={defGroupId} onChange={e => setDefGroupId(parseInt(e.target.value))} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value={0}>Grup Seçin...</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Girdi Tipi (InputType)</label>
                                    <select value={defInputType} onChange={e => setDefInputType(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="Boolean">Boolean (Toggle)</option>
                                        <option value="Text">Text</option>
                                        <option value="Number">Number</option>
                                        <option value="Color">Color</option>
                                        <option value="Select">Select</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Varsayılan Değer</label>
                                    <input type="text" value={defDefaultValue} onChange={e => setDefDefaultValue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Orn: true veya #ffffff" />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm shadow-md hover:bg-emerald-700 transition">
                                    {editingDef ? 'Güncelle' : 'Tanım Ekle'}
                                </button>
                                {editingDef && (
                                    <button type="button" onClick={() => { setEditingDef(null); setDefKey(''); setDefDisplayName(''); setDefInputType('Boolean'); setDefDefaultValue(''); }} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm">İptal</button>
                                )}
                            </div>
                        </form>
                        </Can>

                        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                            {definitions.map(def => {
                                const group = groups.find(g => g.id === def.groupId);
                                return (
                                    <div key={def.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-100 transition shadow-sm group relative">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-800">{def.displayName}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{def.key}</div>
                                                <div className="mt-1 flex gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{def.inputType}</span>
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[9px] font-bold uppercase">{group?.name || 'Grup Yok'}</span>
                                                </div>
                                            </div>
                                            <Can capability="admin.feature_definition_manage">
                                                <div className="flex gap-2">
                                                    <button onClick={() => {
                                                        setEditingDef(def);
                                                        setDefKey(def.key);
                                                        setDefDisplayName(def.displayName);
                                                        setDefGroupId(def.groupId);
                                                        setDefInputType(def.inputType);
                                                        setDefDefaultValue(def.defaultValue);
                                                    }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">✏️</button>
                                                    <button onClick={() => handleDeleteDef(def.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">🗑️</button>
                                                </div>
                                            </Can>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* KURUM ÖZELLİK AYARLARI */}
                <div className="mt-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <span className="p-2 bg-violet-50 text-violet-600 rounded-xl">🏛️</span>
                                Kurum Özellik Ayarları
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Belirli bir kurumun (ağın) özelliklerini ve modüllerini buradan yönetebilirsiniz.
                            </p>
                        </div>
                        
                        <div className="min-w-[300px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Yönetilecek Kurumu Seçin</label>
                            <select 
                                value={selectedInstId} 
                                onChange={e => setSelectedInstId(parseInt(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                            >
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name} {inst.id === 1 ? '(Ana Sistem)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <InstitutionFeaturePanel 
                        institutionId={selectedInstId} 
                        institutionName={institutions.find(i => i.id === selectedInstId)?.name} 
                    />
                </div>
            </div>
        </div>
    );
};

export default FeatureManager;
