import React, { useState, useEffect, useCallback } from 'react';
import { featureService } from '../../services/featureService';
import { useCapability } from '../../hooks/useCapability';
import type { FeatureGroup, FeatureDefinition } from '../../types';

interface InstitutionFeaturePanelProps {
  institutionId: number;
  institutionName?: string;
}

const InstitutionFeaturePanel: React.FC<InstitutionFeaturePanelProps> = ({
  institutionId,
  institutionName,
}) => {
  const canWrite = useCapability('admin.institution_feature_write');
  const [groups, setGroups] = useState<FeatureGroup[]>([]);
  const [definitions, setDefinitions] = useState<FeatureDefinition[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [gRes, dRes, fRes] = await Promise.all([
        featureService.getFeatureGroups(),
        featureService.getFeatureDefinitions(),
        featureService.getInstitutionFeatures(institutionId),
      ]);

      if (gRes.data.success) {
        const sortedGroups = [...gRes.data.data].sort((a: FeatureGroup, b: FeatureGroup) => a.orderIndex - b.orderIndex);
        setGroups(sortedGroups);
        if (sortedGroups.length > 0) setActiveGroup(sortedGroups[0].id);
      }
      if (dRes.data.success) setDefinitions(dRes.data.data);
      if (fRes.data.success) setCurrentValues(fRes.data.data || {});
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setLoadError('Bu kurumun feature ayarlarını görüntüleme yetkiniz yok (admin.institution_feature_write gerekli).');
      } else {
        setLoadError('Veriler yüklenemedi. Lütfen sayfayı yenileyin.');
      }
      console.error('Veriler yüklenemedi', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEffectiveValue = (def: FeatureDefinition): string => {
    if (pendingChanges[def.key] !== undefined) return pendingChanges[def.key];
    if (currentValues[def.key] !== undefined) return currentValues[def.key];
    return def.defaultValue;
  };

  const handleChange = (key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setSaving(true);
    try {
      await featureService.setInstitutionFeaturesBulk(institutionId, pendingChanges);
      setCurrentValues(prev => ({ ...prev, ...pendingChanges }));
      setPendingChanges({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Değişiklikler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingChanges({});
  };

  const renderInput = (def: FeatureDefinition) => {
    const value = getEffectiveValue(def);
    const isDisabled = def.isSystemLevel && !canWrite;

    if (def.inputType === 'Boolean') {
      const isEnabled = value === 'true';
      return (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => !isDisabled && handleChange(def.key, isEnabled ? 'false' : 'true')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            isEnabled ? 'bg-indigo-600' : 'bg-slate-200'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    }

    if (def.inputType === 'Number') {
      return (
        <input
          type="number"
          value={value}
          disabled={isDisabled}
          onChange={e => handleChange(def.key, e.target.value)}
          className={`w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
            isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
          }`}
        />
      );
    }

    if (def.inputType === 'Select' && def.optionsJson) {
      let options: string[] = [];
      try { options = JSON.parse(def.optionsJson); } catch {}
      const visibilityLabels: Record<string, string> = {
        closed: 'Kapalı',
        public: 'Herkese Açık',
        admin_only: 'Sadece Yöneticilere',
        admin_and_owner: 'Yönetici ve İçerik Sahibine',
        owner_only: 'Sadece İçerik Sahibine',
      };
      return (
        <select
          value={value}
          disabled={isDisabled}
          onChange={e => handleChange(def.key, e.target.value)}
          className={`border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>
              {visibilityLabels[opt] ?? opt}
            </option>
          ))}
        </select>
      );
    }

    if (def.inputType === 'Color') {
      return (
        <input
          type="color"
          value={value || '#6366f1'}
          disabled={isDisabled}
          onChange={e => handleChange(def.key, e.target.value)}
          className={`h-8 w-16 rounded cursor-pointer border border-slate-200 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      );
    }

    // Text (default)
    return (
      <input
        type="text"
        value={value}
        disabled={isDisabled}
        onChange={e => handleChange(def.key, e.target.value)}
        className={`w-48 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
          isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
        }`}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <span className="text-red-500 text-xl">⚠️</span>
        <div>
          <p className="text-red-700 font-medium">Feature ayarları yüklenemedi</p>
          <p className="text-red-600 text-sm mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  // Global feature'lar kurum bazında override edilemez — sadece institution-scope olanlar listelenir
  const activeGroupDefs = definitions
    .filter(d => d.groupId === activeGroup && d.scope !== 'Global')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const activeGroupGlobalDefs = definitions
    .filter(d => d.groupId === activeGroup && d.scope === 'Global')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            {institutionName ? `${institutionName} — Özellik Ayarları` : 'Kurum Özellik Ayarları'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kurumun hangi özelliklere erişebileceğini buradan yönetin.</p>
        </div>
        <div className="flex gap-3">
          {hasPendingChanges && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              İptal
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasPendingChanges || saving || !canWrite}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 ${
              hasPendingChanges && canWrite
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Kaydediliyor...
              </>
            ) : saveSuccess ? (
              <>✅ Kaydedildi</>
            ) : (
              <>💾 Değişiklikleri Kaydet {hasPendingChanges && `(${Object.keys(pendingChanges).length})`}</>
            )}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sol: Grup Sekmeler */}
        <div className="w-56 border-r border-slate-100 p-4 space-y-1 flex-shrink-0">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeGroup === group.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {group.name}
              {/* Bekleyen değişiklik varsa nokta göster (sadece institution-scope) */}
              {definitions
                .filter(d => d.groupId === group.id && d.scope !== 'Global')
                .some(d => pendingChanges[d.key] !== undefined) && (
                <span className="ml-2 inline-block w-2 h-2 bg-amber-400 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Sağ: Feature Listesi */}
        <div className="flex-1 p-6">
          {activeGroupGlobalDefs.length > 0 && (
            <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl flex items-start gap-2">
              <span className="text-violet-500 mt-0.5 flex-shrink-0">🌐</span>
              <div className="text-xs text-violet-700">
                <span className="font-black">Platform ayarı:</span>{' '}
                {activeGroupGlobalDefs.map(d => d.displayName).join(', ')} — bu grupta{' '}
                {activeGroupGlobalDefs.length > 1 ? 'bu özellikler' : 'bu özellik'} tüm kurumlar için
                geçerlidir ve kurum bazında değiştirilemez.
              </div>
            </div>
          )}
          {activeGroupDefs.length === 0 && activeGroupGlobalDefs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-bold">Bu grupta henüz özellik tanımı yok.</p>
            </div>
          ) : activeGroupDefs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="font-bold text-sm">Bu gruptaki tüm özellikler platform genelinde geçerlidir.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGroupDefs.map(def => {
                const isPending = pendingChanges[def.key] !== undefined;
                const isDefault = currentValues[def.key] === undefined;

                return (
                  <div
                    key={def.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                      isPending
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex-1 mr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{def.displayName}</span>
                        {def.isSystemLevel && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-black uppercase tracking-widest">
                            Sistem
                          </span>
                        )}
                        {isDefault && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-bold uppercase">
                            Varsayılan
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-bold uppercase">
                            Değiştirildi
                          </span>
                        )}
                      </div>
                      {def.description && (
                        <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono mt-1">{def.key}</div>
                    </div>
                    <div className="flex-shrink-0">
                      {renderInput(def)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionFeaturePanel;
