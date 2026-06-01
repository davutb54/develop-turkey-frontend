import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActionDefinition,
  ActionParameter,
  FieldDefinition,
  OperatorDefinition,
  TriggerDefinition,
  WorkflowActionDto,
  WorkflowFieldDto,
  WorkflowTriggerDto,
} from '../../types';
import { workflowService } from '../../services/workflowService';
import { capabilityService, type CapabilityDto, type CapabilityTemplateDto } from '../../services/capabilityService';

export type {
  ActionDefinition,
  ActionParameter,
  FieldDefinition,
  OperatorDefinition,
  TriggerDefinition,
};

// ─── Varsayılan Veriler ───────────────────────────────────────────────────────

const defaultTriggers: TriggerDefinition[] = [
  { id: 't1', value: 'user_registered', label: 'Kullanıcı Kayıt Oldu', description: 'Yeni bir kullanıcı sisteme kayıt olduğunda', icon: 'g���', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't2', value: 'user_login', label: 'Kullanıcı Giriş Yaptı', description: 'Kullanıcı sisteme giriş yaptığında', icon: 'g���', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't3', value: 'user_banned', label: 'Kullanıcı Yasaklandı', description: 'Bir kullanıcı yasaklandığında', icon: 'g���', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't4', value: 'problem_created', label: 'Problem Oluşturuldu', description: 'Yeni bir problem eklendiğinde', icon: 'g���', category: 'Problem', isBuiltIn: true },
  { id: 't5', value: 'problem_solved', label: 'Problem Çözüldü', description: 'Bir problem çözüldü olarak işaretlendiğinde', icon: '✅', category: 'Problem', isBuiltIn: true },
  { id: 't6', value: 'problem_reported', label: 'Problem Şikayet Edildi', description: 'Bir problem şikayet edildiğinde', icon: 'g���', category: 'Problem', isBuiltIn: true },
  { id: 't7', value: 'comment_added', label: 'Yorum Eklendi', description: 'Bir probleme yorum eklendiğinde', icon: 'g���', category: 'İçerik', isBuiltIn: true },
  { id: 't8', value: 'badge_earned', label: 'Rozet Kazanıldı', description: 'Kullanıcı rozet kazandığında', icon: 'g���', category: 'Gamification', isBuiltIn: true },
  { id: 't9', value: 'score_changed', label: 'Puan Değişti', description: 'Kullanıcı puanı değiştiğinde', icon: '⭐', category: 'Gamification', isBuiltIn: true },
];

const defaultFields: FieldDefinition[] = [
  { id: 'f1', value: 'user.role', label: 'Kullanıcı Rolü', type: 'enum', enumValues: ['Admin', 'User', 'Moderator'], category: 'Kullanıcı' },
  { id: 'f2', value: 'user.score', label: 'Kullanıcı Puanı', type: 'number', category: 'Kullanıcı' },
  { id: 'f3', value: 'user.problemCount', label: 'Problem Sayısı', type: 'number', category: 'Kullanıcı' },
  { id: 'f4', value: 'user.isVerified', label: 'E-posta Doğrulandı mı', type: 'boolean', category: 'Kullanıcı' },
  { id: 'f5', value: 'user.isBanned', label: 'Yasaklı mı', type: 'boolean', category: 'Kullanıcı' },
  { id: 'f6', value: 'problem.difficulty', label: 'Problem Zorluğu', type: 'enum', enumValues: ['Kolay', 'Orta', 'Zor', 'Uzman'], category: 'Problem' },
  { id: 'f7', value: 'problem.status', label: 'Problem Durumu', type: 'enum', enumValues: ['Açık', 'Çözüldü', 'Kapalı'], category: 'Problem' },
  { id: 'f8', value: 'problem.viewCount', label: 'Görüntülenme Sayısı', type: 'number', category: 'Problem' },
  { id: 'f9', value: 'comment.length', label: 'Yorum Uzunluğu', type: 'number', category: 'İçerik' },
  { id: 'f10', value: 'comment.hasCode', label: 'Kod İçeriyor mu', type: 'boolean', category: 'İçerik' },
];

const defaultOperators: OperatorDefinition[] = [
  { id: 'op1', value: 'eq', label: '= Eşittir', applicableTo: ['string', 'number', 'boolean', 'enum'] },
  { id: 'op2', value: 'neq', label: '≠ Eşit Değil', applicableTo: ['string', 'number', 'boolean', 'enum'] },
  { id: 'op3', value: 'gt', label: '> Büyüktür', applicableTo: ['number'] },
  { id: 'op4', value: 'gte', label: '≥ Büyük Eşit', applicableTo: ['number'] },
  { id: 'op5', value: 'lt', label: '< Küçüktür', applicableTo: ['number'] },
  { id: 'op6', value: 'lte', label: '≤ Küçük Eşit', applicableTo: ['number'] },
  { id: 'op7', value: 'contains', label: '⊃ İçerir', applicableTo: ['string'] },
  { id: 'op8', value: 'startsWith', label: '▷ İle Başlar', applicableTo: ['string'] },
  { id: 'op9', value: 'endsWith', label: '◁ İle Biter', applicableTo: ['string'] },
  { id: 'op10', value: 'in', label: '∈ Listede', applicableTo: ['string', 'enum'] },
];


// ─── Trigger → Context Field Mapping ────────────────────────────────────────
// Her trigger event'i için RuleContext'te hangi fieldlar dolu gelir?
// '*' = tüm triggerlar için her zaman mevcut

const TRIGGER_CONTEXT_MAP: Record<string, string[]> = {
  '*': ['SystemUserId', 'InstitutionId', 'UserRole', 'UserScore', 'UserProblemCount', 'UserIsBanned', 'UserIsEmailVerified', 'TriggerEventName'],

  // Auth
  'auth':                         ['IpAddress'],
  'auth.locked_out':              ['LockoutMinutes', 'LockoutCount'],
  'auth.impersonated':            ['TargetUserId', 'AdminId'],
  'auth.impersonation_reverted':  ['TargetUserId', 'AdminId'],
  'auth.password_changed':        ['OldValue', 'NewValue'],
  'auth.login_failed':            ['IpAddress'],

  // User
  'user':                    ['TargetUserId', 'UserScore'],
  'user.updated':            ['OldValue', 'NewValue'],
  'user.username_changed':   ['OldValue', 'NewValue'],
  'user.institution_changed':['OldValue', 'NewValue'],
  'user.role_changed':       ['OldValue', 'NewValue', 'RoleName'],
  'user.warning_issued':     ['WarningId', 'Severity'],
  'user.warning_revoked':    ['WarningId'],
  'user.banned':             ['AdminId'],
  'user.reported':           ['TargetId'],
  'user.unreported':         ['TargetId'],

  // Problem
  'problem':                 ['ProblemId', 'TargetUserId', 'ProblemStatus', 'ProblemDifficulty'],
  'problem.updated':         ['OldValue', 'NewValue'],
  'problem.topic_removed':   ['TopicId'],
  'problem.upvoted':         ['IsUpvote'],
  'problem.unvoted':         ['IsUpvote'],

  // Solution
  'solution':                ['SolutionId', 'ProblemId', 'TargetUserId'],
  'solution.updated':        ['OldValue', 'NewValue'],
  'solution.upvoted':        ['IsUpvote'],
  'solution.downvoted':      ['IsUpvote'],
  'solution.vote_changed':   ['IsUpvote'],

  // Comment
  'comment':                 ['CommentId', 'SolutionId', 'TargetUserId'],
  'comment.updated':         ['OldValue', 'NewValue'],

  // Topic
  'topic':                   ['TopicId', 'TargetUserId'],
  'topic.updated':           ['OldValue', 'NewValue'],

  // Report
  'report':                  ['TargetUserId', 'TargetId', 'TargetType'],

  // Feedback
  'feedback':                ['TargetUserId'],

  // Legal
  'legal':                   ['AgreementId'],

  // Institution
  'institution':             ['TargetId', 'OldValue', 'NewValue'],
  'institution.feature_changed': ['FeatureKey'],

  // System
  'system':                  ['OldValue', 'NewValue'],
};

/** Verilen trigger için geçerli olan fieldPath kümesini döner. */
export function getAvailableFieldPaths(trigger: string): Set<string> {
  const paths = new Set<string>(TRIGGER_CONTEXT_MAP['*'] ?? []);
  if (!trigger) return paths;
  const category = trigger.split('.')[0];
  (TRIGGER_CONTEXT_MAP[category] ?? []).forEach(p => paths.add(p));
  (TRIGGER_CONTEXT_MAP[trigger] ?? []).forEach(p => paths.add(p));

  // Dinamik cross-entity field'ları otomatik ekle
  if (paths.has('TargetUserId')) {
    paths.add('TargetUserRole');
    paths.add('TargetUserScore');
    paths.add('TargetUserInstitutionId');
    paths.add('TargetUserIsBanned');
    paths.add('TargetUserIsAdmin');
    paths.add('TargetUserIsExpert');
    paths.add('TargetUserIsOfficial');
    paths.add('TargetUserIsEmailVerified');
  }
  if (paths.has('ProblemId')) {
    paths.add('ProblemOwnerId');
    paths.add('ProblemInstitutionId');
    paths.add('ProblemViewCount');
    paths.add('ProblemSolutionCount');
    paths.add('ProblemUpvoteCount');
    paths.add('ProblemFollowerCount');
    paths.add('ProblemIsHighlighted');
    paths.add('ProblemIsReported');
  }
  if (paths.has('SolutionId')) {
    paths.add('SolutionOwnerId');
    paths.add('SolutionInstitutionId');
    paths.add('SolutionVoteCount');
    paths.add('SolutionApprovalStatus');
    paths.add('SolutionIsHighlighted');
    paths.add('SolutionIsReported');
  }

  return paths;
}

/** Verilen trigger ve field için dinamik (bağlama özel) açıklama döndürür. */
export function getDynamicFieldDescription(fieldValue: string, trigger: string): string {
  const baseDesc = FIELD_DESCRIPTIONS[fieldValue] || '';
  
  if (fieldValue === 'TargetUserId') {
    if (trigger === 'user.banned' || trigger === 'user.unbanned') return "Yasaklanan/Yasağı kaldırılan kullanıcının ID'si.";
    if (trigger === 'user.warning_issued' || trigger === 'user.warning_revoked') return "Uyarı alan/Uyarısı kalkan kullanıcının ID'si.";
    if (trigger === 'auth.impersonated' || trigger === 'auth.impersonation_reverted') return "Hesabına girilen (impersonate edilen) hedefin ID'si.";
    if (trigger.startsWith('report.')) return "Raporlanan (şikayet edilen) içerik sahibinin ID'si.";
    if (trigger.startsWith('problem.') || trigger.startsWith('solution.') || trigger.startsWith('comment.') || trigger.startsWith('topic.')) return "İçeriği oluşturan yazarın (sahibinin) kullanıcı ID'si.";
    return "İşlemden etkilenen hedef kullanıcının ID'si.";
  }
  
  if (fieldValue === 'OldValue' || fieldValue === 'NewValue') {
    const isOld = fieldValue === 'OldValue';
    if (trigger === 'user.role_changed') return isOld ? "Kullanıcının önceki rolü." : "Kullanıcının atandığı yeni rol.";
    if (trigger === 'user.username_changed') return isOld ? "Eski kullanıcı adı." : "Yeni kullanıcı adı.";
    if (trigger === 'institution.feature_changed') return isOld ? "Özelliğin eski değeri." : "Özelliğin yeni (güncel) değeri.";
    if (trigger === 'auth.password_changed') return isOld ? "Eski şifre (hash)." : "Yeni şifre (hash).";
  }

  if (fieldValue === 'SystemUserId') {
    if (trigger.startsWith('auth.')) return "Giriş/Kimlik doğrulama işlemini yapan kullanıcının ID'si.";
    if (trigger.startsWith('user.') && trigger !== 'user.updated') return "İşlemi gerçekleştiren (örn. işlemi yapan admin) kullanıcının ID'si.";
  }

  if (fieldValue === 'IpAddress') {
    if (trigger === 'auth.login_failed') return "Başarısız giriş denemesi yapılan cihazın IP adresi.";
  }

  if (fieldValue === 'AdminId') {
    if (trigger === 'user.banned' || trigger === 'user.unbanned') return "Yasaklama/kaldırma işlemini yapan yöneticinin ID'si.";
    if (trigger === 'auth.impersonated') return "Geçiş yapan (impersonate eden) yöneticinin ID'si.";
  }

  return baseDesc;
}

/** Tüm field listesinden verilen trigger'a uygun olanları filtreler ve açıklamaları dinamikleştirir. */
export function filterFieldsForTrigger(
  allFields: FieldDefinition[],
  trigger: string,
): FieldDefinition[] {
  if (!trigger) return []; // Eğer trigger yoksa, koşul listesi boş döner (Null safety)
  const available = getAvailableFieldPaths(trigger);
  return allFields
    .filter(f => available.has(f.value))
    .map(f => ({
      ...f,
      description: getDynamicFieldDescription(f.value, trigger)
    }));
}

// ─── Field Açıklamaları ───────────────────────────────────────────────────────
const FIELD_DESCRIPTIONS: Record<string, string> = {
  SystemUserId:       'Olayı tetikleyen kullanıcının sistem ID\'si (giriş yapan kişi).',
  InstitutionId:      'Olayın gerçekleştiği kurumun ID\'si.',
  UserRole:           'Tetikleyen kullanıcının rolü: User, Admin, Expert, Official, SuperAdmin.',
  TriggerEventName:   'Tetiklenen olayın kod adı (örn. problem.created).',
  TargetUserId:       'Aksiyonun hedef alacağı kullanıcı ID\'si (örn. yasaklanan, uyarılan kişi).',
  UserScore:          'Tetikleyen kullanıcının anlık puan değeri.',
  UserProblemCount:   'Tetikleyen kullanıcının toplam problem sayısı.',
  OldValue:           'Güncelleme öncesi eski değer (metin formatında).',
  NewValue:           'Güncelleme sonrası yeni değer (metin formatında).',
  UserIsBanned:       'Tetikleyen kullanıcının yasaklılık durumu.',
  UserIsEmailVerified:'Tetikleyen kullanıcının e-posta doğrulama durumu.',
  TargetUserRole:     'Hedef kullanıcının rolü.',
  TargetUserScore:    'Hedef kullanıcının puanı.',
  TargetUserInstitutionId: 'Hedef kullanıcının kurum ID\'si.',
  TargetUserIsBanned: 'Hedef kullanıcının yasaklılık durumu.',
  TargetUserIsAdmin:  'Hedef kullanıcı Admin mi?',
  TargetUserIsExpert: 'Hedef kullanıcı Uzman mı?',
  TargetUserIsOfficial:'Hedef kullanıcı Resmi Yetkili mi?',
  TargetUserIsEmailVerified: 'Hedef kullanıcının e-posta doğrulama durumu.',
  ProblemId:          'Olaya konu olan problemin ID\'si.',
  ProblemOwnerId:     'Problemi oluşturan kişinin ID\'si.',
  ProblemInstitutionId:'Problemin ait olduğu kurumun ID\'si.',
  ProblemStatus:      'Problemin durumu: open (açık) veya resolved (çözüldü).',
  ProblemDifficulty:  'Problemin zorluk seviyesi: easy, medium, hard veya expert.',
  ProblemViewCount:   'Problemin görüntülenme sayısı.',
  ProblemSolutionCount:'Probleme gelen çözüm sayısı.',
  ProblemUpvoteCount: 'Problemin aldığı olumlu oy sayısı.',
  ProblemFollowerCount:'Problemin takipçi sayısı.',
  ProblemIsHighlighted:'Problem öne çıkarılmış mı?',
  ProblemIsReported:  'Problem şikayet edilmiş mi?',
  SolutionId:         'Olaya konu olan çözümün ID\'si.',
  SolutionOwnerId:    'Çözümü yazan kişinin ID\'si.',
  SolutionInstitutionId:'Çözümün ait olduğu kurumun ID\'si.',
  SolutionVoteCount:  'Çözümün oy sayısı.',
  SolutionApprovalStatus:'Çözümün uzman onayı durumu (0=Bekliyor, 1=Onaylandı, 2=Reddedildi).',
  SolutionIsHighlighted:'Çözüm öne çıkarılmış mı?',
  SolutionIsReported: 'Çözüm şikayet edilmiş mi?',
  CommentId:          'Olaya konu olan yorumun ID\'si.',
  TopicId:            'Olaya konu olan konunun (topic) ID\'si.',
  AgreementId:        'Olaya konu olan yasal sözleşmenin ID\'si.',
  WarningId:          'Verilen veya geri alınan uyarının ID\'si.',
  TargetId:           'Hedef içeriğin (rapor, kurum vb.) genel ID\'si.',
  AdminId:            'İşlemi gerçekleştiren yöneticinin kullanıcı ID\'si.',
  LockoutMinutes:     'Hesap kilitleme süresi (dakika). auth.locked_out olayında dolu gelir.',
  LockoutCount:       'Ardışık başarısız giriş denemesi sayısı. auth.locked_out olayında dolu gelir.',
  RoleName:           'Değiştirilen rol adı (örn. Expert, Admin). user.role_changed olayında dolu gelir.',
  TargetType:         'Raporlanan içerik tipi: Problem, Solution veya User.',
  FeatureKey:         'Değiştirilen özellik/feature\'ın anahtar adı. institution.feature_changed olayında dolu gelir.',
  Severity:           'Uyarının ağırlık seviyesi: low, medium veya high.',
  IpAddress:          'Kullanıcının bağlandığı IP adresi. Giriş ve kimlik doğrulama olaylarında dolu gelir.',
  IsUpvote:           'Oylama işleminin olumlu mu (true) yoksa olumsuz mu (false) olduğunu gösterir.',
};

// ─── Enum Değerler (belirli fieldlar için) ───────────────────────────────────
const FIELD_ENUM_MAP: Record<string, string[]> = {
  UserRole:          ['User', 'Expert', 'Official', 'Admin', 'SuperAdmin'],
  TargetUserRole:    ['User', 'Expert', 'Official', 'Admin', 'SuperAdmin'],
  ProblemStatus:     ['open', 'resolved'],
  ProblemDifficulty: ['easy', 'medium', 'hard', 'expert'],
  Severity:          ['low', 'medium', 'high'],
  TargetType:        ['Problem', 'Solution', 'User'],
};

const FIELD_CATEGORY_MAP: Record<string, string> = {
  SystemUserId: 'Genel', InstitutionId: 'Genel', UserRole: 'Genel', TriggerEventName: 'Genel', UserIsBanned: 'Genel', UserIsEmailVerified: 'Genel',
  TargetUserId: 'Kullanıcı', UserScore: 'Kullanıcı', UserProblemCount: 'Kullanıcı', AdminId: 'Kullanıcı',
  RoleName: 'Kullanıcı', WarningId: 'Kullanıcı', Severity: 'Kullanıcı',
  TargetUserRole: 'Kullanıcı', TargetUserScore: 'Kullanıcı', TargetUserInstitutionId: 'Kullanıcı', TargetUserIsBanned: 'Kullanıcı', TargetUserIsAdmin: 'Kullanıcı', TargetUserIsExpert: 'Kullanıcı', TargetUserIsOfficial: 'Kullanıcı', TargetUserIsEmailVerified: 'Kullanıcı',
  ProblemId: 'Problem', ProblemStatus: 'Problem', ProblemDifficulty: 'Problem', ProblemOwnerId: 'Problem', ProblemInstitutionId: 'Problem', ProblemViewCount: 'Problem', ProblemSolutionCount: 'Problem', ProblemUpvoteCount: 'Problem', ProblemFollowerCount: 'Problem', ProblemIsHighlighted: 'Problem', ProblemIsReported: 'Problem',
  SolutionId: 'Çözüm', SolutionOwnerId: 'Çözüm', SolutionInstitutionId: 'Çözüm', SolutionVoteCount: 'Çözüm', SolutionApprovalStatus: 'Çözüm', SolutionIsHighlighted: 'Çözüm', SolutionIsReported: 'Çözüm',
  CommentId: 'Yorum',
  TopicId: 'Konu',
  AgreementId: 'Yasal',
  TargetId: 'Rapor', TargetType: 'Rapor',
  FeatureKey: 'Kurum',
  LockoutMinutes: 'Auth', LockoutCount: 'Auth', IpAddress: 'Auth',
  OldValue: 'Değişiklik', NewValue: 'Değişiklik',
  IsUpvote: 'Oylama',
};

function resolveFieldCategory(fieldPath: string): string {
  return FIELD_CATEGORY_MAP[fieldPath] ?? 'Genel';
}

const normalizeFieldType = (fieldPath: string, dataType?: string): FieldDefinition['type'] => {
  if (FIELD_ENUM_MAP[fieldPath]) return 'enum';

  const normalized = dataType?.toLowerCase() ?? '';
  if (normalized.includes('bool')) return 'boolean';
  if (normalized.includes('enum')) return 'enum';
  if (
    normalized.includes('int') ||
    normalized.includes('decimal') ||
    normalized.includes('double') ||
    normalized.includes('float')
  ) {
    return 'number';
  }
  return 'string';
};

const parseActionParameters = (payload?: string | null): ActionParameter[] => {
  if (!payload) return [];

  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => typeof item?.key === 'string' && typeof item?.label === 'string');
  } catch {
    return [];
  }
};

const mapTriggerDefinition = (trigger: WorkflowTriggerDto): TriggerDefinition => ({
  id: String(trigger.id),
  value: trigger.codeName,
  label: trigger.name,
  description: trigger.description ?? '',
  icon: '⚡',
  category: trigger.targetEntity ?? 'Genel',
  isBuiltIn: true,
});

const mapFieldDefinition = (field: WorkflowFieldDto): FieldDefinition => {
  const fieldType = normalizeFieldType(field.fieldPath, field.dataType);
  return {
    id: String(field.id),
    value: field.fieldPath,
    label: field.name,
    description: FIELD_DESCRIPTIONS[field.fieldPath],
    type: fieldType,
    enumValues: FIELD_ENUM_MAP[field.fieldPath],
    category: resolveFieldCategory(field.fieldPath),
  };
};

const mapActionDefinition = (action: WorkflowActionDto): ActionDefinition => ({
  id: String(action.id),
  value: action.actionCode,
  label: action.name,
  description: action.description ?? '',
  icon: action.icon ?? '⚙️',
  category: action.category ?? 'Sistem',
  parameters: parseActionParameters(action.parametersSchemaJson),
  isBuiltIn: true,
});

// ─── Store Tipi ───────────────────────────────────────────────────────────────

type WorkflowStore = {
  triggers: TriggerDefinition[];
  fields: FieldDefinition[];
  operators: OperatorDefinition[];
  actions: ActionDefinition[];

  /** Tüm aktif capability listesi — capability-select parametrelerinde kullanılır. */
  availableCapabilities: CapabilityDto[];
  /** Tüm aktif şablon listesi — template-select parametrelerinde kullanılır. */
  availableTemplates: CapabilityTemplateDto[];
  /** Capability ve template listelerini API'den yükler. WorkflowBuilder mount'ta çağırır. */
  loadWorkflowMeta: () => Promise<void>;

  /** Kanvasta seçili trigger event'i (ConditionNode'ların field filtrelemesi için). */
  activeTrigger: string;
  setActiveTrigger: (trigger: string) => void;

  syncStore: () => Promise<void>;

  // Trigger CRUD
  addTrigger: (t: Omit<TriggerDefinition, 'id' | 'isBuiltIn'>) => void;
  updateTrigger: (id: string, t: Partial<TriggerDefinition>) => void;
  deleteTrigger: (id: string) => void;

  // Field CRUD
  addField: (f: Omit<FieldDefinition, 'id'>) => void;
  updateField: (id: string, f: Partial<FieldDefinition>) => void;
  deleteField: (id: string) => void;

  // Action CRUD
  addAction: (a: Omit<ActionDefinition, 'id' | 'isBuiltIn'>) => void;
  updateAction: (id: string, a: Partial<ActionDefinition>) => void;
  deleteAction: (id: string) => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

let idCounter = 1000;
const genId = () => `custom-${++idCounter}`;

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set) => ({
      triggers: defaultTriggers,
      fields: defaultFields,
      operators: defaultOperators,
      actions: [],  // DB'den yüklenir (syncStore), burada boş başlar
      availableCapabilities: [],
      availableTemplates: [],
      activeTrigger: '',
      setActiveTrigger: (trigger) => set({ activeTrigger: trigger }),

      loadWorkflowMeta: async () => {
        const [capResult, tmplResult] = await Promise.allSettled([
          capabilityService.getAll(),
          capabilityService.getTemplates(),
        ]);
        if (capResult.status === 'fulfilled' && capResult.value.data?.success) {
          set({ availableCapabilities: capResult.value.data.data ?? [] });
        }
        if (tmplResult.status === 'fulfilled' && tmplResult.value.data?.success) {
          const all = tmplResult.value.data.data ?? [];
          set({ availableTemplates: all.filter((t) => t.isActive && t.latestVersion) });
        }
      },

      syncStore: async () => {
        const [triggersResult, fieldsResult, actionsResult] = await Promise.allSettled([
          workflowService.getTriggers(),
          workflowService.getFields(),
          workflowService.getActions(),
        ]);

        if (triggersResult.status === 'fulfilled' && triggersResult.value.data?.success) {
          const triggers = triggersResult.value.data.data ?? [];
          set({ triggers: triggers.map(mapTriggerDefinition) });
        }

        if (fieldsResult.status === 'fulfilled' && fieldsResult.value.data?.success) {
          const fields = fieldsResult.value.data.data ?? [];
          set({ fields: fields.map(mapFieldDefinition) });
        }

        if (actionsResult.status === 'fulfilled' && actionsResult.value.data?.success) {
          // DB tek kaynak: seeder tüm action'ları yönetir, frontend sadece render eder.
          const actions = (actionsResult.value.data.data ?? []).map(mapActionDefinition);
          set(() => ({ actions }));
        }
      },

      // Trigger
      addTrigger: (t) =>
        set((s) => ({ triggers: [...s.triggers, { ...t, id: genId(), isBuiltIn: false }] })),
      updateTrigger: (id, t) =>
        set((s) => ({ triggers: s.triggers.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      deleteTrigger: (id) =>
        set((s) => ({ triggers: s.triggers.filter((x) => x.id !== id || x.isBuiltIn) })),

      // Field
      addField: (f) =>
        set((s) => ({ fields: [...s.fields, { ...f, id: genId() }] })),
      updateField: (id, f) =>
        set((s) => ({ fields: s.fields.map((x) => (x.id === id ? { ...x, ...f } : x)) })),
      deleteField: (id) =>
        set((s) => ({ fields: s.fields.filter((x) => x.id !== id) })),

      // Action
      addAction: (a) =>
        set((s) => ({ actions: [...s.actions, { ...a, id: genId(), isBuiltIn: false }] })),
      updateAction: (id, a) =>
        set((s) => ({ actions: s.actions.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      deleteAction: (id) =>
        set((s) => ({ actions: s.actions.filter((x) => x.id !== id || x.isBuiltIn) })),
    }),
    {
      name: 'workflow-definitions',
      // Action'lar DB'den gelir (syncStore), localStorage'a yazılmaz.
      // Triggers/fields/operators persist edilmeye devam eder.
      partialize: (state) => ({
        triggers: state.triggers,
        fields: state.fields,
        operators: state.operators,
      }),
    }
  )
);