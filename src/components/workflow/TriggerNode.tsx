import { memo, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from './useWorkflowStore';

export type TriggerNodeData = {
  trigger?: string;
  label?: string;
  accentColor?: string;
};

function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TriggerNodeData;
  const triggers = useWorkflowStore((s) => s.triggers);
  const setActiveTrigger = useWorkflowStore((s) => s.setActiveTrigger);
  const { setNodes } = useReactFlow();

  useEffect(() => {
    if (nodeData.trigger) {
      setActiveTrigger(nodeData.trigger);
    }
  }, [nodeData.trigger, setActiveTrigger]);

  const accent = nodeData.accentColor ?? '#3b82f6';

  // Kategoriye göre grupla
  const grouped = triggers.reduce<Record<string, typeof triggers>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const updateNodeData = (key: keyof TriggerNodeData, value: TriggerNodeData[keyof TriggerNodeData]) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n))
    );
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`,
        border: selected ? `2px solid #fff` : `2px solid ${accent}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 220,
        boxShadow: `0 4px 16px ${accent}66`,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>TETİKLEYİCİ</span>
      </div>

      <select
        value={nodeData.trigger ?? ''}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          color: '#fff',
          padding: '6px 8px',
          fontSize: 12,
          cursor: 'pointer',
          outline: 'none',
        }}
        className="nodrag"
        onChange={(e) => {
          updateNodeData('trigger', e.target.value);
          setActiveTrigger(e.target.value);
        }}
      >
        <option value="" disabled style={{ color: '#000' }}>
          Tetikleyici Seç...
        </option>
        {Object.entries(grouped).map(([cat, items]) => (
          <optgroup key={cat} label={cat} style={{ color: '#000' }}>
            {items.map((t) => (
              <option key={t.value} value={t.value} style={{ color: '#000' }}>
                {t.icon} {t.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#fff', width: 12, height: 12, border: `2px solid ${accent}` }}
      />
    </div>
  );
}

export default memo(TriggerNode);
