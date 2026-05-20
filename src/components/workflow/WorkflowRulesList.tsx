import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { workflowService } from '../../services/workflowService';
import { useWorkflowStore } from './useWorkflowStore';
import type { DynamicRule } from '../../types';

type Filter = 'all' | 'active' | 'inactive';

interface Props {
  onEdit: (rule: DynamicRule) => void;
  onNew: () => void;
}

export default function WorkflowRulesList({ onEdit, onNew }: Props) {
  const [rules, setRules] = useState<DynamicRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const triggers = useWorkflowStore((s) => s.triggers);

  const getTriggerLabel = (codeName: string) =>
    triggers.find((t) => t.value === codeName)?.label ?? codeName;

  const load = async () => {
    setLoading(true);
    try {
      const res = await workflowService.getRules();
      if (res.data?.success) setRules(res.data.data ?? []);
      else toast.error('Kurallar yüklenemedi.');
    } catch {
      toast.error('Kurallar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleToggle = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await workflowService.toggleActive(id);
      if (res.data?.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
        );
      } else {
        toast.error('Durum değiştirilemedi.');
      }
    } catch {
      toast.error('Durum değiştirilemedi.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const res = await workflowService.deleteRule(id);
      if (res.data?.success) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.success('Kural silindi.');
      } else {
        toast.error('Kural silinemedi.');
      }
    } catch {
      toast.error('Kural silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = rules
    .filter((r) => {
      if (filter === 'active') return r.isActive;
      if (filter === 'inactive') return !r.isActive;
      return true;
    })
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.triggerEvent.toLowerCase().includes(q) ||
        getTriggerLabel(r.triggerEvent).toLowerCase().includes(q)
      );
    });

  // ── styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrap: {
      flex: 1,
      padding: '28px 32px',
      overflowY: 'auto' as const,
      background: '#0f0f1a',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    title: { fontSize: 22, fontWeight: 700, color: '#e2e8f0' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    toolbar: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      marginBottom: 20,
      flexWrap: 'wrap' as const,
    },
    searchInput: {
      background: '#1e1e2e',
      border: '1px solid #2d2d3f',
      borderRadius: 8,
      color: '#e2e8f0',
      padding: '8px 14px',
      fontSize: 13,
      outline: 'none',
      width: 260,
    },
    filterBtn: (active: boolean) => ({
      background: active ? '#4f46e5' : '#1e1e2e',
      border: `1px solid ${active ? '#4f46e5' : '#2d2d3f'}`,
      borderRadius: 8,
      color: active ? '#fff' : '#9ca3af',
      padding: '8px 14px',
      fontSize: 12,
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
    }),
    newBtn: {
      marginLeft: 'auto',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      padding: '8px 18px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      textAlign: 'left' as const,
      padding: '10px 14px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: '#64748b',
      borderBottom: '1px solid #1e1e2e',
      textTransform: 'uppercase' as const,
    },
    tr: (idx: number) => ({
      background: idx % 2 === 0 ? '#13131f' : '#0f0f1a',
      transition: 'background 0.15s',
    }),
    td: {
      padding: '12px 14px',
      fontSize: 13,
      color: '#cbd5e1',
      borderBottom: '1px solid #1a1a2e',
      verticalAlign: 'middle' as const,
    },
    badge: (active: boolean) => ({
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
      color: active ? '#4ade80' : '#64748b',
      border: `1px solid ${active ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.3)'}`,
    }),
    priorityBadge: (p: number) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: p <= 10 ? 'rgba(239,68,68,0.15)' : p <= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
      color: p <= 10 ? '#f87171' : p <= 50 ? '#fbbf24' : '#818cf8',
    }),
    iconBtn: (color: string, disabled?: boolean) => ({
      background: 'transparent',
      border: `1px solid ${disabled ? '#2d2d3f' : color}22`,
      borderRadius: 6,
      color: disabled ? '#374151' : color,
      padding: '5px 9px',
      fontSize: 13,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.15s',
    }),
    toggleWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    toggleTrack: (active: boolean) => ({
      position: 'relative' as const,
      display: 'inline-block',
      width: 40,
      height: 22,
      borderRadius: 11,
      background: active ? '#4f46e5' : '#2d2d3f',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0,
    }),
    toggleThumb: (active: boolean) => ({
      position: 'absolute' as const,
      top: 3,
      left: active ? 21 : 3,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }),
    empty: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#374151',
    },
    confirmOverlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    confirmBox: {
      background: '#1e1e2e',
      border: '1px solid #2d2d3f',
      borderRadius: 12,
      padding: '28px 32px',
      maxWidth: 400,
      width: '90%',
    },
  };

  const confirmTarget = rules.find((r) => r.id === confirmDeleteId);

  return (
    <div style={s.wrap}>
      {/* Başlık */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Kayıtlı Kurallar</div>
          <div style={s.subtitle}>{rules.length} kural · {rules.filter((r) => r.isActive).length} aktif</div>
        </div>
        <button onClick={onNew} style={s.newBtn}>+ Yeni Kural</button>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Kural veya tetikleyici ara..."
          style={s.searchInput}
        />
        {(['all', 'active', 'inactive'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={s.filterBtn(filter === f)}>
            {f === 'all' ? 'Tümü' : f === 'active' ? '● Aktif' : '○ Pasif'}
          </button>
        ))}
      </div>

      {/* Tablo */}
      {loading ? (
        <div style={s.empty}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Yükleniyor...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Kural bulunamadı</div>
          <div style={{ fontSize: 13 }}>
            {search || filter !== 'all'
              ? 'Arama veya filtre kriterini değiştirin.'
              : 'Henüz kaydedilmiş kural yok. Yeni bir kural oluşturun.'}
          </div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Kural Adı</th>
              <th style={s.th}>Tetikleyici</th>
              <th style={s.th}>Öncelik</th>
              <th style={s.th}>Versiyon</th>
              <th style={s.th}>Oluşturulma</th>
              <th style={s.th}>Durum</th>
              <th style={s.th}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rule, idx) => (
              <tr key={rule.id} style={s.tr(idx)}>
                {/* Ad + Açıklama */}
                <td style={s.td}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{rule.name}</div>
                  {rule.description && (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rule.description}
                    </div>
                  )}
                </td>

                {/* Tetikleyici */}
                <td style={s.td}>
                  <div style={{ color: '#a5b4fc', fontWeight: 500 }}>
                    {getTriggerLabel(rule.triggerEvent)}
                  </div>
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                    {rule.triggerEvent}
                  </div>
                </td>

                {/* Öncelik */}
                <td style={s.td}>
                  <span style={s.priorityBadge(rule.priority)}>{rule.priority}</span>
                </td>

                {/* Versiyon */}
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>v{rule.version}</span>
                </td>

                {/* Tarih */}
                <td style={s.td}>
                  <span style={{ fontSize: 12 }}>
                    {new Date(rule.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </td>

                {/* Durum toggle */}
                <td style={s.td}>
                  <div style={s.toggleWrap}>
                    <div
                      style={s.toggleTrack(rule.isActive)}
                      onClick={() => togglingId == null && handleToggle(rule.id)}
                      title={rule.isActive ? 'Pasife al' : 'Aktife al'}
                    >
                      <div style={s.toggleThumb(rule.isActive)} />
                    </div>
                    <span style={s.badge(rule.isActive)}>
                      {rule.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </td>

                {/* İşlemler */}
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      title="Düzenle"
                      onClick={() => onEdit(rule)}
                      style={s.iconBtn('#818cf8')}
                    >
                      ✏️
                    </button>
                    <button
                      title="Sil"
                      onClick={() => setConfirmDeleteId(rule.id)}
                      disabled={deletingId === rule.id}
                      style={s.iconBtn('#f87171', deletingId === rule.id)}
                    >
                      {deletingId === rule.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Silme onay modalı */}
      {confirmDeleteId !== null && (
        <div style={s.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div style={s.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 22, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Kuralı sil?
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
              <strong style={{ color: '#e2e8f0' }}>{confirmTarget?.name}</strong> kuralı kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8, color: '#9ca3af', padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                style={{ background: '#dc2626', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
