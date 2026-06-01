import { useEffect, useState } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { useWorkflowStore } from './useWorkflowStore';
import { useAuth } from '../../context/AuthContext';
import type { ActionNodeData } from './ActionNode';
import type { TriggerNodeData } from './TriggerNode';

// ── Tipler ───────────────────────────────────────────────────────────────────

type InspectorData = Record<string, unknown>;

const NODE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  triggerNode:   { label: 'Tetikleyici',  icon: '⚡', color: '#3b82f6' },
  conditionNode: { label: 'Koşul',        icon: '🔀', color: '#d97706' },
  actionNode:    { label: 'Aksiyon',      icon: '⚙️', color: '#7c3aed' },
  csharpNode:    { label: 'C# Kodu',      icon: '💻', color: '#dc2626' },
};

// ── Widget bileşenleri ────────────────────────────────────────────────────────

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 }}>
      {text}{required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
    </label>
  );
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#13131f',
  border: '1px solid #2d2d3f',
  borderRadius: 6,
  color: '#e2e8f0',
  padding: '7px 10px',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  cursor: 'pointer',
};

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function NodeInspectorPanel({ node, onClose }: { node: Node; onClose: () => void }) {
  const { setNodes } = useReactFlow();
  const actions = useWorkflowStore((s) => s.actions);
  const triggers = useWorkflowStore((s) => s.triggers);
  const { hasCapability } = useAuth();

  const meta = NODE_TYPE_META[node.type ?? ''] ?? { label: node.type ?? 'Node', icon: '📦', color: '#6b7280' };

  // Lokal düzenleme state'i — node data'nın kopyası
  const [draft, setDraft] = useState<InspectorData>({ ...(node.data as InspectorData) });
  const [dirty, setDirty] = useState(false);

  // node değişirse draft'ı sıfırla
  useEffect(() => {
    setDraft({ ...(node.data as InspectorData) });
    setDirty(false);
  }, [node.id]);

  const update = (key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateParam = (key: string, value: string) => {
    setDraft(prev => ({
      ...prev,
      params: { ...(prev.params as Record<string, string> ?? {}), [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: draft } : n));
    setDirty(false);
  };

  // ActionNode için izin verilen aksiyonlar
  const allowedActions = actions.filter(
    a => hasCapability(`workflow.action.${a.value}`) || a.value === (draft.action as string | undefined),
  );
  const groupedActions = allowedActions.reduce<Record<string, typeof allowedActions>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});
  const selectedAction = actions.find(a => a.value === (draft.action as string | undefined));

  // Trigger için gruplu liste
  const groupedTriggers = triggers.reduce<Record<string, typeof triggers>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 340, background: '#1a1a2e', borderLeft: '1px solid #2d2d3f',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
    }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #2d2d3f', flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{node.id}</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>✕</button>
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Etiket alanı — tüm node tipleri */}
        <div>
          <FieldLabel text="Node Etiketi" />
          <input
            value={String(draft.label ?? '')}
            onChange={e => update('label', e.target.value)}
            placeholder="Etiket gir…"
            style={inputBase}
          />
        </div>

        {/* Vurgu rengi */}
        <div>
          <FieldLabel text="Vurgu Rengi" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={String(draft.accentColor ?? meta.color)}
              onChange={e => update('accentColor', e.target.value)}
              style={{ width: 36, height: 30, padding: 2, background: '#13131f', border: '1px solid #2d2d3f', borderRadius: 6, cursor: 'pointer' }}
            />
            <input
              value={String(draft.accentColor ?? meta.color)}
              onChange={e => update('accentColor', e.target.value)}
              style={{ ...inputBase, flex: 1 }}
              placeholder="#rrggbb"
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e1e2e' }} />

        {/* TriggerNode */}
        {node.type === 'triggerNode' && (
          <div>
            <FieldLabel text="Tetikleyici Olay" required />
            <select
              value={String(draft.trigger ?? '')}
              onChange={e => update('trigger', e.target.value)}
              style={selectBase}
            >
              <option value="" disabled>Olay seç…</option>
              {Object.entries(groupedTriggers).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {(draft as TriggerNodeData).trigger && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                {triggers.find(t => t.value === (draft as TriggerNodeData).trigger)?.description}
              </div>
            )}
          </div>
        )}

        {/* ActionNode */}
        {node.type === 'actionNode' && (
          <>
            <div>
              <FieldLabel text="Aksiyon" required />
              <select
                value={String((draft as ActionNodeData).action ?? '')}
                onChange={e => { update('action', e.target.value); update('params', {}); }}
                style={selectBase}
              >
                <option value="" disabled>Aksiyon seç…</option>
                {Object.entries(groupedActions).map(([cat, items]) => (
                  <optgroup key={cat} label={cat}>
                    {items.map(a => (
                      <option key={a.value} value={a.value}>{a.icon} {a.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedAction && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>{selectedAction.description}</div>
              )}
            </div>

            {selectedAction && selectedAction.parameters.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Parametreler</div>
                {selectedAction.parameters.map(p => {
                  const currentVal = String(((draft as ActionNodeData).params ?? {})[p.key] ?? p.defaultValue ?? '');
                  return (
                    <div key={p.key}>
                      <FieldLabel text={p.label} required={p.required} />
                      {p.type === 'boolean' ? (
                        <select value={currentVal || 'true'} onChange={e => updateParam(p.key, e.target.value)} style={selectBase}>
                          <option value="true">✓ Evet</option>
                          <option value="false">✗ Hayır</option>
                        </select>
                      ) : p.type === 'select' && p.options ? (
                        <select value={currentVal || p.options[0] || ''} onChange={e => updateParam(p.key, e.target.value)} style={selectBase}>
                          {p.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={p.type === 'number' ? 'number' : 'text'}
                          value={currentVal}
                          placeholder={p.label}
                          onChange={e => updateParam(p.key, e.target.value)}
                          style={inputBase}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ConditionNode & CSharpNode — placeholder */}
        {(node.type === 'conditionNode' || node.type === 'csharpNode') && (
          <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            Bu node tipi için gelişmiş editör yakında eklenecek.
          </div>
        )}
      </div>

      {/* Alt butonlar */}
      <div style={{ borderTop: '1px solid #2d2d3f', padding: '12px 16px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={!dirty}
          style={{
            flex: 1,
            background: dirty ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1e1e2e',
            border: dirty ? 'none' : '1px solid #374151',
            borderRadius: 8,
            color: dirty ? '#fff' : '#4b5563',
            padding: '8px 0',
            fontSize: 13, fontWeight: 600,
            cursor: dirty ? 'pointer' : 'not-allowed',
          }}
        >
          💾 Kaydet
        </button>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          Kapat
        </button>
      </div>
    </div>
  );
}
