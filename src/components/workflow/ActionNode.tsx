import { memo, useMemo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from './useWorkflowStore';
import { useAuth } from '../../context/AuthContext';

export type ActionNodeData = {
  action?: string;
  params?: Record<string, string>;
  label?: string;
  accentColor?: string;
};

function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ActionNodeData;
  const actions = useWorkflowStore((s) => s.actions);
  const availableCapabilities = useWorkflowStore((s) => s.availableCapabilities);
  const availableTemplates = useWorkflowStore((s) => s.availableTemplates);
  const { hasCapability } = useAuth();
  const { setNodes } = useReactFlow();

  const accent = nodeData.accentColor ?? '#7c3aed';

  // Kullanıcının çalıştırma yetkisi olduğu action'lar.
  // Mevcut seçili action yetkisizleşmiş olsa bile listede tutulur ki kullanıcı
  // bunu görüp değiştirebilsin (sessiz veri kaybı önlenir).
  const allowedActions = useMemo(() => {
    return actions.filter(
      (a) => hasCapability(`workflow.action.${a.value}`) || a.value === nodeData.action,
    );
  }, [actions, hasCapability, nodeData.action]);

  const actionDef = allowedActions.find((a) => a.value === (nodeData.action ?? ''));
  const selectedActionDenied =
    !!nodeData.action && !hasCapability(`workflow.action.${nodeData.action}`);

  // Kategoriye göre grupla
  const grouped = allowedActions.reduce<Record<string, typeof allowedActions>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  const sel: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 6,
    color: '#fff',
    padding: '6px 8px',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
  };

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 6,
    color: '#fff',
    padding: '5px 8px',
    fontSize: 11,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    fontSize: 10,
    opacity: 0.75,
    display: 'block',
    marginBottom: 3,
    letterSpacing: 0.5,
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`,
        border: selected ? '2px solid #fff' : `2px solid ${accent}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 230,
        boxShadow: `0 4px 16px ${accent}66`,
        color: '#fff',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#fff', width: 12, height: 12, border: `2px solid ${accent}` }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>AKSİYON</span>
      </div>

      {/* Aksiyon seçimi */}
      <select
        value={nodeData.action ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, action: value } } : n))
          );
        }}
        style={sel}
        className="nodrag"
      >
        <option value="" disabled style={{ color: '#000' }}>Aksiyon Seç...</option>
        {Object.entries(grouped).map(([cat, items]) => (
          <optgroup key={cat} label={cat} style={{ color: '#000' }}>
            {items.map((a) => (
              <option key={a.value} value={a.value} style={{ color: '#000' }}>
                {a.icon} {a.label}
                {a.value === nodeData.action && selectedActionDenied ? ' ⚠ yetkisiz' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Boş durum / yetkisiz seçim bilgilendirmesi */}
      {allowedActions.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#fecaca', lineHeight: 1.4 }}>
          ⚠ Bu kullanıcıda hiçbir <code>workflow.action.*</code> yetkisi yok.
        </div>
      )}
      {selectedActionDenied && allowedActions.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#fecaca', lineHeight: 1.4 }}>
          ⚠ Seçili aksiyon için <code>workflow.action.{nodeData.action}</code> yetkisi yok.
        </div>
      )}

      {/* Seçili aksiyonun parametreleri */}
      {actionDef && actionDef.parameters.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 0.5, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 6 }}>
            PARAMETRELER
          </div>
          {actionDef.parameters.map((p) => (
            <div key={p.key}>
              <label style={lbl}>
                {p.label}{p.required && <span style={{ color: '#fca5a5' }}> *</span>}
              </label>
              {p.type === 'capability-select' ? (
                <select
                  value={nodeData.params?.[p.key] ?? p.defaultValue ?? ''}
                  style={sel}
                  className="nodrag"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (
                        n.id === id
                          ? { ...n, data: { ...n.data, params: { ...(n.data as ActionNodeData).params, [p.key]: value } } }
                          : n
                      ))
                    );
                  }}
                >
                  <option value="" disabled style={{ color: '#000' }}>Yetki Seç...</option>
                  {Object.entries(
                    availableCapabilities.reduce<Record<string, typeof availableCapabilities>>((acc, c) => {
                      const cat = c.category ?? 'Diğer';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(c);
                      return acc;
                    }, {})
                  ).map(([cat, caps]) => (
                    <optgroup key={cat} label={cat} style={{ color: '#000' }}>
                      {caps.map((c) => (
                        <option key={c.code} value={c.code} style={{ color: '#000' }}>{c.code}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : p.type === 'template-select' ? (
                <select
                  value={nodeData.params?.[p.key] ?? p.defaultValue ?? ''}
                  style={sel}
                  className="nodrag"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (
                        n.id === id
                          ? { ...n, data: { ...n.data, params: { ...(n.data as ActionNodeData).params, [p.key]: value } } }
                          : n
                      ))
                    );
                  }}
                >
                  <option value="" disabled style={{ color: '#000' }}>Şablon Seç...</option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={String(t.id)} style={{ color: '#000' }}>
                      {t.name} (v{t.latestVersion?.version ?? '?'})
                    </option>
                  ))}
                </select>
              ) : p.type === 'select' && p.options ? (
                <select
                  value={nodeData.params?.[p.key] ?? p.defaultValue ?? p.options[0] ?? ''}
                  style={sel}
                  className="nodrag"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (
                        n.id === id
                          ? { ...n, data: { ...n.data, params: { ...(n.data as ActionNodeData).params, [p.key]: value } } }
                          : n
                      ))
                    );
                  }}
                >
                  {p.options.map((opt) => (
                    <option key={opt} value={opt} style={{ color: '#000' }}>{opt}</option>
                  ))}
                </select>
              ) : p.type === 'boolean' ? (
                <select
                  value={nodeData.params?.[p.key] ?? p.defaultValue ?? 'true'}
                  style={sel}
                  className="nodrag"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (
                        n.id === id
                          ? { ...n, data: { ...n.data, params: { ...(n.data as ActionNodeData).params, [p.key]: value } } }
                          : n
                      ))
                    );
                  }}
                >
                  <option value="true" style={{ color: '#000' }}>✓ Evet</option>
                  <option value="false" style={{ color: '#000' }}>✗ Hayır</option>
                </select>
              ) : (
                <input
                  type={p.type === 'number' ? 'number' : 'text'}
                  value={nodeData.params?.[p.key] ?? p.defaultValue ?? ''}
                  placeholder={p.label}
                  style={inp}
                  className="nodrag"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (
                        n.id === id
                          ? { ...n, data: { ...n.data, params: { ...(n.data as ActionNodeData).params, [p.key]: value } } }
                          : n
                      ))
                    );
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#fff', width: 12, height: 12, border: `2px solid ${accent}` }}
      />
    </div>
  );
}

export default memo(ActionNode);
