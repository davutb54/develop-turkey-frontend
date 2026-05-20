import React, { useState } from 'react';
import {
  useWorkflowStore,
  type TriggerDefinition,
  type FieldDefinition,
  type ActionDefinition,
  type ActionParameter,
} from './useWorkflowStore';

type Tab = 'triggers' | 'fields' | 'actions';

const panelStyle: React.CSSProperties = {
  width: 320,
  minWidth: 320,
  background: '#1e1e2e',
  borderLeft: '1px solid #2d2d3f',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: 'system-ui, sans-serif',
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '9px 4px',
  background: active ? '#2d2d3f' : 'transparent',
  border: 'none',
  borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
  color: active ? '#e2e8f0' : '#64748b',
  fontSize: 11,
  fontWeight: active ? 700 : 400,
  cursor: 'pointer',
  letterSpacing: 0.5,
  transition: 'all 0.15s',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  color: '#e2e8f0',
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#64748b',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: 3,
  display: 'block',
};

const cardStyle = (color: string): React.CSSProperties => ({
  background: '#111827',
  border: `1px solid ${color}33`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 8,
  padding: '10px 12px',
  marginBottom: 8,
});

const btnStyle = (variant: 'primary' | 'danger' | 'ghost'): React.CSSProperties => ({
  padding: '5px 10px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  background:
    variant === 'primary' ? '#4f46e5' :
    variant === 'danger' ? 'rgba(220,38,38,0.15)' :
    'rgba(255,255,255,0.05)',
  color:
    variant === 'primary' ? '#fff' :
    variant === 'danger' ? '#f87171' :
    '#9ca3af',
});

const categoryColors: Record<string, string> = {
  'Kullanıcı': '#3b82f6',
  'Problem': '#22c55e',
  'İçerik': '#f59e0b',
  'Gamification': '#a855f7',
  'Moderasyon': '#ef4444',
  'İletişim': '#06b6d4',
  'Sistem': '#6b7280',
  'Diğer': '#64748b',
};

const getCategoryColor = (cat: string) => categoryColors[cat] ?? '#64748b';

// ─── Trigger Formu ────────────────────────────────────────────────────────────
function TriggerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<TriggerDefinition>;
  onSave: (data: Omit<TriggerDefinition, 'id' | 'isBuiltIn'>) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial?.value ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '⚡');
  const [category, setCategory] = useState(initial?.category ?? 'Diğer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !label.trim()) return;
    onSave({ value: value.trim(), label: label.trim(), description, icon, category });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: '0 0 60px' }}>
          <label style={labelStyle}>İkon</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: 18 }} maxLength={4} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Görünen Ad *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} placeholder="Kullanıcı Kayıt Oldu" required />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Kod Adı * (snake_case)</label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\s/g, '_').toLowerCase())}
          style={inputStyle}
          placeholder="user_registered"
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Açıklama</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Ne zaman tetiklenir?" />
      </div>
      <div>
        <label style={labelStyle}>Kategori</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          {Object.keys(categoryColors).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={btnStyle('ghost')}>İptal</button>
        <button type="submit" style={btnStyle('primary')}>💾 Kaydet</button>
      </div>
    </form>
  );
}

// ─── Field Formu ──────────────────────────────────────────────────────────────
function FieldForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<FieldDefinition>;
  onSave: (data: Omit<FieldDefinition, 'id'>) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial?.value ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [type, setType] = useState<FieldDefinition['type']>(initial?.type ?? 'string');
  const [category, setCategory] = useState(initial?.category ?? 'Diğer');
  const [enumValues, setEnumValues] = useState((initial?.enumValues ?? []).join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !label.trim()) return;
    onSave({
      value: value.trim(),
      label: label.trim(),
      type,
      category,
      enumValues: type === 'enum' ? enumValues.split(',').map((v) => v.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelStyle}>Görünen Ad *</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} placeholder="Kullanıcı Puanı" required />
      </div>
      <div>
        <label style={labelStyle}>Alan Yolu * (örn: user.score)</label>
        <input value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} placeholder="user.score" required />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Veri Tipi</label>
          <select value={type} onChange={(e) => setType(e.target.value as FieldDefinition['type'])} style={selectStyle}>
            <option value="string">Metin</option>
            <option value="number">Sayı</option>
            <option value="boolean">Evet/Hayır</option>
            <option value="enum">Seçenek Listesi</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
            {Object.keys(categoryColors).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {type === 'enum' && (
        <div>
          <label style={labelStyle}>Seçenekler (virgülle ayırın)</label>
          <input value={enumValues} onChange={(e) => setEnumValues(e.target.value)} style={inputStyle} placeholder="Kolay, Orta, Zor" />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={btnStyle('ghost')}>İptal</button>
        <button type="submit" style={btnStyle('primary')}>💾 Kaydet</button>
      </div>
    </form>
  );
}

// ─── Action Formu ─────────────────────────────────────────────────────────────
function ActionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ActionDefinition>;
  onSave: (data: Omit<ActionDefinition, 'id' | 'isBuiltIn'>) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial?.value ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '⚙️');
  const [category, setCategory] = useState(initial?.category ?? 'Diğer');
  const [params, setParams] = useState<ActionParameter[]>(initial?.parameters ?? []);

  const addParam = () => {
    setParams((p) => [...p, { key: '', label: '', type: 'text', required: false, defaultValue: '' }]);
  };

  const updateParam = (i: number, field: keyof ActionParameter, val: string | boolean) => {
    setParams((p) => p.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)));
  };

  const removeParam = (i: number) => {
    setParams((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !label.trim()) return;
    onSave({ value: value.trim(), label: label.trim(), description, icon, category, parameters: params });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: '0 0 60px' }}>
          <label style={labelStyle}>İkon</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: 18 }} maxLength={4} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Görünen Ad *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} placeholder="E-posta Gönder" required />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Kod Adı * (snake_case)</label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\s/g, '_').toLowerCase())}
          style={inputStyle}
          placeholder="send_email"
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Açıklama</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Ne yapar?" />
      </div>
      <div>
        <label style={labelStyle}>Kategori</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          {Object.keys(categoryColors).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Parametreler */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, margin: 0 }}>Parametreler</label>
          <button type="button" onClick={addParam} style={{ ...btnStyle('ghost'), fontSize: 10, padding: '3px 8px' }}>
            + Ekle
          </button>
        </div>
        {params.map((p, i) => (
          <div key={i} style={{ background: '#0f172a', borderRadius: 6, padding: '8px', marginBottom: 6, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={p.key}
                onChange={(e) => updateParam(i, 'key', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="key"
              />
              <input
                value={p.label}
                onChange={(e) => updateParam(i, 'label', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Etiket"
              />
              <button type="button" onClick={() => removeParam(i)} style={{ ...btnStyle('danger'), padding: '4px 8px' }}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={p.type}
                onChange={(e) => updateParam(i, 'type', e.target.value)}
                style={{ ...selectStyle, flex: 1 }}
              >
                <option value="text">Metin</option>
                <option value="number">Sayı</option>
                <option value="boolean">Evet/Hayır</option>
                <option value="select">Seçim</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={p.required}
                  onChange={(e) => updateParam(i, 'required', e.target.checked)}
                />
                Zorunlu
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={btnStyle('ghost')}>İptal</button>
        <button type="submit" style={btnStyle('primary')}>💾 Kaydet</button>
      </div>
    </form>
  );
}

// ─── Ana Panel ────────────────────────────────────────────────────────────────
export default function WorkflowDefinitionPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('triggers');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    triggers, addTrigger, updateTrigger, deleteTrigger,
    fields, addField, updateField, deleteField,
    actions, addAction, updateAction, deleteAction,
  } = useWorkflowStore();

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const filteredTriggers = triggers.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFields = fields.filter(
    (f) =>
      f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActions = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const editingTrigger = editingId ? triggers.find((t) => t.id === editingId) : undefined;
  const editingField = editingId ? fields.find((f) => f.id === editingId) : undefined;
  const editingAction = editingId ? actions.find((a) => a.id === editingId) : undefined;

  return (
    <div style={panelStyle}>
      {/* Başlık */}
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #2d2d3f' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
          🗂️ Tanım Yöneticisi
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Ara..."
          style={{ ...inputStyle, fontSize: 12 }}
        />
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2d2d3f' }}>
        <button
          style={tabBtnStyle(activeTab === 'triggers')}
          onClick={() => { setActiveTab('triggers'); handleClose(); }}
        >
          ⚡ Tetikleyiciler ({triggers.length})
        </button>
        <button
          style={tabBtnStyle(activeTab === 'fields')}
          onClick={() => { setActiveTab('fields'); handleClose(); }}
        >
          🔤 Alanlar ({fields.length})
        </button>
        <button
          style={tabBtnStyle(activeTab === 'actions')}
          onClick={() => { setActiveTab('actions'); handleClose(); }}
        >
          ⚙️ Aksiyonlar ({actions.length})
        </button>
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* ── TRIGGER TAB ── */}
        {activeTab === 'triggers' && (
          <div>
            {showForm ? (
              <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #374151' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>
                  {editingId ? '✏️ Tetikleyici Düzenle' : '➕ Yeni Tetikleyici'}
                </div>
                <TriggerForm
                  initial={editingTrigger}
                  onSave={(data) => {
                    if (editingId) updateTrigger(editingId, data);
                    else addTrigger(data);
                    handleClose();
                  }}
                  onCancel={handleClose}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                style={{ ...btnStyle('primary'), width: '100%', marginBottom: 12, padding: '8px', fontSize: 12 }}
              >
                ➕ Yeni Tetikleyici Ekle
              </button>
            )}

            {filteredTriggers.map((t) => (
              <div key={t.id} style={cardStyle(getCategoryColor(t.category))}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{t.value}</div>
                      {t.description && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{t.description}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: `${getCategoryColor(t.category)}22`,
                    color: getCategoryColor(t.category), fontWeight: 600, flexShrink: 0,
                  }}>
                    {t.category}
                  </span>
                </div>
                {!t.isBuiltIn ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => { setEditingId(t.id); setShowForm(true); }}
                      style={{ ...btnStyle('ghost'), fontSize: 10, padding: '3px 8px' }}
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`"${t.label}" silinsin mi?`)) deleteTrigger(t.id); }}
                      style={{ ...btnStyle('danger'), fontSize: 10, padding: '3px 8px' }}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: '#374151', marginTop: 6 }}>🔒 Yerleşik (silinemez)</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── FIELD TAB ── */}
        {activeTab === 'fields' && (
          <div>
            {showForm ? (
              <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #374151' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>
                  {editingId ? '✏️ Alan Düzenle' : '➕ Yeni Alan'}
                </div>
                <FieldForm
                  initial={editingField}
                  onSave={(data) => {
                    if (editingId) updateField(editingId, data);
                    else addField(data);
                    handleClose();
                  }}
                  onCancel={handleClose}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                style={{ ...btnStyle('primary'), width: '100%', marginBottom: 12, padding: '8px', fontSize: 12 }}
              >
                ➕ Yeni Alan Ekle
              </button>
            )}

            {filteredFields.map((f) => (
              <div key={f.id} style={cardStyle(getCategoryColor(f.category))}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{f.value}</div>
                    {f.enumValues && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                        [{f.enumValues.join(', ')}]
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: '#1e293b', color: '#94a3b8', fontFamily: 'monospace',
                    }}>
                      {f.type}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: `${getCategoryColor(f.category)}22`,
                      color: getCategoryColor(f.category), fontWeight: 600,
                    }}>
                      {f.category}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    onClick={() => { setEditingId(f.id); setShowForm(true); }}
                    style={{ ...btnStyle('ghost'), fontSize: 10, padding: '3px 8px' }}
                  >
                    ✏️ Düzenle
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`"${f.label}" silinsin mi?`)) deleteField(f.id); }}
                    style={{ ...btnStyle('danger'), fontSize: 10, padding: '3px 8px' }}
                  >
                    🗑️ Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTION TAB ── */}
        {activeTab === 'actions' && (
          <div>
            {showForm ? (
              <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #374151' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>
                  {editingId ? '✏️ Aksiyon Düzenle' : '➕ Yeni Aksiyon'}
                </div>
                <ActionForm
                  initial={editingAction}
                  onSave={(data) => {
                    if (editingId) updateAction(editingId, data);
                    else addAction(data);
                    handleClose();
                  }}
                  onCancel={handleClose}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                style={{ ...btnStyle('primary'), width: '100%', marginBottom: 12, padding: '8px', fontSize: 12 }}
              >
                ➕ Yeni Aksiyon Ekle
              </button>
            )}

            {filteredActions.map((a) => (
              <div key={a.id} style={cardStyle(getCategoryColor(a.category))}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 18 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{a.value}</div>
                      {a.description && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{a.description}</div>
                      )}
                      {a.parameters.length > 0 && (
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                          📌 {a.parameters.length} parametre
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: `${getCategoryColor(a.category)}22`,
                    color: getCategoryColor(a.category), fontWeight: 600, flexShrink: 0,
                  }}>
                    {a.category}
                  </span>
                </div>
                {!a.isBuiltIn ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => { setEditingId(a.id); setShowForm(true); }}
                      style={{ ...btnStyle('ghost'), fontSize: 10, padding: '3px 8px' }}
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`"${a.label}" silinsin mi?`)) deleteAction(a.id); }}
                      style={{ ...btnStyle('danger'), fontSize: 10, padding: '3px 8px' }}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: '#374151', marginTop: 6 }}>🔒 Yerleşik (silinemez)</div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}