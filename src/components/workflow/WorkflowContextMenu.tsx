import { useEffect, useRef } from 'react';

export type ContextMenuPosition = {
  x: number;
  y: number;
  flowX: number; // ReactFlow koordinatı
  flowY: number;
};

type WorkflowContextMenuProps = {
  position: ContextMenuPosition;
  onClose: () => void;
  onAddNode: (type: string, x: number, y: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onFitView: () => void;
  canPaste: boolean;
  onPaste: () => void;
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  background: '#1e1e2e',
  border: '1px solid #3d3d5c',
  borderRadius: 10,
  padding: '6px 0',
  minWidth: 220,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  zIndex: 9999,
  userSelect: 'none',
};

const itemStyle = (danger?: boolean, disabled?: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#4b5563' : danger ? '#f87171' : '#e2e8f0',
  fontSize: 13,
  transition: 'background 0.1s',
  opacity: disabled ? 0.5 : 1,
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

export default function WorkflowContextMenu({
  position,
  onClose,
  onAddNode,
  onSelectAll,
  onClearAll,
  onFitView,
  canPaste,
  onPaste,
}: WorkflowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  // Ekran sınırlarına göre konumlandır
  const menuWidth = 220;
  const menuHeight = 340;
  const left = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
  const top = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;

  const nodeItems = [
    { type: 'triggerNode', icon: '⚡', label: 'Tetikleyici Ekle' },
    { type: 'conditionNode', icon: '🔀', label: 'Koşul Ekle' },
    { type: 'actionNode', icon: '⚙️', label: 'Aksiyon Ekle' },
    { type: 'csharpNode', icon: '</>', label: 'C# Kodu Ekle' },
  ];

  const handleItemClick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div ref={menuRef} style={{ ...menuStyle, left, top }}>
      {/* Blok Ekle */}
      <div style={sectionLabelStyle}>Blok Ekle</div>
      {nodeItems.map((n) => (
        <div
          key={n.type}
          style={itemStyle()}
          onClick={() => handleItemClick(() => onAddNode(n.type, position.flowX, position.flowY))}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            <span>{n.label}</span>
          </span>
        </div>
      ))}

      <div style={dividerStyle} />

      {/* Düzenleme */}
      <div style={sectionLabelStyle}>Düzenle</div>
      <div
        style={itemStyle(false, !canPaste)}
        onClick={() => !canPaste || handleItemClick(onPaste)}
        onMouseEnter={(e) => { if (canPaste) (e.currentTarget as HTMLDivElement).style.background = '#2d2d3f'; }}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📋</span>
          <span>Yapıştır</span>
        </span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>Ctrl+V</span>
      </div>
      <div
        style={itemStyle()}
        onClick={() => handleItemClick(onSelectAll)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⬜</span>
          <span>Tümünü Seç</span>
        </span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>Ctrl+A</span>
      </div>

      <div style={dividerStyle} />

      {/* Görünüm */}
      <div style={sectionLabelStyle}>Görünüm</div>
      <div
        style={itemStyle()}
        onClick={() => handleItemClick(onFitView)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#2d2d3f')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔍</span>
          <span>Tümünü Göster</span>
        </span>
      </div>

      <div style={dividerStyle} />

      {/* Tehlikeli */}
      <div
        style={itemStyle(true)}
        onClick={() => handleItemClick(onClearAll)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(220,38,38,0.1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🗑️</span>
          <span>Tahtayı Temizle</span>
        </span>
      </div>
    </div>
  );
}
