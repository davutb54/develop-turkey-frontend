import { useState } from 'react';

type Tab = 'vars' | 'examples' | 'limits';

const VAR_GROUPS = [
    {
        title: 'Tetikleyen Kullanıcı',
        color: '#60a5fa',
        vars: [
            { name: 'SystemUserId',        type: 'int',    desc: 'Kullanıcı ID' },
            { name: 'UserRole',            type: 'string', desc: '"User", "Expert", "Admin" vb.' },
            { name: 'UserScore',           type: 'int?',   desc: 'Toplam puan' },
            { name: 'UserProblemCount',    type: 'int?',   desc: 'Açtığı problem sayısı' },
            { name: 'InstitutionId',       type: 'int?',   desc: 'Bağlı kurum ID' },
            { name: 'UserIsBanned',        type: 'bool?',  desc: 'Banlandı mı?' },
            { name: 'UserIsEmailVerified', type: 'bool?',  desc: 'E-posta doğrulandı mı?' },
        ],
    },
    {
        title: 'Hedef Kullanıcı',
        color: '#a78bfa',
        vars: [
            { name: 'TargetUserId',             type: 'int?',   desc: 'Hedef kullanıcı ID' },
            { name: 'TargetUserRole',            type: 'string?', desc: 'Hedef kullanıcı rolü' },
            { name: 'TargetUserScore',           type: 'int?',   desc: 'Hedef kullanıcı puanı' },
            { name: 'TargetUserInstitutionId',   type: 'int?',   desc: 'Hedef kullanıcı kurumu' },
            { name: 'TargetUserIsBanned',        type: 'bool?',  desc: 'Hedef banlandı mı?' },
            { name: 'TargetUserIsEmailVerified', type: 'bool?',  desc: 'Hedef e-postası doğrulandı mı?' },
        ],
    },
    {
        title: 'Problem',
        color: '#34d399',
        vars: [
            { name: 'ProblemId',           type: 'int?',    desc: 'Problem ID' },
            { name: 'ProblemOwnerId',      type: 'int?',    desc: 'Problem sahibi ID' },
            { name: 'ProblemStatus',       type: 'string?', desc: '"Open" veya "Resolved"' },
            { name: 'ProblemDifficulty',   type: 'string?', desc: 'Zorluk seviyesi' },
            { name: 'ProblemViewCount',    type: 'int?',    desc: 'Görüntülenme sayısı' },
            { name: 'ProblemSolutionCount',type: 'int?',    desc: 'Çözüm sayısı' },
            { name: 'ProblemUpvoteCount',  type: 'int?',    desc: 'Oy sayısı' },
            { name: 'ProblemIsHighlighted',type: 'bool?',   desc: 'Öne çıkarıldı mı?' },
            { name: 'ProblemIsReported',   type: 'bool?',   desc: 'Şikayet edildi mi?' },
        ],
    },
    {
        title: 'Çözüm',
        color: '#fbbf24',
        vars: [
            { name: 'SolutionId',             type: 'int?',  desc: 'Çözüm ID' },
            { name: 'SolutionOwnerId',        type: 'int?',  desc: 'Çözüm sahibi ID' },
            { name: 'SolutionVoteCount',      type: 'int?',  desc: 'Oy sayısı' },
            { name: 'SolutionApprovalStatus', type: 'int?',  desc: '0=Bekliyor 1=Onaylandı 2=Reddedildi' },
            { name: 'SolutionIsHighlighted',  type: 'bool?', desc: 'Öne çıkarıldı mı?' },
            { name: 'SolutionIsReported',     type: 'bool?', desc: 'Şikayet edildi mi?' },
        ],
    },
    {
        title: 'Olay & Meta',
        color: '#f87171',
        vars: [
            { name: 'TriggerEventName', type: 'string',   desc: '"auth.registered", "problem.created" vb.' },
            { name: 'OldValue',         type: 'string',   desc: 'Güncelleme öncesi değer' },
            { name: 'NewValue',         type: 'string',   desc: 'Güncelleme sonrası değer' },
            { name: 'CommentId',        type: 'int?',     desc: 'Yorum ID' },
            { name: 'ExecutedAt',       type: 'DateTime', desc: 'Çalışma zamanı (UTC)' },
        ],
    },
    {
        title: 'Snapshot\'lar (JSON)',
        color: '#94a3b8',
        vars: [
            { name: 'UserSnapshot',       type: 'JsonElement?', desc: '.GetProperty("email").GetString()' },
            { name: 'TargetUserSnapshot', type: 'JsonElement?', desc: '.GetProperty("userName").GetString()' },
            { name: 'ProblemSnapshot',    type: 'JsonElement?', desc: '.GetProperty("title").GetString()' },
            { name: 'SolutionSnapshot',   type: 'JsonElement?', desc: '.GetProperty("content").GetString()' },
        ],
    },
];

const EXAMPLES = [
    {
        title: 'Basit koşul',
        code: `// Kullanıcı deneyimli mi?
if ((UserProblemCount ?? 0) >= 10)
    return "deneyimli";
return "yeni";`,
    },
    {
        title: 'Puan hesaplama',
        code: `var score = UserScore ?? 0;
var problems = UserProblemCount ?? 0;
var weighted = score * 0.7 + problems * 10 * 0.3;
return weighted.ToString("F1");`,
    },
    {
        title: 'StringBuilder ile metin',
        code: `var sb = new StringBuilder();
sb.Append($"Kullanıcı #{SystemUserId}");
if (UserIsBanned == true) sb.Append(" [BANLANDI]");
if ((UserScore ?? 0) > 500) sb.Append(" ⭐ VIP");
return sb.ToString();`,
    },
    {
        title: 'Snapshot\'tan alan okuma',
        code: `if (!UserSnapshot.HasValue)
    return "snapshot yok";
var email = UserSnapshot.Value
    .GetProperty("email").GetString();
return $"E-posta: {email}";`,
    },
    {
        title: 'Nullable güvenli kullanım',
        code: `// ?? ile null fallback
var score  = UserScore ?? 0;
var views  = ProblemViewCount ?? 0;
var isNew  = score < 50 && views == 0;
return isNew ? "yeni_kullanici" : "aktif";`,
    },
    {
        title: 'LINQ ile liste',
        code: `var items = new List<int>
    { UserScore ?? 0, TargetUserScore ?? 0 };
var max = items.Max();
var avg = items.Average();
return $"Max:{max} Ort:{avg:F0}";`,
    },
];

const LIMITS = [
    { icon: '✅', label: 'System', desc: 'DateTime, Math, Convert, Console, Random, Exception vb.' },
    { icon: '✅', label: 'System.Linq', desc: 'Where, Select, OrderBy, Max, Min, Average, Count vb.' },
    { icon: '✅', label: 'System.Collections.Generic', desc: 'List<T>, Dictionary<K,V>, HashSet<T> vb.' },
    { icon: '✅', label: 'System.Text', desc: 'StringBuilder, Encoding vb.' },
    { icon: '✅', label: 'System.Text.Json', desc: 'JsonElement snapshot erişimi için (otomatik gelir)' },
    { icon: '❌', label: 'HttpClient / WebClient', desc: 'Ağ çağrıları yasak' },
    { icon: '❌', label: 'File / Directory / IO', desc: 'Dosya sistemi erişimi yasak' },
    { icon: '❌', label: 'Process / Assembly', desc: 'Process başlatma yasak' },
    { icon: '❌', label: 'Reflection (çoğu)', desc: 'Type.GetMethods() vb. kısıtlı' },
    { icon: '❌', label: 'using ekleyemezsiniz', desc: 'Yukarıdakiler dışında namespace eklenemez' },
    { icon: '⏱️', label: '30 saniye timeout', desc: 'Süre aşılırsa node zaman aşımı hatası verir' },
    { icon: '⚠️', label: 'context. prefix yok', desc: 'Değişkenlere direkt erişin: SystemUserId (✓) context.SystemUserId (✗)' },
    { icon: '📌', label: 'Son ifade = sonuç', desc: 'return yazmak opsiyonel, son ifadenin değeri döner' },
];

interface Props {
    onClose: () => void;
}

export default function CSharpHelpPanel({ onClose }: Props) {
    const [tab, setTab] = useState<Tab>('vars');

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                pointerEvents: 'none',
            }}
        >
            {/* Backdrop — sadece panel alanı dışı tıklanınca kapat */}
            <div
                style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                style={{
                    position: 'relative',
                    width: 480,
                    height: '100vh',
                    background: '#0f172a',
                    borderLeft: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto',
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px 0',
                    borderBottom: '1px solid #1e293b',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{'</>'}</span>
                            <div>
                                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>C# Node Referans</div>
                                <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>Kılavuz & Örnekler</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: '1px solid #1e293b',
                                borderRadius: 6,
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                fontSize: 14,
                            }}
                        >✕</button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 2, marginBottom: -1 }}>
                        {([
                            { key: 'vars',     label: 'Değişkenler' },
                            { key: 'examples', label: 'Örnekler' },
                            { key: 'limits',   label: 'Kısıtlamalar' },
                        ] as { key: Tab; label: string }[]).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: tab === t.key ? '2px solid #60a5fa' : '2px solid transparent',
                                    color: tab === t.key ? '#60a5fa' : '#64748b',
                                    cursor: 'pointer',
                                    padding: '6px 14px',
                                    fontSize: 13,
                                    fontWeight: tab === t.key ? 600 : 400,
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

                    {/* ── VARIABLES TAB ─────────────────────────────────────────── */}
                    {tab === 'vars' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
                                Tüm değişkenlere <strong style={{ color: '#f1f5f9' }}>direkt</strong> erişin —{' '}
                                <code style={{ color: '#86efac' }}>SystemUserId</code> yazın,{' '}
                                <code style={{ color: '#fca5a5', textDecoration: 'line-through' }}>context.SystemUserId</code> değil.
                            </div>

                            {VAR_GROUPS.map(g => (
                                <div key={g.title}>
                                    <div style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: g.color,
                                        letterSpacing: 1,
                                        textTransform: 'uppercase',
                                        marginBottom: 8,
                                    }}>
                                        {g.title}
                                    </div>
                                    <div style={{
                                        background: '#0a0f1e',
                                        borderRadius: 8,
                                        border: '1px solid #1e293b',
                                        overflow: 'hidden',
                                    }}>
                                        {g.vars.map((v, i) => (
                                            <div key={v.name} style={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: 10,
                                                padding: '7px 14px',
                                                borderTop: i > 0 ? '1px solid #1e293b' : 'none',
                                            }}>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: 12,
                                                    color: '#86efac',
                                                    minWidth: 180,
                                                    flexShrink: 0,
                                                }}>
                                                    {v.name}
                                                </span>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: 10,
                                                    color: '#7dd3fc',
                                                    minWidth: 80,
                                                    flexShrink: 0,
                                                }}>
                                                    {v.type}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                                    {v.desc}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── EXAMPLES TAB ──────────────────────────────────────────── */}
                    {tab === 'examples' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
                                Son ifadenin değeri veya <code style={{ color: '#86efac' }}>return</code> değeri sonuç olarak döner.
                                Sonuç şu an log'a yazılır.
                            </div>

                            {EXAMPLES.map(ex => (
                                <div key={ex.title} style={{
                                    background: '#0a0f1e',
                                    border: '1px solid #1e293b',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '8px 14px',
                                        borderBottom: '1px solid #1e293b',
                                        fontSize: 12,
                                        color: '#94a3b8',
                                        fontWeight: 600,
                                    }}>
                                        {ex.title}
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: '12px 14px',
                                        fontFamily: '"Fira Code", "Cascadia Code", monospace',
                                        fontSize: 11,
                                        color: '#86efac',
                                        lineHeight: 1.6,
                                        overflowX: 'auto',
                                        whiteSpace: 'pre',
                                    }}>
                                        {ex.code}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── LIMITS TAB ────────────────────────────────────────────── */}
                    {tab === 'limits' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                                Sandbox izole bir process içinde çalışır. Ağ, dosya sistemi ve çoğu sistem
                                API'sine erişim kasıtlı olarak engellenmiştir.
                            </div>

                            {LIMITS.map(l => (
                                <div key={l.label} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    background: '#0a0f1e',
                                    border: '1px solid #1e293b',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                }}>
                                    <span style={{ fontSize: 16, flexShrink: 0 }}>{l.icon}</span>
                                    <div>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            color: '#f1f5f9',
                                            fontWeight: 600,
                                            marginBottom: 2,
                                        }}>
                                            {l.label}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>
                                            {l.desc}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
