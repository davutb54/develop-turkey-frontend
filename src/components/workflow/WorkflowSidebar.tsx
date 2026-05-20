import type { DragEvent } from 'react';

type BlockItem = {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
};

const blockItems: BlockItem[] = [
  {
    type: 'triggerNode',
    label: 'Tetikleyici',
    description: 'Kuralı başlatan olay',
    icon: '⚡',
    color: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderColor: '#1d4ed8',
  },
  {
    type: 'conditionNode',
    label: 'Koşul',
    description: 'Alan / Operatör / Değer',
    icon: '🔀',
    color: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
    borderColor: '#b45309',
  },
  {
    type: 'actionNode',
    label: 'Aksiyon',
    description: 'Gerçekleştirilecek işlem',
    icon: '⚙️',
    color: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    borderColor: '#5b21b6',
  },
  {
    type: 'csharpNode',
    label: 'C# Kodu',
    description: '⚠️ Yalnızca Süper Admin',
    icon: '</>',
    color: 'linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 100%)',
    borderColor: '#dc2626',
  },
];

function WorkflowSidebar() {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: 200,
        minWidth: 200,
        background: '#1e1e2e',
        borderRight: '1px solid #2d2d3f',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
      }}
    >
      {/* Başlık */}
      <div style={{ marginBottom: 12 }}>
        <h3
          style={{
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          🧩 Bloklar
        </h3>
        <p style={{ color: '#64748b', fontSize: 11, margin: '4px 0 0 0' }}>
          Tahtaya sürükleyip bırakın
        </p>
      </div>

      {/* Blok kartları */}
      {blockItems.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          style={{
            background: item.color,
            border: `2px solid ${item.borderColor}`,
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'grab',
            userSelect: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px rgba(0,0,0,0.4)`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{item.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 }}>
                {item.description}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Alt bilgi */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid #2d2d3f',
          color: '#475569',
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0 }}>💡 Blokları birbirine bağlamak için çıkış noktasından sürükleyin.</p>
      </div>
    </aside>
  );
}

export default WorkflowSidebar;
