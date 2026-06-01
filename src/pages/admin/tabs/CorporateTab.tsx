import React, { useState, useEffect } from 'react';
import { aboutService } from '../../../services/aboutService';
import WysiwygEditor from '../../../components/WysiwygEditor';
import { useCapability } from '../../../hooks/useCapability';

export default function CorporateTab() {
    const canManage = useCapability('admin.about_page_manage');
    const [aboutSections, setAboutSections] = useState<any[]>([]);
    const [aboutLoading, setAboutLoading] = useState(false);
    const [aboutForm, setAboutForm] = useState({ id: 0, title: '', content: '', orderIndex: 0, isActive: true });
    const [aboutEditing, setAboutEditing] = useState(false);
    const [aboutSaveStatus, setAboutSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        fetchAboutSections();
    }, []);

    const fetchAboutSections = async () => {
        setAboutLoading(true);
        try {
            const res = await aboutService.getAll();
            if (res.data?.success) setAboutSections(res.data.data);
        } catch (err) {
            console.error('Hakkımızda bölümleri çekilemedi:', err);
        } finally {
            setAboutLoading(false);
        }
    };

    const handleAboutEdit = (section: any) => {
        setAboutForm({
            id: section.id,
            title: section.title,
            content: section.content,
            orderIndex: section.orderIndex,
            isActive: section.isActive,
        });
        setAboutEditing(true);
    };

    const handleAboutNew = () => {
        setAboutForm({ id: 0, title: '', content: '', orderIndex: aboutSections.length + 1, isActive: true });
        setAboutEditing(false);
    };

    const handleAboutSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setAboutSaveStatus(null);
        try {
            const data = { ...aboutForm };
            const res = aboutEditing
                ? await aboutService.update(data)
                : await aboutService.add(data);
            if (res.data?.success) {
                setAboutSaveStatus({ type: 'success', message: aboutEditing ? 'Bölüm güncellendi!' : 'Bölüm eklendi!' });
                fetchAboutSections();
                handleAboutNew();
            } else {
                setAboutSaveStatus({ type: 'error', message: res.data?.message || 'Bir hata oluştu.' });
            }
        } catch (err: any) {
            setAboutSaveStatus({ type: 'error', message: err.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    const handleAboutDelete = async (id: number) => {
        if (!window.confirm('Bu bölümü silmek istediğinize emin misiniz?')) return;
        try {
            const res = await aboutService.delete(id);
            if (res.data?.success) fetchAboutSections();
        } catch (err) {
            console.error('Silme başarısız:', err);
        }
    };

    return (
        <div className="p-6 md:p-10 animate-fade-in space-y-8 max-w-6xl">
            <div className="mb-2">
                <h1 className="text-2xl font-black text-slate-900">Kurumsal (Hakkımızda)</h1>
                <p className="text-slate-500 text-sm mt-1">Site hakkımızda sayfasının bölümlerini yönetin.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left: section list */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800">Mevcut Bölümler</h3>
                            {canManage && <button
                                onClick={handleAboutNew}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm active:scale-95"
                            >
                                + Yeni Bölüm
                            </button>}
                        </div>

                        {aboutLoading ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-xl" />
                                ))}
                            </div>
                        ) : aboutSections.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📄</div>
                                <p className="text-slate-400 font-medium">Henüz hiç bölüm eklenmemiş.</p>
                                <p className="text-slate-300 text-sm mt-1">Yeni bölüm ekleyerek Hakkımızda sayfasını oluşturun.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Başlık</th>
                                            <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sıra</th>
                                            <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktif</th>
                                            <th className="text-right py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aboutSections.map((section: any) => (
                                            <tr key={section.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                                                <td className="py-3 px-3">
                                                    <span className="font-bold text-slate-700">{section.title}</span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                                                        {section.orderIndex}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {section.isActive ? (
                                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">Aktif</span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500">Pasif</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canManage && <button
                                                            onClick={() => handleAboutEdit(section)}
                                                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                                        >
                                                            Düzenle
                                                        </button>}
                                                        {canManage && <button
                                                            onClick={() => handleAboutDelete(section.id)}
                                                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                                        >
                                                            Sil
                                                        </button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: add/edit form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 p-6 sticky top-6">
                        <h3 className="text-lg font-black text-slate-800 mb-6">
                            {aboutEditing ? 'Bölümü Düzenle' : 'Yeni Bölüm Ekle'}
                        </h3>

                        {aboutSaveStatus && (
                            <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${aboutSaveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {aboutSaveStatus.message}
                            </div>
                        )}

                        <form onSubmit={handleAboutSave} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Başlık</label>
                                <input
                                    type="text"
                                    required
                                    value={aboutForm.title}
                                    onChange={e => setAboutForm({ ...aboutForm, title: e.target.value })}
                                    className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                                    placeholder="Örn: Vizyonumuz"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sıra No</label>
                                    <input
                                        type="number"
                                        required
                                        value={aboutForm.orderIndex}
                                        onChange={e => setAboutForm({ ...aboutForm, orderIndex: parseInt(e.target.value) })}
                                        className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                                    />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={aboutForm.isActive}
                                            onChange={e => setAboutForm({ ...aboutForm, isActive: e.target.checked })}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Aktif</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">İçerik (Markdown)</label>
                                <WysiwygEditor
                                    value={aboutForm.content}
                                    onChange={(md) => setAboutForm({ ...aboutForm, content: md })}
                                    height={300}
                                    placeholder="Bölüm içeriğini buraya yazın..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleAboutNew}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
                                >
                                    İptal
                                </button>
                                {canManage && <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95"
                                >
                                    {aboutEditing ? 'Güncelle' : 'Kaydet'}
                                </button>}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
