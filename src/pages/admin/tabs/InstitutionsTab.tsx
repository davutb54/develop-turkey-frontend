import React, { useState, useEffect } from 'react';
import { institutionService } from '../../../services/institutionService';
import { useNavigate } from 'react-router-dom';
import type { Institution } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

// Inline helper — only used in this tab
const TagListManager = ({
    label,
    items,
    onAdd,
    onRemove,
    colorClass,
    placeholder = 'Ekle...',
}: {
    label: string;
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (item: string) => void;
    colorClass: string;
    placeholder?: string;
}) => {
    const [newItem, setNewItem] = useState('');
    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <button
                    type="button"
                    onClick={() => { if (newItem.trim()) { onAdd(newItem.trim()); setNewItem(''); } }}
                    className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition active:scale-95 ${colorClass}`}
                >
                    Ekle
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.map((item, idx) => (
                    <span key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                        {item}
                        <button type="button" onClick={() => onRemove(item)} className="text-slate-400 hover:text-red-500 transition-colors font-black">×</button>
                    </span>
                ))}
                {items.length === 0 && <span className="text-[10px] text-slate-400 font-bold italic">Liste boş</span>}
            </div>
        </div>
    );
};

const emptyInst: Institution = {
    name: '', subtitle: '', domain: '', logoUrl: '', primaryColor: '#2563eb',
    customFieldsJson: '[]', customHierarchyLabel: '', customHierarchyJson: '[]', status: true,
};

export default function InstitutionsTab() {
    const canCreate     = useCapability('admin.institution_create');
    const canUpdate     = useCapability('admin.institution_update');
    const canDeactivate = useCapability('admin.institution_deactivate');
    const navigate = useNavigate();
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [instFormData, setInstFormData] = useState<Institution>(emptyInst);
    const [instLoading, setInstLoading] = useState(false);
    const [instError, setInstError] = useState('');
    const [instSuccess, setInstSuccess] = useState('');
    const [instLogoFile, setInstLogoFile] = useState<File | null>(null);

    // Edit modal
    const [editingInst, setEditingInst] = useState<Institution | null>(null);
    const [editInstData, setEditInstData] = useState<Institution>(emptyInst);
    const [editInstLogo, setEditInstLogo] = useState<File | null>(null);
    const [editInstError, setEditInstError] = useState('');

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await institutionService.getAll();
            if (res.data.success) setInstitutions(res.data.data);
        } catch (err) { console.error('Kurumlar yüklenemedi', err); }
        finally { setLoading(false); }
    };

    const handleInstChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const { name, value } = target;
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            setInstFormData(prev => ({ ...prev, [name]: (target as HTMLInputElement).checked }));
            return;
        }
        setInstFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateIpList = (type: 'WhitelistIps' | 'BlacklistIps', newIps: string[], isEdit: boolean) => {
        const currentData = isEdit ? editInstData : instFormData;
        const setFunction = isEdit ? setEditInstData : setInstFormData;

        let jsonObj: any = {};
        try {
            const raw = currentData.customFieldsJson || '{}';
            jsonObj = JSON.parse(raw === '[]' ? '{}' : raw);
            if (Array.isArray(jsonObj)) jsonObj = {};
        } catch { jsonObj = {}; }

        jsonObj[type] = newIps;
        setFunction((prev: any) => ({ ...prev, customFieldsJson: JSON.stringify(jsonObj) }));
    };

    const handleAddInstitution = async (e: React.FormEvent) => {
        e.preventDefault();
        setInstLoading(true); setInstError(''); setInstSuccess('');
        if (!instFormData.name || !instFormData.domain) {
            setInstError('Kurum adı ve Domain zorunludur.'); setInstLoading(false); return;
        }
        const formData = new FormData();
        formData.append('Name', instFormData.name);
        formData.append('Subtitle', instFormData.subtitle || '');
        formData.append('Domain', instFormData.domain);
        formData.append('PrimaryColor', instFormData.primaryColor || '#2563eb');
        formData.append('CustomFieldsJson', instFormData.customFieldsJson || '[]');
        formData.append('CustomHierarchyLabel', instFormData.customHierarchyLabel || '');
        formData.append('CustomHierarchyJson', instFormData.customHierarchyJson || '[]');
        formData.append('Status', instFormData.status.toString());
        if (instLogoFile) formData.append('Logo', instLogoFile);
        try {
            const response = await institutionService.add(formData);
            if (response.data.success) {
                setInstSuccess(`${instFormData.name} başarıyla eklendi!`);
                setInstFormData(emptyInst);
                setInstLogoFile(null);
                load();
            } else {
                setInstError(response.data.message || 'Kurum eklenirken hata oluştu.');
            }
        } catch (err: any) {
            let errMsg = 'Kurum eklenirken hata.';
            if (err.response?.data) {
                if (typeof err.response.data === 'string') errMsg = err.response.data;
                else if (err.response.data.message) errMsg = err.response.data.message;
                else if (err.response.data.errors) errMsg = Object.values(err.response.data.errors).flat().join('\n');
            }
            setInstError(errMsg);
        } finally { setInstLoading(false); }
    };

    const handleToggleInstitutionStatus = async (inst: Institution) => {
        if (inst.id === 1) { alert("Sistemin ana ağı pasife alınamaz!"); return; }
        const actionText = inst.status ? 'pasife almak' : 'aktif etmek';
        if (!window.confirm(`'${inst.name}' ağını ${actionText} istediğinize emin misiniz?`)) return;
        try {
            const formData = new FormData();
            formData.append('Id', inst.id!.toString());
            formData.append('Name', inst.name);
            formData.append('Subtitle', inst.subtitle || '');
            formData.append('Domain', inst.domain);
            formData.append('Status', (!inst.status).toString());
            if (inst.primaryColor) formData.append('PrimaryColor', inst.primaryColor);
            if (inst.logoUrl) formData.append('ExistingLogoUrl', inst.logoUrl);
            formData.append('CustomFieldsJson', inst.customFieldsJson || '[]');
            await institutionService.update(formData);
            load();
        } catch { alert('Kurum durumu güncellenemedi.'); }
    };

    const handleUpdateInst = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInst) return;
        const formData = new FormData();
        formData.append('Id', editingInst.id!.toString());
        formData.append('Name', editInstData.name);
        formData.append('Subtitle', editInstData.subtitle || '');
        formData.append('Domain', editInstData.domain);
        formData.append('PrimaryColor', editInstData.primaryColor || '#4f46e5');
        formData.append('CustomFieldsJson', editInstData.customFieldsJson || '[]');
        formData.append('CustomHierarchyLabel', editInstData.customHierarchyLabel || '');
        formData.append('CustomHierarchyJson', editInstData.customHierarchyJson || '[]');
        formData.append('Status', editInstData.status.toString());
        if (editingInst.logoUrl) formData.append('ExistingLogoUrl', editingInst.logoUrl);
        if (editInstLogo) formData.append('Logo', editInstLogo);
        try {
            setEditInstError('');
            const result = await institutionService.update(formData);
            if (result.data.success) {
                setEditingInst(null);
                load();
                alert('Kurum başarıyla güncellendi!');
            } else {
                setEditInstError(result.data.message || 'Kurum güncellenemedi.');
            }
        } catch (err: any) {
            let errMsg = 'Kurum güncellenemedi.';
            if (err.response?.data) {
                if (typeof err.response.data === 'string') errMsg = err.response.data;
                else if (err.response.data.message) errMsg = err.response.data.message;
                else if (err.response.data.errors) errMsg = Object.values(err.response.data.errors).flat().join('\n');
            }
            setEditInstError(errMsg);
        }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col gap-8">
            <div className="mb-2">
                <h1 className="text-2xl font-black text-slate-900">Kurumlar (Ağlar)</h1>
                <p className="text-slate-500 text-sm mt-1">Üniversite ve kurumsal ağları yönetin.</p>
            </div>

            {/* Add Form */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-4">Yeni Kurum (Üniversite) Ekle</h3>
                <form onSubmit={handleAddInstitution} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Adı</label>
                            <input type="text" name="name" required value={instFormData.name} onChange={handleInstChange} placeholder="Örn: Eskişehir Teknik Üniversitesi" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Altyazı (Navbar Alt Yazı)</label>
                            <input type="text" name="subtitle" value={instFormData.subtitle || ''} onChange={handleInstChange} placeholder="Örn: Özel Kurum Ağı" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mail Domain'i</label>
                            <input type="text" name="domain" required value={instFormData.domain} onChange={handleInstChange} placeholder="Örn: eskisehir.edu.tr" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Logosu (Dosya Seçin)</label>
                            <input type="file" accept="image/*" onChange={e => setInstLogoFile(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tema Rengi</label>
                            <div className="flex items-center gap-2">
                                <input type="color" name="primaryColor" value={instFormData.primaryColor || '#2563eb'} onChange={handleInstChange} className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer bg-white" />
                                <input type="text" name="primaryColor" value={instFormData.primaryColor || ''} onChange={handleInstChange} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-black text-indigo-900">Özellik ve Modül Yönetimi</div>
                                <div className="text-xs text-indigo-700">Özellikleri artık merkezi "Modüller" sayfasından yönetebilirsiniz.</div>
                            </div>
                            <button type="button" onClick={() => navigate('/admin/features')} className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-indigo-700 transition">
                                Modüllere Git
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2">Özel Hiyerarşi (Bölüm/Şube)</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Hiyerarşi Başlığı</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Fakülteler, Şubeler..."
                                    value={instFormData.customHierarchyLabel || ''}
                                    onChange={(e) => setInstFormData(prev => ({ ...prev, customHierarchyLabel: e.target.value }))}
                                    className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                />
                            </div>
                            <TagListManager
                                label="Hiyerarşi Değerleri"
                                placeholder="Örn: Mühendislik Fakültesi"
                                items={(() => { try { return JSON.parse(instFormData.customHierarchyJson || '[]'); } catch { return []; } })()}
                                onAdd={(item) => {
                                    const current = (() => { try { return JSON.parse(instFormData.customHierarchyJson || '[]'); } catch { return []; } })();
                                    if (!current.includes(item)) setInstFormData(prev => ({ ...prev, customHierarchyJson: JSON.stringify([...current, item]) }));
                                }}
                                onRemove={(item) => {
                                    const current = (() => { try { return JSON.parse(instFormData.customHierarchyJson || '[]'); } catch { return []; } })();
                                    setInstFormData(prev => ({ ...prev, customHierarchyJson: JSON.stringify(current.filter((i: string) => i !== item)) }));
                                }}
                                colorClass="bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-5 space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2 flex items-center gap-2">
                            IP Güvenlik Ayarları (Whitelist &amp; Blacklist)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TagListManager
                                label="İzinli IP'ler (Whitelist)"
                                placeholder="Örn: 127.0.0.1"
                                items={(() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })()}
                                onAdd={(ip) => {
                                    const current = (() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })();
                                    if (!current.includes(ip)) handleUpdateIpList('WhitelistIps', [...current, ip], false);
                                }}
                                onRemove={(ip) => {
                                    const current = (() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })();
                                    handleUpdateIpList('WhitelistIps', current.filter((i: string) => i !== ip), false);
                                }}
                                colorClass="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                            />
                            <TagListManager
                                label="Yasaklı IP'ler (Blacklist)"
                                placeholder="Örn: 127.0.0.1"
                                items={(() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })()}
                                onAdd={(ip) => {
                                    const current = (() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })();
                                    if (!current.includes(ip)) handleUpdateIpList('BlacklistIps', [...current, ip], false);
                                }}
                                onRemove={(ip) => {
                                    const current = (() => { try { const r = instFormData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })();
                                    handleUpdateIpList('BlacklistIps', current.filter((i: string) => i !== ip), false);
                                }}
                                colorClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input id="inst-status" type="checkbox" name="status" checked={instFormData.status} onChange={handleInstChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                        <label htmlFor="inst-status" className="text-sm font-bold text-slate-700">Kurum Aktif (Kayıt Olunabilir)</label>
                    </div>
                    {instError && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 mt-2">{instError}</div>}
                    {instSuccess && <div className="text-green-600 text-xs font-bold bg-green-50 p-3 rounded-xl border border-green-100 mt-2">{instSuccess}</div>}
                    <div className="pt-2 flex justify-end">
                        {canCreate && <button type="submit" disabled={instLoading} className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition">
                            {instLoading ? 'Ekleniyor...' : 'Kurumu Ekle'}
                        </button>}
                    </div>
                </form>
            </div>

            {/* Institutions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm max-h-[500px] overflow-y-auto bg-slate-50/50">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Kurum Adı</th>
                            <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Domain</th>
                            <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Renk &amp; Durum</th>
                            <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {institutions.map(inst => (
                            <tr key={inst.id} className="hover:bg-indigo-50/30 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {inst.logoUrl ? (
                                            <img src={inst.logoUrl} alt={inst.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm bg-white p-0.5" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500">{inst.name.charAt(0)}</div>
                                        )}
                                        <span className="font-bold text-slate-800">{inst.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">@{inst.domain}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: inst.primaryColor || '#2563eb' }}></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{inst.primaryColor || '#2563eb'}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${inst.status ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                            {inst.status ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {canUpdate && <button
                                            onClick={() => {
                                                setEditInstError('');
                                                setEditingInst(inst);
                                                setEditInstData({
                                                    id: inst.id, name: inst.name, subtitle: inst.subtitle || '',
                                                    domain: inst.domain, primaryColor: inst.primaryColor || '#2563eb',
                                                    logoUrl: inst.logoUrl, customFieldsJson: inst.customFieldsJson || '[]',
                                                    customHierarchyLabel: inst.customHierarchyLabel || '',
                                                    customHierarchyJson: inst.customHierarchyJson || '[]', status: inst.status,
                                                });
                                                setEditInstLogo(null);
                                            }}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                                            Düzenle
                                        </button>}
                                        <button
                                            onClick={() => navigate(`/admin/features?instId=${inst.id}`)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100"
                                        >
                                            Özellikler
                                        </button>
                                        {canDeactivate && <button onClick={() => handleToggleInstitutionStatus(inst)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${inst.status ? 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                                            {inst.status ? 'Pasife Al' : 'Aktif Et'}
                                        </button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingInst && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-down border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-4 sticky top-0 bg-white pb-2 z-10">Kurum Düzenle</h3>
                        <form onSubmit={handleUpdateInst} className="space-y-4">
                            {editInstError && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-xl shadow-sm">
                                    <p className="text-sm font-bold text-red-700 whitespace-pre-line">{editInstError}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Adı</label>
                                    <input type="text" required value={editInstData.name} onChange={e => setEditInstData({ ...editInstData, name: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Altyazı</label>
                                    <input type="text" value={editInstData.subtitle || ''} onChange={e => setEditInstData({ ...editInstData, subtitle: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Domain</label>
                                    <input type="text" required value={editInstData.domain} onChange={e => setEditInstData({ ...editInstData, domain: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tema Rengi</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={editInstData.primaryColor || '#4f46e5'} onChange={e => setEditInstData({ ...editInstData, primaryColor: e.target.value })} className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer shadow-sm" />
                                        <input type="text" value={editInstData.primaryColor || ''} onChange={e => setEditInstData({ ...editInstData, primaryColor: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Logo</label>
                                    <div className="flex items-center gap-4">
                                        {editInstData.logoUrl && <img src={editInstData.logoUrl} alt="Logo" className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm" />}
                                        <input type="file" accept="image/*" onChange={e => setEditInstLogo(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 outline-none text-xs bg-slate-50" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-black text-indigo-900">Özellik ve Modül Yönetimi</div>
                                        <div className="text-xs text-indigo-700">Bu kurumun özelliklerini yönetmek için modüller sayfasına gidin.</div>
                                    </div>
                                    <button type="button" onClick={() => navigate(`/admin/features?instId=${editingInst?.id}`)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-indigo-700 transition">
                                        Özelliklere Git
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2">Özel Hiyerarşi</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Hiyerarşi Başlığı</label>
                                        <input type="text" placeholder="Örn: Fakülteler..." value={editInstData.customHierarchyLabel || ''} onChange={(e) => setEditInstData(prev => ({ ...prev, customHierarchyLabel: e.target.value }))} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                                    </div>
                                    <TagListManager
                                        label="Hiyerarşi Değerleri"
                                        placeholder="Örn: Mühendislik Fakültesi"
                                        items={(() => { try { return JSON.parse(editInstData.customHierarchyJson || '[]'); } catch { return []; } })()}
                                        onAdd={(item) => {
                                            const current = (() => { try { return JSON.parse(editInstData.customHierarchyJson || '[]'); } catch { return []; } })();
                                            if (!current.includes(item)) setEditInstData(prev => ({ ...prev, customHierarchyJson: JSON.stringify([...current, item]) }));
                                        }}
                                        onRemove={(item) => {
                                            const current = (() => { try { return JSON.parse(editInstData.customHierarchyJson || '[]'); } catch { return []; } })();
                                            setEditInstData(prev => ({ ...prev, customHierarchyJson: JSON.stringify(current.filter((i: string) => i !== item)) }));
                                        }}
                                        colorClass="bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-5 space-y-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2">IP Güvenlik Ayarları</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TagListManager
                                        label="İzinli IP'ler (Whitelist)"
                                        placeholder="Örn: 127.0.0.1"
                                        items={(() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })()}
                                        onAdd={(ip) => {
                                            const current = (() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })();
                                            if (!current.includes(ip)) handleUpdateIpList('WhitelistIps', [...current, ip], true);
                                        }}
                                        onRemove={(ip) => {
                                            const current = (() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.WhitelistIps || []; } catch { return []; } })();
                                            handleUpdateIpList('WhitelistIps', current.filter((i: string) => i !== ip), true);
                                        }}
                                        colorClass="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                    />
                                    <TagListManager
                                        label="Yasaklı IP'ler (Blacklist)"
                                        placeholder="Örn: 127.0.0.1"
                                        items={(() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })()}
                                        onAdd={(ip) => {
                                            const current = (() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })();
                                            if (!current.includes(ip)) handleUpdateIpList('BlacklistIps', [...current, ip], true);
                                        }}
                                        onRemove={(ip) => {
                                            const current = (() => { try { const r = editInstData.customFieldsJson || '{}'; const o = JSON.parse(r === '[]' ? '{}' : r); return o.BlacklistIps || []; } catch { return []; } })();
                                            handleUpdateIpList('BlacklistIps', current.filter((i: string) => i !== ip), true);
                                        }}
                                        colorClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                                <input type="checkbox" id="instStatus" checked={editInstData.status} onChange={e => setEditInstData({ ...editInstData, status: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="instStatus" className="text-sm font-bold text-slate-700">Kurum Aktif (Sitede Gösterilsin)</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingInst(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                {canUpdate && <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95">Güncelle</button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
