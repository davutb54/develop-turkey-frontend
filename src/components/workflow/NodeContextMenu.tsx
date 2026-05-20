import React, { useEffect, useRef, useState } from 'react';
import type { Node as FlowNode } from '@xyflow/react';

export type NodeMenuPosition = {
  x: number;
  y: number;
  nodeId: string;
  nodeType: string;
};

type NodeContextMenuProps = {
  position: NodeMenuPosition;
  node: FlowNode | undefined;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSetColor: (id: string, color: string) => void;
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  background: '#1e1e2e',
  border: '1px solid #3d3d5c',
  borderRadius: 10,
  padding: '6px 0',
  minWidth: 210,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  zIndex: 9999,
  userSelect: 'none',
};

const itemStyle = (danger?: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 14px',
  cursor: 'pointer',
  color: danger ? '#f87171' : '#e2e8f0',
  fontSize: 13,
  transition: 'background 0.1s',
});

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: '#2d2d3f',
  margin: '4px 0',
};

const sectionLabelStyle: React.CSSProperties = {
  padding: '4px 14px 2px',
  fontSize: 10,
  color: '#4b5563',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const nodeTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  triggerNode: { label: 'Tetikleyici', color: '#3b82f6', icon: '⚡' },
  conditionNode: { label: 'Koşul', color: '#d97706', icon: '🔀' },
  actionNode: { label: 'Aksiyon', color: '#7c3aed', icon: '⚙️' },
  csharpNode: { label: 'C# Kodu', color: '#dc2626', icon: '</>' },
};

const colorOptions = [
  { label: 'Mavi', value: '#3b82f6' },
  { label: 'Yeşil', value: '#22c55e' },
  { label: 'Sarı', value: '#eab308' },
  { label: 'Kırmızı', value: '#ef4444' },
  { label: 'Mor', value: '#a855f7' },
  { label: 'Turuncu', value: '#f97316' },
  { label: 'Pembe', value: '#ec4899' },
  { label: 'Gri', value: '#6b7280' },
];

export default function NodeContextMenu({
  position,
  onClose,
  onDelete,
  onDuplicate,
  onOpenDetail,
  onDisconnect,
  onSetColor,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const menuWidth = 210;
  const menuHeight = showColors ? 380 : 280;
  const left = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
  const top = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;

  const typeInfo = nodeTypeLabels[position.nodeType] ?? { label: 'Blok', color: '#6b7280', icon: '📦' };

  const handleItemClick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div ref={menuRef} style={{ ...menuStyle, left, top }}>
      {/* Node başlığı */}
      <div
        style={{
          padding: '8px 14px 6px',
          borderBottom: '1px solid #2d2d3f',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: typeInfo.color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
          {typeInfo.icon} {typeInfo.label}
        </span>
        <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto' }}>
          #{position.nodeId.slice(-4)}
        </span>
      </div>

      {/* Temel işlemler */}
      <div style={sectionLabelStyle}>İşlemler</div>

      <div
        style={itemStyle()}
        onClick={() => handleItemClick(() => onOpenDetail(position.nodeId))}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span>🔍</span>
        <span>Detayları Düzenle</span>
      </div>

      <div
        style={itemStyle()}
        onClick={() => handleItemClick(() => onDuplicate(position.nodeId))}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span>📋</span>
        <span>Kopyala</span>
        <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 'auto' }}>Ctrl+D</span>
      </div>

      <div
        style={itemStyle()}
        onClick={() => handleItemClick(() => onDisconnect(position.nodeId))}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span>✂️</span>
        <span>Bağlantıları Kes</span>
      </div>

      <div style={dividerStyle} />

      {/* Renk */}
      <div
        style={{ ...itemStyle(), justifyContent: 'space-between' }}
        onClick={() => setShowColors((v) => !v)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🎨</span>
          <span>Renk Değiştir</span>
        </span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>{showColors ? '▲' : '▼'}</span>
      </div>

      {showColors && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '6px 14px 10px',
          }}
        >
          {colorOptions.map((c) => (
            <div
              key={c.value}
              title={c.label}
              onClick={() => handleItemClick(() => onSetColor(position.nodeId, c.value))}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: c.value,
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'border 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = '2px solid #fff';
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = '2px solid transparent';
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      )}

      <div style={dividerStyle} />

      {/* Sil */}
      <div
        style={itemStyle(true)}
        onClick={() => handleItemClick(() => onDelete(position.nodeId))}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(220,38,38,0.1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span>🗑️</span>
        <span>Bloğu Sil</span>
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>Del</span>
      </div>
    </div>
  );
}
