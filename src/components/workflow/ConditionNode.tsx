import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useWorkflowStore, filterFieldsForTrigger } from './useWorkflowStore';

export type ConditionNodeData = {
  field?: string;
  operator?: string;
  value?: string;
  valueMode?: 'static' | 'dynamic'; // Statik değer mi yoksa başka bir field mı
  label?: string;
  accentColor?: string;
};

function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData;
  const allFields = useWorkflowStore((s) => s.fields);
  const operators = useWorkflowStore((s) => s.operators);
  const activeTrigger = useWorkflowStore((s) => s.activeTrigger);
  const { setNodes } = useReactFlow();

  const accent = nodeData.accentColor ?? '#d97706';

  // valueMode: kayıtlı veriden oku, yoksa değere bakarak tahmin et
  const [valueMode, setValueMode] = useState<'static' | 'dynamic'>(
    nodeData.valueMode ??
      (nodeData.value?.startsWith('{{') && nodeData.value?.endsWith('}}') ? 'dynamic' : 'static')
  );

  // Trigger'a göre filtrelenmiş field'lar
  const fields = filterFieldsForTrigger(allFields, activeTrigger);

  // Seçili alana göre tip bul
  const fieldDef = allFields.find((f) => f.value === (nodeData.field ?? ''));
  const fieldType = fieldDef?.type ?? 'string';

  // Operatörleri filtrele
  const filteredOps = operators.filter((op) => op.applicableTo.includes(fieldType as 'string' | 'number' | 'boolean' | 'enum'));

  const updateNodeData = (patch: Partial<ConditionNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  };

  // Mod değiştiğinde state'i kaydet ve değeri sıfırla
  const toggleValueMode = () => {
    const newMode = valueMode === 'static' ? 'dynamic' : 'static';
    setValueMode(newMode);
    updateNodeData({ value: '', valueMode: newMode });
  };

  // Kategoriye göre grupla
  const groupedFields = fields.reduce<Record<string, typeof fields>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  // Dinamik modda seçili field'ın açıklaması
  const dynamicFieldDef = valueMode === 'dynamic' && nodeData.value
    ? fields.find((f) => f.value === nodeData.value?.replace(/^\{\{|\}\}$/g, ''))
    : null;

  const sel: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 6,
    color: '#fff',
    padding: '5px 8px',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
  };

  const lbl: React.CSSProperties = {
    fontSize: 10,
    opacity: 0.75,
    display: 'block',
    marginBottom: 3,
    letterSpacing: 0.5,
  };

  const modeBtnStyle: React.CSSProperties = {
    background: valueMode === 'dynamic' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.12)',
    border: valueMode === 'dynamic' ? '1px solid rgba(99,102,241,0.8)' : '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    padding: '1px 5px',
    fontSize: 10,
    cursor: 'pointer',
    marginLeft: 6,
    transition: 'all 0.2s ease',
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`,
        border: selected ? '2px solid #fff' : `2px solid ${accent}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 240,
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
        <span style={{ fontSize: 18 }}>🔀</span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>KOŞUL</span>
      </div>

      {/* Alan */}
      <div style={{ marginBottom: 6 }}>
        <label style={lbl}>
          ALAN
          {!activeTrigger && (
            <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 9 }}>(tetikleyici seçilmedi)</span>
          )}
        </label>
        <select
          value={nodeData.field ?? ''}
          onChange={(e) => updateNodeData({ field: e.target.value })}
          style={sel}
          className="nodrag"
        >
          <option value="" disabled style={{ color: '#000' }}>
            {fields.length === 0 ? 'Önce tetikleyici seçin' : 'Alan seç...'}
          </option>
          {Object.entries(groupedFields).map(([cat, items]) => (
            <optgroup key={cat} label={cat} style={{ color: '#000' }}>
              {items.map((f) => (
                <option key={f.value} value={f.value} title={f.description} style={{ color: '#000' }}>
                  {f.label} {f.description ? `- ${f.description}` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {/* Seçili field açıklaması */}
        {fieldDef?.description && (
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 3, lineHeight: 1.4 }}>
            {fieldDef.description}
          </div>
        )}
      </div>

      {/* Operatör */}
      <div style={{ marginBottom: 6 }}>
        <label style={lbl}>OPERATÖR</label>
        <select
          value={nodeData.operator ?? ''}
          onChange={(e) => updateNodeData({ operator: e.target.value })}
          style={sel}
          className="nodrag"
        >
          <option value="" disabled style={{ color: '#000' }}>Operatör seç...</option>
          {filteredOps.map((op) => (
            <option key={op.value} value={op.value} style={{ color: '#000' }}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Değer — Statik / Dinamik mod */}
      <div>
        <label style={{ ...lbl, display: 'flex', alignItems: 'center' }}>
          DEĞER
          <button
            type="button"
            onClick={toggleValueMode}
            style={modeBtnStyle}
            className="nodrag"
            title={valueMode === 'static'
              ? 'Dinamik moda geç — Değer yerine başka bir alan (field) seçin'
              : 'Statik moda geç — Sabit bir değer yazın'}
          >
            {valueMode === 'static' ? '📝 Sabit' : '{x} Değişken'}
          </button>
        </label>

        {valueMode === 'dynamic' ? (
          /* ── Dinamik Mod: Alan seçici ── */
          <>
            <select
              value={nodeData.value?.replace(/^\{\{|\}\}$/g, '') ?? ''}
              style={{
                ...sel,
                border: '1px solid rgba(99,102,241,0.6)',
                background: 'rgba(99,102,241,0.15)',
              }}
              className="nodrag"
              onChange={(e) => updateNodeData({ value: `{{${e.target.value}}}` })}
            >
              <option value="" disabled style={{ color: '#000' }}>Karşılaştırılacak alan seç...</option>
              {Object.entries(groupedFields).map(([cat, items]) => (
                <optgroup key={cat} label={cat} style={{ color: '#000' }}>
                  {items
                    .filter((f) => f.value !== nodeData.field) // Kendisi ile kıyaslama engelle
                    .map((f) => (
                      <option key={f.value} value={f.value} title={f.description} style={{ color: '#000' }}>
                        {f.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {dynamicFieldDef?.description && (
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 3, lineHeight: 1.4, fontStyle: 'italic' }}>
                ↳ {dynamicFieldDef.description}
              </div>
            )}
          </>
        ) : fieldType === 'enum' && fieldDef?.enumValues ? (
          /* ── Statik Mod: Enum seçici ── */
          <select
            value={nodeData.value ?? ''}
            style={sel}
            className="nodrag"
            onChange={(e) => updateNodeData({ value: e.target.value })}
          >
            <option value="" disabled style={{ color: '#000' }}>Değer seç...</option>
            {fieldDef.enumValues.map((v) => (
              <option key={v} value={v} style={{ color: '#000' }}>{v}</option>
            ))}
          </select>
        ) : fieldType === 'boolean' ? (
          /* ── Statik Mod: Boolean seçici ── */
          <select
            value={nodeData.value ?? ''}
            style={sel}
            className="nodrag"
            onChange={(e) => updateNodeData({ value: e.target.value })}
          >
            <option value="" disabled style={{ color: '#000' }}>Seç...</option>
            <option value="true" style={{ color: '#000' }}>✓ Evet</option>
            <option value="false" style={{ color: '#000' }}>✗ Hayır</option>
          </select>
        ) : (
          /* ── Statik Mod: Metin/Sayı input ── */
          <input
            type={fieldType === 'number' ? 'number' : 'text'}
            value={nodeData.value ?? ''}
            placeholder="Değer girin..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              color: '#fff',
              padding: '5px 8px',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            className="nodrag"
            onChange={(e) => updateNodeData({ value: e.target.value })}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, opacity: 0.75 }}>
        <span>✓ Evet</span>
        <span>✗ Hayır</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ background: '#86efac', width: 12, height: 12, border: `2px solid ${accent}`, left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ background: '#fca5a5', width: 12, height: 12, border: `2px solid ${accent}`, left: '70%' }}
      />
    </div>
  );
}

export default memo(ConditionNode);

