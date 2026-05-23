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

export type {
  ActionDefinition,
  ActionParameter,
  FieldDefinition,
  OperatorDefinition,
  TriggerDefinition,
};

// ─── Varsayılan Veriler ───────────────────────────────────────────────────────

const defaultTriggers: TriggerDefinition[] = [
  { id: 't1', value: 'user_registered', label: 'Kullanıcı Kayıt Oldu', description: 'Yeni bir kullanıcı sisteme kayıt olduğunda', icon: '👤', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't2', value: 'user_login', label: 'Kullanıcı Giriş Yaptı', description: 'Kullanıcı sisteme giriş yaptığında', icon: '🔑', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't3', value: 'user_banned', label: 'Kullanıcı Yasaklandı', description: 'Bir kullanıcı yasaklandığında', icon: '🚫', category: 'Kullanıcı', isBuiltIn: true },
  { id: 't4', value: 'problem_created', label: 'Problem Oluşturuldu', description: 'Yeni bir problem eklendiğinde', icon: '📝', category: 'Problem', isBuiltIn: true },
  { id: 't5', value: 'problem_solved', label: 'Problem Çözüldü', description: 'Bir problem çözüldü olarak işaretlendiğinde', icon: '✅', category: 'Problem', isBuiltIn: true },
  { id: 't6', value: 'problem_reported', label: 'Problem Şikayet Edildi', description: 'Bir problem şikayet edildiğinde', icon: '🚩', category: 'Problem', isBuiltIn: true },
  { id: 't7', value: 'comment_added', label: 'Yorum Eklendi', description: 'Bir probleme yorum eklendiğinde', icon: '💬', category: 'İçerik', isBuiltIn: true },
  { id: 't8', value: 'badge_earned', label: 'Rozet Kazanıldı', description: 'Kullanıcı rozet kazandığında', icon: '🏅', category: 'Gamification', isBuiltIn: true },
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

const defaultActions: ActionDefinition[] = [
  // ── İletişim ──────────────────────────────────────────────────────────────────
  {
    id: 'a1', value: 'send_email', label: 'E-posta Gönder',
    description: 'Sisteme kayıtlı e-posta şablonunu kullanarak veya özel içerikle e-posta gönderir',
    icon: '📧', category: 'İletişim', isBuiltIn: true,
    parameters: [
      { key: 'recipient',   label: 'Alıcı Tipi',                    type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'context_user' },
      { key: 'customTo',    label: 'Özel E-posta (recipient=custom)', type: 'text',    required: false, defaultValue: '' },
      { key: 'templateKey', label: 'E-posta Şablonu Anahtarı',       type: 'text',    required: false, defaultValue: '' },
      { key: 'subject',     label: 'Konu (şablon seçilmemişse)',      type: 'text',    required: false, defaultValue: '' },
      { key: 'body',        label: 'İçerik (şablon seçilmemişse)',    type: 'text',    required: false, defaultValue: '' },
      { key: 'cc',          label: 'CC Adresleri (virgülle ayır)',     type: 'text',    required: false, defaultValue: '' },
    ],
  },
  {
    id: 'a2', value: 'send_notification', label: 'Bildirim Gönder',
    description: 'Kullanıcıya uygulama içi bildirim gönderir; isteğe bağlı yönlendirme bağlantısı eklenebilir',
    icon: '🔔', category: 'İletişim', isBuiltIn: true,
    parameters: [
      { key: 'recipientType',  label: 'Alıcı Tipi',                       type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'context_user' },
      { key: 'customUserId',   label: 'Kullanıcı ID (recipientType=custom)', type: 'text',  required: false, defaultValue: '' },
      { key: 'title',          label: 'Başlık',                            type: 'text',    required: true,  defaultValue: '' },
      { key: 'message',        label: 'Mesaj',                             type: 'text',    required: true,  defaultValue: '' },
      { key: 'type',           label: 'Tür',                               type: 'select',  options: ['info', 'success', 'warning', 'error'], required: true, defaultValue: 'info' },
      { key: 'referenceLink',  label: 'Yönlendirme Bağlantısı (opsiyonel)', type: 'text',  required: false, defaultValue: '' },
    ],
  },
  {
    id: 'a3', value: 'send_bulk_notification', label: 'Toplu Bildirim Gönder',
    description: 'Kurumdaki tüm kullanıcılara veya belirli bir role sahip kullanıcılara toplu bildirim gönderir',
    icon: '📣', category: 'İletişim', isBuiltIn: true,
    parameters: [
      { key: 'targetGroup', label: 'Hedef Grup',                         type: 'select', options: ['institution', 'role'], required: true,  defaultValue: 'institution' },
      { key: 'role',        label: 'Rol (targetGroup=role ise)',          type: 'select', options: ['User', 'Admin', 'Expert', 'Official'], required: false, defaultValue: 'User' },
      { key: 'title',       label: 'Başlık',                             type: 'text',   required: true,  defaultValue: '' },
      { key: 'message',     label: 'Mesaj',                              type: 'text',   required: true,  defaultValue: '' },
      { key: 'type',        label: 'Tür',                                type: 'select', options: ['info', 'success', 'warning', 'error'], required: true, defaultValue: 'info' },
    ],
  },

  // ── Kullanıcı Yönetimi ─────────────────────────────────────────────────────────
  {
    id: 'a4', value: 'ban_user', label: 'Kullanıcıyı Yasakla',
    description: 'Kullanıcı hesabını belirlenen süre boyunca veya kalıcı olarak askıya alır, isteğe bağlı bildirim gönderir',
    icon: '🚫', category: 'Kullanıcı Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'userTarget',    label: 'Hedef Kullanıcı',                type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'target_user' },
      { key: 'customUserId',  label: 'Kullanıcı ID (userTarget=custom)', type: 'text',  required: false, defaultValue: '' },
      { key: 'durationDays',  label: 'Süre (gün, 0=kalıcı)',           type: 'number',  required: true,  defaultValue: '7' },
      { key: 'reason',        label: 'Sebep',                          type: 'text',    required: false, defaultValue: '' },
      { key: 'notifyUser',    label: 'Kullanıcıyı Bildir',             type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a5', value: 'unban_user', label: 'Yasağı Kaldır',
    description: "Askıya alınmış kullanıcının yasağını kaldırır ve isteğe bağlı bildirim gönderir",
    icon: '✅', category: 'Kullanıcı Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'userTarget',   label: 'Hedef Kullanıcı',                 type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'target_user' },
      { key: 'customUserId', label: 'Kullanıcı ID (userTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'notifyUser',   label: 'Kullanıcıyı Bildir',              type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a6', value: 'warn_user', label: 'Kullanıcıyı Uyar',
    description: 'Kullanıcıya resmi uyarı kaydı oluşturur ve bildirim gönderir; ağırlık düzeyi belirlenebilir',
    icon: '⚠️', category: 'Kullanıcı Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'userTarget',   label: 'Hedef Kullanıcı',                 type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'target_user' },
      { key: 'customUserId', label: 'Kullanıcı ID (userTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'title',        label: 'Uyarı Başlığı',                   type: 'text',    required: true,  defaultValue: 'Kural İhlali' },
      { key: 'message',      label: 'Uyarı Mesajı',                    type: 'text',    required: true,  defaultValue: '' },
      { key: 'severity',     label: 'Ağırlık',                         type: 'select',  options: ['low', 'medium', 'high'], required: true, defaultValue: 'medium' },
    ],
  },
  {
    id: 'a7', value: 'change_user_role', label: 'Kullanıcı Rolünü Değiştir',
    description: 'Admin / Uzman / Resmi rollerini kullanıcıya ekler veya kaldırır',
    icon: '🎖️', category: 'Kullanıcı Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'userTarget',   label: 'Hedef Kullanıcı',                 type: 'select',  options: ['context_user', 'target_user', 'custom'], required: true,  defaultValue: 'target_user' },
      { key: 'customUserId', label: 'Kullanıcı ID (userTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'role',         label: 'Rol',                             type: 'select',  options: ['Admin', 'Expert', 'Official'], required: true, defaultValue: 'Expert' },
      { key: 'action',       label: 'İşlem',                           type: 'select',  options: ['grant', 'revoke'], required: true, defaultValue: 'grant' },
    ],
  },

  // ── Problem Yönetimi ──────────────────────────────────────────────────────────
  {
    id: 'a8', value: 'resolve_problem', label: 'Problemi Çöz',
    description: 'Problemi çözüldü olarak işaretler; isteğe bağlı olarak problem sahibine bildirim gönderilir',
    icon: '✔️', category: 'Problem Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'problemTarget',    label: 'Hedef Problem',                    type: 'select',  options: ['context_problem', 'custom'], required: true,  defaultValue: 'context_problem' },
      { key: 'customProblemId',  label: 'Problem ID (problemTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'notifyOwner',      label: 'Sahibini Bildir',                  type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a9', value: 'highlight_problem', label: 'Problemi Öne Çıkar',
    description: "Problemin öne çıkarma durumunu açar/kapatır (toggle)",
    icon: '⭐', category: 'Problem Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'problemTarget',   label: 'Hedef Problem',                    type: 'select', options: ['context_problem', 'custom'], required: true,  defaultValue: 'context_problem' },
      { key: 'customProblemId', label: 'Problem ID (problemTarget=custom)', type: 'text',  required: false, defaultValue: '' },
    ],
  },
  {
    id: 'a10', value: 'delete_problem', label: 'Problemi Sil',
    description: 'Problemi sistemden kalıcı olarak kaldırır; isteğe bağlı sebep ve sahip bildirimi eklenebilir',
    icon: '🗑️', category: 'Problem Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'problemTarget',   label: 'Hedef Problem',                    type: 'select',  options: ['context_problem', 'custom'], required: true,  defaultValue: 'context_problem' },
      { key: 'customProblemId', label: 'Problem ID (problemTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'reason',          label: 'Silme Sebebi',                     type: 'text',    required: false, defaultValue: '' },
      { key: 'notifyOwner',     label: 'Sahibini Bildir',                  type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a11', value: 'report_problem', label: 'Problemi Raporla',
    description: 'Problemi moderasyon incelemesi için raporlar',
    icon: '🚩', category: 'Problem Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'problemTarget',   label: 'Hedef Problem',                    type: 'select', options: ['context_problem', 'custom'], required: true,  defaultValue: 'context_problem' },
      { key: 'customProblemId', label: 'Problem ID (problemTarget=custom)', type: 'text',  required: false, defaultValue: '' },
    ],
  },

  // ── Çözüm Yönetimi ────────────────────────────────────────────────────────────
  {
    id: 'a12', value: 'approve_solution', label: 'Çözümü Onayla',
    description: 'Uzman onayı bekleyen çözümü onaylar ve yazara bildirim gönderir',
    icon: '✅', category: 'Çözüm Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'solutionTarget',    label: 'Hedef Çözüm',                      type: 'select',  options: ['context_solution', 'custom'], required: true,  defaultValue: 'context_solution' },
      { key: 'customSolutionId',  label: 'Çözüm ID (solutionTarget=custom)',  type: 'text',   required: false, defaultValue: '' },
      { key: 'notifyAuthor',      label: 'Yazarı Bildir',                     type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a13', value: 'reject_solution', label: 'Çözümü Reddet',
    description: "Uzman incelemesinden geçemeyen çözümü reddeder; yazara sebep bildirilir",
    icon: '❌', category: 'Çözüm Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'solutionTarget',   label: 'Hedef Çözüm',                     type: 'select',  options: ['context_solution', 'custom'], required: true,  defaultValue: 'context_solution' },
      { key: 'customSolutionId', label: 'Çözüm ID (solutionTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'reason',           label: 'Reddetme Sebebi',                  type: 'text',    required: false, defaultValue: '' },
      { key: 'notifyAuthor',     label: 'Yazarı Bildir',                    type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },
  {
    id: 'a14', value: 'highlight_solution', label: 'Çözümü Öne Çıkar',
    description: "Çözümün öne çıkarma durumunu açar/kapatır (toggle)",
    icon: '💡', category: 'Çözüm Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'solutionTarget',   label: 'Hedef Çözüm',                     type: 'select', options: ['context_solution', 'custom'], required: true,  defaultValue: 'context_solution' },
      { key: 'customSolutionId', label: 'Çözüm ID (solutionTarget=custom)', type: 'text',  required: false, defaultValue: '' },
    ],
  },
  {
    id: 'a15', value: 'delete_solution', label: 'Çözümü Sil',
    description: 'Çözümü sistemden kaldırır; isteğe bağlı sebep ve yazar bildirimi eklenebilir',
    icon: '🗑️', category: 'Çözüm Yönetimi', isBuiltIn: true,
    parameters: [
      { key: 'solutionTarget',   label: 'Hedef Çözüm',                     type: 'select',  options: ['context_solution', 'custom'], required: true,  defaultValue: 'context_solution' },
      { key: 'customSolutionId', label: 'Çözüm ID (solutionTarget=custom)', type: 'text',   required: false, defaultValue: '' },
      { key: 'reason',           label: 'Silme Sebebi',                     type: 'text',    required: false, defaultValue: '' },
      { key: 'notifyAuthor',     label: 'Yazarı Bildir',                    type: 'boolean', required: false, defaultValue: 'true' },
    ],
  },

  // ── Moderasyon ────────────────────────────────────────────────────────────────
  {
    id: 'a16', value: 'delete_comment', label: 'Yorumu Sil',
    description: 'Belirtilen yorumu moderasyon gerekçesiyle siler',
    icon: '🧹', category: 'Moderasyon', isBuiltIn: true,
    parameters: [
      { key: 'commentTarget',   label: 'Hedef Yorum',                      type: 'select', options: ['context_comment', 'custom'], required: true,  defaultValue: 'context_comment' },
      { key: 'customCommentId', label: 'Yorum ID (commentTarget=custom)',   type: 'text',  required: false, defaultValue: '' },
      { key: 'reason',          label: 'Silme Sebebi',                     type: 'text',  required: false, defaultValue: '' },
    ],
  },

  // ── Sistem ────────────────────────────────────────────────────────────────────
  {
    id: 'a17', value: 'log_event', label: 'Olay Kaydet',
    description: 'Audit log tablosuna özelleştirilebilir kategori ve seviyede kayıt ekler',
    icon: '📝', category: 'Sistem', isBuiltIn: true,
    parameters: [
      { key: 'category', label: 'Kategori',  type: 'text',   required: false, defaultValue: 'Workflow' },
      { key: 'action',   label: 'Eylem',     type: 'text',   required: false, defaultValue: '' },
      { key: 'message',  label: 'Mesaj',     type: 'text',   required: true,  defaultValue: '' },
      { key: 'details',  label: 'Detaylar',  type: 'text',   required: false, defaultValue: '' },
      { key: 'severity', label: 'Seviye',    type: 'select', options: ['Info', 'Warning', 'Error', 'Critical'], required: true, defaultValue: 'Info' },
    ],
  },
  {
    id: 'a18', value: 'webhook', label: 'Webhook Tetikle',
    description: "Dış servise HTTP isteği gönderir; payload boş bırakılırsa tetikleyici context'i otomatik eklenir",
    icon: '🌐', category: 'Sistem', isBuiltIn: true,
    parameters: [
      { key: 'url',        label: 'Webhook URL',                  type: 'text',   required: true,  defaultValue: 'https://' },
      { key: 'method',     label: 'HTTP Metodu',                  type: 'select', options: ['POST', 'GET', 'PUT', 'PATCH'], required: true, defaultValue: 'POST' },
      { key: 'payload',    label: 'Payload JSON (boş=otomatik)',  type: 'text',   required: false, defaultValue: '' },
      { key: 'authHeader', label: 'Authorization Header',         type: 'text',   required: false, defaultValue: '' },
    ],
  },
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
  description: '',
  icon: '⚙️',
  category: 'Sistem',
  parameters: parseActionParameters(action.parametersSchemaJson),
  isBuiltIn: true,
});

// ─── Store Tipi ───────────────────────────────────────────────────────────────

type WorkflowStore = {
  triggers: TriggerDefinition[];
  fields: FieldDefinition[];
  operators: OperatorDefinition[];
  actions: ActionDefinition[];

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
      actions: defaultActions,
      activeTrigger: '',
      setActiveTrigger: (trigger) => set({ activeTrigger: trigger }),

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
          const actions = actionsResult.value.data.data ?? [];
          set({ actions: actions.map(mapActionDefinition) });
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
      partialize: (state) => ({
        triggers: state.triggers,
        fields: state.fields,
        operators: state.operators,
        actions: state.actions,
      }),
    }
  )
);
