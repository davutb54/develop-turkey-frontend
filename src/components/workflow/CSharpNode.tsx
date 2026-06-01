import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { createPortal } from 'react-dom';
import CSharpHelpPanel from './CSharpHelpPanel';

export type CSharpNodeData = {
  code?: string;
  label?: string;
};

const defaultCode = `// Değişkenlere direkt erişin: SystemUserId, UserScore, ProblemId...
// Son ifadenin değeri sonuç olarak döner.

if ((UserScore ?? 0) > 100)
    return "deneyimli";
return "yeni";`;

function CSharpNode({ data, selected }: NodeProps) {
  const nodeData = data as CSharpNodeData;
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div
        style={{
          background: '#0a0a0a',
          border: selected ? '2px solid #ff6b6b' : '2px solid #dc2626',
          borderRadius: 12,
          padding: '12px 16px',
          minWidth: 280,
          boxShadow: '0 4px 20px rgba(220,38,38,0.5)',
          color: '#fff',
        }}
      >
        {/* Giriş handle */}
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#ff6b6b', width: 12, height: 12, border: '2px solid #dc2626' }}
        />

        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{'</>'}</span>
            <span style={{
              fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
              fontFamily: 'monospace', color: '#f87171',
            }}>
              C# KOD BLOĞU
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* ? Yardım butonu */}
            <button
              className="nodrag"
              title="C# Node Referans Kılavuzu"
              onClick={e => { e.stopPropagation(); setShowHelp(true); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22,
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.5)',
                borderRadius: 6,
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                padding: 0,
              }}
            >
              ?
            </button>

            {/* Süper Admin uyarı rozeti */}
            <div
              title="Bu blok yalnızca Süper Admin tarafından kullanılabilir!"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(220,38,38,0.2)',
                border: '1px solid #dc2626',
                borderRadius: 6, padding: '3px 7px', cursor: 'help',
              }}
            >
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#fca5a5',
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                Süper Admin
              </span>
            </div>
          </div>
        </div>

        {/* Uyarı bandı */}
        <div style={{
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 6, padding: '4px 8px', marginBottom: 8,
          fontSize: 10, color: '#fca5a5',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>🔴</span>
          <span>Dikkat: Ham C# kodu çalıştırır. Güvenlik riski içerebilir.</span>
        </div>

        {/* Kod textarea */}
        <textarea
          defaultValue={nodeData.code || defaultCode}
          rows={8}
          spellCheck={false}
          style={{
            width: '100%',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 6,
            color: '#86efac',
            padding: '8px',
            fontSize: 11,
            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="nodrag"
        />

        {/* Çıkış handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#ff6b6b', width: 12, height: 12, border: '2px solid #dc2626' }}
        />
      </div>

      {/* Yardım paneli — portal ile canvas dışında render edilir */}
      {showHelp && createPortal(
        <CSharpHelpPanel onClose={() => setShowHelp(false)} />,
        document.body
      )}
    </>
  );
}

export default memo(CSharpNode);
