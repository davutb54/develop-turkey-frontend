# DevelopTurkey Frontend

React 19 + TypeScript + Tailwind CSS 4 — DevelopTurkey platformunun istemci tarafı.

## Teknoloji Yığını

| Paket | Versiyon | Kullanım |
|-------|----------|----------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Tip güvenliği |
| Vite | 7 | Build aracı |
| Tailwind CSS | 4 | Stil |
| React Router | 7 | Yönlendirme |
| Zustand | 5 | Global state |
| Axios | 1 | HTTP istekleri |
| @xyflow/react | 12 | Workflow kanvas (React Flow) |
| @microsoft/signalr | 10 | Gerçek zamanlı bildirim / sohbet |
| Tiptap | 3 | Zengin metin editörü |
| React Leaflet | 5 | Harita |
| Recharts | 3 | Grafikler ve metrikler |

## Kurulum

### Gereksinimler

- Node.js 20+
- npm 10+

### Geliştirme

```bash
npm install
npm run dev
# http://localhost:5173
```

### Production Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Proje Yapısı

```
src/
├── context/
│   ├── AuthContext.tsx        # JWT, capabilities: Set<string>, hasCapability()
│   ├── FeatureContext.tsx     # Kurum feature flag'leri, subdomain çözümleme
│   └── ChatContext.tsx        # SignalR bağlantısı, mesajlar, okunmamış sayaç
├── hooks/
│   └── useCapability.ts       # useCapability("admin.xxx") hook'u
├── components/
│   ├── auth/
│   │   └── Can.tsx            # <Can capability="..."> bileşeni
│   ├── workflow/              # ReactFlow node'ları, store'lar, sidebar
│   ├── SenderBadges.tsx       # Kullanıcı rozet/unvan bileşeni
│   ├── FloatingChatWidget.tsx # Sağ alt yüzen sohbet widgeti
│   └── SupportWidget.tsx      # Hiyerarşik destek talep butonu
├── pages/
│   ├── admin/
│   │   ├── AdminLayout.tsx    # Sol sidebar + <Outlet />, mobil hamburger menü
│   │   ├── WorkflowBuilder.tsx # Görsel kural editörü
│   │   ├── tabs/              # 16+ admin panel sekmesi
│   │   └── dashboard/         # Metrik sayfaları (Overview, Workflow, User, System...)
│   ├── Home.tsx
│   ├── ProblemDetail.tsx
│   ├── Profile.tsx
│   └── ...
└── services/                  # API client fonksiyonları (axios)
```

## Yetkilendirme

Platform, sunucu tarafıyla uyumlu **capability tabanlı** erişim kontrolü kullanır. Giriş sonrası backend'den gelen `effectiveCapabilities` dizisi `AuthContext`'te `Set<string>` olarak tutulur.

```tsx
// Hook kullanımı
const canBan = useCapability('admin.user_ban');
{canBan && <BanButton />}

// Bileşen kullanımı
<Can capability="admin.rule_create">
  <SaveButton />
</Can>

// Birden fazla (herhangi biri yeterli)
<Can capability={['admin.system_access', 'expert.workflow_test_run']}>
  <TestRunButton />
</Can>
```

## Workflow Builder

`/admin/workflow` altındaki görsel kural editörü:

- **Sürükle-bırak kanvas** — TriggerNode, ConditionNode, ActionNode
- **Undo / Redo** — 50 adım geçmiş (Ctrl+Z / Ctrl+Y)
- **Arama** — Ctrl+F ile node filtreleme ve navigasyon
- **Test-Run** — Kayıtlı kuralı gerçek veriyle test etme
- **Çalışmalar sekmesi** — WorkflowRun / NodeRun / ActionRun geçmişi
- **Node Inspector** — Çift tıklama ile sağ panel (renk, etiket, action parametreleri)
- **Capability gating** — `workflow.action.{actionCode}` ile action filtreleme

## Admin Paneli

`/admin` altında 16+ sekme:

| Sekme | Gerekli Capability |
|-------|--------------------|
| Dashboard | `admin.system_access` |
| Kullanıcılar | `page.admin.users` |
| Problemler | `page.admin.problems` |
| Yetkiler | `page.admin.capabilities` |
| Şablonlar | `page.admin.templates` |
| Workflow | `page.admin.workflow` |
| Güvenlik | `admin.security_monitor` |
| Sohbet | `page.admin.chat` |

## Sohbet Sistemi

- `ChatContext` — SignalR bağlantısı, konuşma listesi, mesaj state'i
- `ChatPanel` — Konuşma listesi (arama + tip/durum filtresi) + mesaj görünümü
- `FloatingChatWidget` — Admin paneli dışındaki kullanıcılar için yüzen widget
- `SupportWidget` — Capability'e göre hiyerarşik destek butonu (Destek Al / Yöneticiye Ulaş / Admine Ulaş)

## Feature Flag Sistemi

`FeatureContext` hostname'den subdomain'i çıkarır ve kuruma ait feature flag'lerini API'den yükler.

```tsx
const chatEnabled = useFeature('Communication.EnableChat');
{chatEnabled && <ChatPanel />}
```
