import React, { useState, useEffect } from 'react';
import { topicService } from '../../../services/topicService';
import { institutionService } from '../../../services/institutionService';
import { adminService } from '../../../services/adminService';
import type { Topic, Institution } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

export default function TopicsTab() {
    const canCreate = useCapability('moderation.topic_create');
    const canUpdate = useCapability('moderation.topic_update');
    const canDelete = useCapability('moderation.topic_delete');
    const [topics, setTopics] = useState<Topic[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [topicInstFilter, setTopicInstFilter] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicInstId, setNewTopicInstId] = useState('');
    const [newTopicImage, setNewTopicImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit modal state
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const [editTopicName, setEditTopicName] = useState('');
    const [editTopicInstId, setEditTopicInstId] = useState('');
    const [editTopicImage, setEditTopicImage] = useState<File | null>(null);
    const [editTopicStatus, setEditTopicStatus] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [topicsRes, instRes] = await Promise.all([
                    adminService.getAllTopics(),
                    institutionService.getAll(),
                ]);
                if (topicsRes.data.success) setTopics(topicsRes.data.data);
                if (instRes.data.success) setInstitutions(instRes.data.data);
            } catch (err) { console.error('Kategoriler yüklenemedi', err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const reload = async () => {
        try {
            const [topicsRes, instRes] = await Promise.all([
                adminService.getAllTopics(),
                institutionService.getAll(),
            ]);
            if (topicsRes.data.success) setTopics(topicsRes.data.data);
            if (instRes.data.success) setInstitutions(instRes.data.data);
        } catch (err) { console.error('Yenileme başarısız', err); }
    };

    const filteredTopics = topics.filter(t => {
        if (topicInstFilter === '') return true;
        return t.institutionId?.toString() === topicInstFilter;
    });

    const handleAddTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicName.trim()) return;
        if (!newTopicInstId) { alert('Lütfen kategori için bir kurum seçiniz!'); return; }
        const formData = new FormData();
        formData.append('Name', newTopicName);
        formData.append('InstitutionId', newTopicInstId);
        if (newTopicImage) formData.append('Image', newTopicImage);
        try {
            await topicService.add(formData);
            setNewTopicName('');
            setNewTopicInstId('');
            setNewTopicImage(null);
            reload();
        } catch { alert('Kategori eklenemedi.'); }
    };

    const handleDeleteTopic = async (topic: Topic) => {
        if (!window.confirm(`'${topic.name}' kategorisini silmek istediğinize emin misiniz?`)) return;
        try { await topicService.delete(topic.id); reload(); } catch { alert('Silinemedi.'); }
    };

    const handleToggleTopicStatus = async (topic: Topic) => {
        const actionText = topic.status ? 'pasife almak (gizlemek)' : 'tekrar aktif etmek';
        if (!window.confirm(`'${topic.name}' kategorisini ${actionText} istediğinize emin misiniz?`)) return;
        try {
            const formData = new FormData();
            formData.append('Id', topic.id.toString());
            formData.append('Name', topic.name);
            formData.append('ExistingImageName', topic.imageName);
            formData.append('Status', (!topic.status).toString());
            formData.append('InstitutionId', topic.institutionId?.toString() || '1');
            await topicService.update(formData);
            reload();
        } catch { alert('Durum güncellenemedi.'); }
    };

    const handleUpdateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTopic) return;
        const formData = new FormData();
        formData.append('Id', editingTopic.id.toString());
        formData.append('Name', editTopicName);
        formData.append('ExistingImageName', editingTopic.imageName);
        formData.append('Status', editTopicStatus.toString());
        formData.append('InstitutionId', editTopicInstId || '1');
        if (editTopicImage) formData.append('Image', editTopicImage);
        try {
            await topicService.update(formData);
            setEditingTopic(null);
            reload();
        } catch { alert('Kategori güncellenemedi.'); }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Kategoriler</h1>
                <p className="text-slate-500 text-sm mt-1">Kuruma bağlı kategori / konu etiketlerini yönetin.</p>
            </div>

            <form onSubmit={handleAddTopic} className="mb-8 flex flex-col md:flex-row gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm items-end">
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Kategori Adı</label>
                    <input type="text" placeholder="Örn: Ulaşım Sorunları" required className="w-full border border-slate-200 shadow-sm rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Bağlı Olacağı Kurum</label>
                    <select required className="w-full border border-slate-200 shadow-sm rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium" value={newTopicInstId} onChange={e => setNewTopicInstId(e.target.value)}>
                        <option value="">Kurum Seçin...</option>
                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Görsel (Opsiyonel)</label>
                    <input type="file" accept="image/*" onChange={e => setNewTopicImage(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                {canCreate && <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition">Ekle</button>}
            </form>

            <div className="mb-6 flex justify-end">
                <select className="border border-slate-200 shadow-sm p-3 rounded-xl text-sm bg-white font-bold text-indigo-700" value={topicInstFilter} onChange={e => setTopicInstFilter(e.target.value)}>
                    <option value="">Tüm Kurumların Kategorileri</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTopics.map(topic => {
                    const topicInst = institutions.find(i => i.id === topic.institutionId);
                    return (
                        <div key={topic.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:shadow-md hover:border-indigo-100 transition overflow-hidden flex flex-col relative">
                            <div className="p-5 flex items-center gap-4 flex-1 mt-2">
                                <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: topicInst?.primaryColor || '#4f46e5' }}></div>
                                <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{topicInst?.name || 'Genel Ağ'}</span>

                                {topic.imageName && topic.imageName !== 'default.png' ? (
                                    <img src={`/uploads/topics/${topic.imageName}`} alt={topic.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0 bg-slate-50" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-300 flex items-center justify-center font-black text-xl border border-indigo-100 shrink-0">
                                        {topic.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex flex-col items-start gap-1.5">
                                    <span className="font-bold text-slate-800 text-base leading-tight">{topic.name}</span>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${topic.status ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                        {topic.status ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50 border-t border-slate-100 p-3 flex flex-wrap justify-between gap-2">
                                {canUpdate && <button onClick={() => handleToggleTopicStatus(topic)} className={`flex-1 min-w-[70px] px-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition border shadow-sm ${topic.status ? 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                                    {topic.status ? 'Gizle' : 'Aç'}
                                </button>}
                                {canUpdate && <button onClick={() => {
                                    setEditingTopic(topic);
                                    setEditTopicName(topic.name);
                                    setEditTopicInstId(topic.institutionId?.toString() || '1');
                                    setEditTopicImage(null);
                                    setEditTopicStatus(topic.status);
                                }} className="flex-1 min-w-[70px] px-2 py-2 bg-white text-blue-600 border border-blue-200 font-bold hover:bg-blue-50 text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm">
                                    Düzenle
                                </button>}
                                {canDelete && <button onClick={() => handleDeleteTopic(topic)} className="flex-1 min-w-[70px] px-2 py-2 bg-white text-red-500 border border-red-200 font-bold hover:bg-red-50 text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm">
                                    Sil
                                </button>}
                            </div>
                        </div>
                    );
                })}
                {filteredTopics.length === 0 && (
                    <div className="col-span-full text-center py-16 text-slate-400 font-medium">
                        Bu kuruma ait kategori bulunamadı.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingTopic && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-down border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-4">Kategori Düzenle</h3>
                        <form onSubmit={handleUpdateTopic} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kategori Adı</label>
                                <input type="text" required value={editTopicName} onChange={e => setEditTopicName(e.target.value)} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bağlı Olduğu Kurum</label>
                                <select required value={editTopicInstId} onChange={e => setEditTopicInstId(e.target.value)} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 font-medium text-slate-700">
                                    <option value="">Kurum Seçin...</option>
                                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Yeni Resim (Opsiyonel)</label>
                                <input type="file" accept="image/*" onChange={e => setEditTopicImage(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50" />
                                {editingTopic.imageName && editingTopic.imageName !== 'default.png' && <p className="text-xs text-slate-500 mt-2">Mevcut Resim: {editingTopic.imageName}</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                                <input type="checkbox" id="topicStatus" checked={editTopicStatus} onChange={e => setEditTopicStatus(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="topicStatus" className="text-sm font-bold text-slate-700">Kategori Aktif (Sitede Gösterilsin)</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingTopic(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                {canUpdate && <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95">Kaydet</button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
