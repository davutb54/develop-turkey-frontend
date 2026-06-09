// src/types/index.ts

// Backend'den gelen genel yanıt yapısı (Core/Utilities/Results)
export interface IDataResult<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface IResult {
    success: boolean;
    message: string;
}

// Token (Giriş yapınca gelen veri)
export interface AccessToken {
    token: string;
    expiration: string;
    userId: string;
}

// Kullanıcı Detayları (Entities/DTOs/User/UserDetailDto.cs)
export interface UserDetailDto {
    institutionId: number;
    cityCode: number;
    genderCode: number;
    id: number;
    userName: string;
    authType?: string | null;
    hasPassword?: boolean;
    name: string;
    surname: string;
    email: string;
    cityName: string;
    gender: string;
    emailNotificationPermission: boolean;
    isReported: boolean;
    isDeleted: boolean;
    isBanned: boolean;
    isEmailVerified: boolean;
    registerDate: string; // Tarihler string olarak gelir (ISO formatı)
    deleteDate?: string | null;
    profileImageUrl?: string | null;
    customHierarchyId?: number | null;
    mentionNotificationEnabled: boolean;
    isProfilePublic: boolean;
    showSolutions: boolean;
    showProblems: boolean;
}

// Herkese Açık Kullanıcı Detayları (Entities/DTOs/User/UserPublicProfileDto.cs)
export interface UserPublicProfileDto {
    id: number;
    userName: string;
    name: string;
    surname: string;
    cityName: string;
    gender: string;
    registerDate: string;
    profileImageUrl?: string | null;
    institutionId: number;
    customHierarchyId?: number | null;
    isProfilePublic: boolean;
    showSolutions: boolean;
    showProblems: boolean;
}

// Konu Başlıkları (Entities/Concrete/Topic.cs)
export interface Topic {
    institutionId: any;
    id: number;
    name: string;
    imageName: string;
    status: boolean;
}

// Kullanıcı Unvan (Epic D)
export interface UserTitleDto {
    id: number;
    userId: number;
    label: string;
    kind: 'official' | 'expert' | 'custom';
    color?: string | null;
    icon?: string | null;
    isVisible: boolean;
    assignedAt: string;
}

// Resmi Yanıt (Epic D)
export interface OfficialResponseDto {
    id: number;
    problemId: number;
    authorUserId: number;
    authorUsername: string;
    authorImageUrl?: string | null;
    body: string;
    status: 'acknowledged' | 'in_progress' | 'info' | 'closed';
    createdAt: string;
    updatedAt?: string | null;
    authorTitles: UserTitleDto[];
}

// Sorun Detayları (Entities/DTOs/ProblemDetailDto.cs)
export interface ProblemDetailDto {
    institutionId: number;
    isResolved: boolean;
    id: number;
    publicId?: string | null;
    senderId: number;
    topicName: string;
    senderUsername: string;
    senderIsExpert: boolean;
    senderIsOfficial: boolean;
    senderTitles?: UserTitleDto[];
    officialResponses?: OfficialResponseDto[];
    title: string;
    description: string;
    topics: TopicDto[];
    cityCode: number;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    topicId: number;
    cityName: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    sendDate: string;
    imageUrls?: string[] | null;
    videoUrls?: string[] | null;
    isResolvedByExpert: boolean;
    solutionCount: number;
    viewCount: number;
    senderImageUrl?: string | null;
    upvoteCount: number;
    followerCount: number;
    customHierarchyId?: number | null;
    // Görünürlük seviyeleri (closed / public / admin_only / admin_and_owner / owner_only)
    viewersVisibility?: string;
    upvotersVisibility?: string;
    participantsVisibility?: string;
    solutionVotersVisibility?: string;
    // Kapatma & gizleme
    isClosed?: boolean;
    closedAt?: string | null;
    closedByUserId?: number | null;
    closeReason?: string | null;
    isHidden?: boolean;
}

export interface TopicDto {
    id: number;
    name: string;
}

// Çözüm Detayları (Entities/DTOs/SolutionDetailDto.cs)
export interface SolutionDetailDto {
    id: number;
    publicId?: string | null;
    senderId: number;
    problemId: number;
    problemPublicId?: string | null;
    title: string;
    description: string;
    senderUsername: string;
    senderIsExpert: boolean;
    senderIsOfficial: boolean;
    senderTitles?: UserTitleDto[];
    problemName: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    sendDate: string;
    voteCount: number;
    expertApprovalStatus: number;
    senderImageUrl?: string | null;
    imageUrls?: string[] | null;
    videoUrls?: string[] | null;
}

// Yorum Detayları (Entities/DTOs/CommentDetailDto.cs)
export interface CommentDetailDto {
    id: number;
    senderId: number;
    solutionId: number;
    parentCommentId?: number | null;
    text: string;
    senderUsername: string;
    senderIsExpert: boolean;
    senderIsOfficial: boolean;
    senderTitles?: UserTitleDto[];
    sendDate: string;
}

// Şehir Listesi İçin
export interface City {
    key: string;
    text: string;
    value: number;
}

// --- Input DTO'lar (Backend'e gönderilen veriler) ---

// Giriş Yapmak İçin (UserForLoginDto)
export interface UserForLoginDto {
    userName: string;
    password: string;
    captchaToken?: string;
}

// Kayıt Olmak İçin (UserForRegisterDto)
export interface UserForRegisterDto {
    userName: string;
    name: string;
    surname: string;
    email: string;
    password: string;
    cityCode: number;
    genderCode: number;
    emailNotificationPermission: boolean;
    captchaToken?: string;
    agreementAccepted?: boolean;
    customHierarchyId?: number | null;
}

// Profil Resmi Yüklemek İçin (UserImageUpdateDto)
export interface UserImageUpdateDto {
    userId: number;
    image: File; // Frontend'de dosya tipi 'File'dır
}

// Sorun Eklemek İçin (ProblemAddDto)
export interface ProblemAddDto {
    title: string;
    description: string;
    cityCode: number;
    topicIds: number[];
    images?: File[] | null;
    address?: string;
    latitude?: number;
    longitude?: number;
    solutionTitle?: string;       // YENİ EKLENDİ
    solutionDescription?: string;
    solutionImages?: File[] | null;
    customHierarchyId?: number | null;
}

export interface ProblemUpdateDto extends ProblemAddDto {
    id: number;
    senderId: number;
    imageUrls?: string;
    sendDate: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    isResolved: boolean;
    institutionId: number;
    viewCount: number;
    clearLocation: boolean;
}

export interface SolutionAddDto {
    senderId?: number;
    problemId: number;
    title: string;
    description: string;
    images?: File[] | null;
}

export interface SolutionUpdateDto extends SolutionAddDto {
    id: number;
    senderId: number;
    imageUrls?: string;
    sendDate: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    expertApprovalStatus: number;
    institutionId: number;
}

export interface Gender {
    key: string;
    text: string;
    value: number;
}

// Şifre Güncelleme İçin
export interface UserForPasswordUpdateDto {
    id: number;
    oldPassword: string;
    newPassword: string;
}

// Filtreleme Parametreleri
export interface ProblemFilterDto {
    cityCode?: number;
    topicId?: number;
    searchText?: string;
    customHierarchyId?: number | null;
}

// Yorumlar İçin

export interface CommentAddDto {
    solutionId: number;
    senderId: number; // Backend Comment tablosu SenderId bekliyor
    text: string;
    parentCommentId?: number | null; // Alt yorumsa burası dolacak
}

export interface VerifyEmailDto {
    email: string;
    code: number;
}

export interface ResetPasswordDto {
    email: string;
    code: number;
    newPassword: string;
}

// --- ADMIN PANELI TİPLERİ ---
export interface AdminDashboardDto {
    totalUsers: number;
    totalProblems: number;
    totalSolutions: number;
    reportedProblems: number;
    bannedUsers: number;
}

export interface DashboardAnalyticsDto {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    problemsByInstitution: InstitutionProblemCountDto[];
    userRegistrationsLast30Days: DailyUserRegistrationDto[];
}

export interface InstitutionProblemCountDto {
    institutionName: string;
    count: number;
}

export interface DailyUserRegistrationDto {
    date: string;
    count: number;
}

export interface Log {
    id: number;
    userId?: number | null;
    userName?: string | null;
    ipAddress?: string | null;
    port?: string | null;
    category: string;
    action: string;
    level: string;
    message: string;
    details?: string | null;
    institutionId?: number | null;
    creationDate: string;
}

export interface LogFilterDto {
    category?: string;
    action?: string;
    level?: string;
    searchText?: string;
    startDate?: string;
    endDate?: string;
    institutionId?: number;
    page?: number;
    pageSize?: number;
    isActivityLog?: boolean;
}

export interface ReportDto {
    id: number;
    reporterUserId: number;
    targetType: string;
    targetId: number;
    reason: string;
    reportDate: string;
    isResolved: boolean;
}

export interface UserForUpdateDto {
    id: number;
    name: string;
    surname: string;
    email: string;
    cityCode: number;
    genderCode: number;
    customHierarchyId?: number | null;
    mentionNotificationEnabled: boolean;
    isProfilePublic: boolean;
    showSolutions: boolean;
    showProblems: boolean;
}

export interface UserForPasswordUpdateDto {
    id: number;
    oldPassword: string;
    newPassword: string;
}

export interface ImpersonateDto {
    targetUserId: number;
    adminPassword: string;
}

// --- KURUM (INSTITUTION) TİPLERİ ---
export interface Institution {
    id?: number;
    name: string;
    subtitle?: string | null;
    domain: string;
    subdomain?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    featuresJson?: string;
    terminologyJson?: string;
    customFieldsJson?: string;
    customHierarchyLabel?: string | null;
    customHierarchyJson?: string | null;
    status: boolean;
}

// --- SYSTEM HEALTH TİPLERİ ---
export interface TrafficDataPoint {
    timestamp: string;
    responseTime: number;
    totalRequests: number;
}

export interface CityProblemDensityDto {
    cityCode: number;
    problemCount: number;
    problemWithLocationCount: number;
    userCount: number;
}

export interface SystemHealthDto {
    totalRequests: number;
    totalErrors: number;
    averageResponseTimeMs: number;
    activeUsers: number;
    ramUsageMb: number;
    trafficHistory: TrafficDataPoint[];
    turkeyMapData: CityProblemDensityDto[];
}

// --- SYSTEM SETTINGS TİPLERİ ---
export interface SystemSettings {
    id: number;
    isMaintenanceMode: boolean;
    disableNewRegistrations: boolean;
    maintenanceMessage?: string | null;
    lastUpdatedAt?: string;
    updatedByUserId?: number | null;

    // Site / Kurum Kimliği
    siteName?: string | null;
    siteDescription?: string | null;
    organizationName?: string | null;

    // İletişim Bilgileri
    contactFullName?: string | null;
    contactAddress?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;

    // Sosyal Medya
    socialTwitter?: string | null;
    socialInstagram?: string | null;
    socialLinkedIn?: string | null;
}

// --- BİLDİRİM TİPLERİ ---
export interface Notification {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: string;
    referenceLink?: string | null;
    isRead: boolean;
    createdAt: string;
}

// --- YASAL SÖZLEŞME TİPLERİ ---
export interface LegalAgreement {
    id: number;
    title: string;
    type: string;          // "TermsOfService" | "PrivacyPolicy" | "KVKK"
    version: string;       // "1.0", "2.0"
    content: string;       // Markdown metni
    isMajorVersion: boolean;
    isActive: boolean;
    publishedAt: string;   // ISO tarih
}

export interface FeatureGroup {
    id: number;
    name: string;
    orderIndex: number;
}

export interface FeatureDefinition {
    id: number;
    groupId: number;
    key: string;
    displayName: string;
    description?: string;
    inputType: string; // "Boolean", "Text", "Number", "Color", "Select"
    defaultValue: string;
    optionsJson?: string | null;
    isSystemLevel: boolean;
    orderIndex: number;
    scope: string; // "Global" | "Institution"
}
export interface EmailTemplate {
    id: number;
    templateKey: string;
    subject: string;
    body: string;
    description?: string;
    availablePlaceholders?: string;
    isActive: boolean;
}

// --- WORKFLOW TİPLERİ ---
export interface WorkflowTriggerDto {
    id: number;
    name: string;
    codeName: string;
    description: string;
    targetEntity: string;
    isActive: boolean;
}

export interface WorkflowFieldDto {
    id: number;
    name: string;
    fieldPath: string;
    dataType: string;
    isActive: boolean;
}

export interface WorkflowActionDto {
    id: number;
    name: string;
    actionCode: string;
    category?: string;
    icon?: string;
    description?: string;
    parametersSchemaJson: string;
    isActive: boolean;
}

export interface DynamicRule {
    id: number;
    institutionId: number;
    name: string;
    triggerEvent: string;
    flowJson: string;
    version: number;
    priority: number;
    description: string;
    createdAt: string;
    updatedAt: string;
    createdByUserId: number;
    isActive: boolean;
}

export interface SaveWorkflowDto {
    id?: number;
    name: string;
    triggerEvent: string;
    flowJson: string;
    priority: number;
    description: string;
    isActive: boolean;
}

export interface TestRunRequestDto {
    triggerEvent?: string;
    sampleProblemId?: number;
    sampleUserId?: number;
}

export interface WorkflowTestRunResult {
    success: boolean;
    message: string;
    runId?: string;
    isDryRun: boolean;
    startedAt?: string;
    triggerEvent?: string;
    ruleName?: string;
}

export interface WorkflowLog {
    id: number;
    institutionId: number;
    ruleId: number;
    ruleName: string;
    triggerEvent: string;
    triggeredByUserId: number;
    /** 'success' | 'partial' | 'failed' | 'error' */
    status: string;
    errorMessage?: string | null;
    /** JSON string — string[] */
    traceJson?: string | null;
    totalNodeCount: number;
    executedNodeCount: number;
    durationMs: number;
    executedAt: string;
}

export interface WorkflowLogFilterDto {
    ruleId?: number;
    triggerEvent?: string;
    status?: string;
    triggeredByUserId?: number;
    institutionId?: number;
    startDate?: string;
    endDate?: string;
    searchText?: string;
    page?: number;
    pageSize?: number;
}

export type TriggerDefinition = {
    id: string;
    value: string;
    label: string;
    description: string;
    icon: string;
    category: string;
    isBuiltIn: boolean;
};

export type FieldDefinition = {
    id: string;
    value: string;
    label: string;
    description?: string;
    type: 'string' | 'number' | 'boolean' | 'enum';
    enumValues?: string[];
    category: string;
};

export type OperatorDefinition = {
    id: string;
    value: string;
    label: string;
    applicableTo: ('string' | 'number' | 'boolean' | 'enum')[];
};

export type ActionDefinition = {
    id: string;
    value: string;
    label: string;
    description: string;
    icon: string;
    category: string;
    parameters: ActionParameter[];
    isBuiltIn: boolean;
};

export type ActionParameter = {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'capability-select' | 'template-select';
    options?: string[];
    required: boolean;
    defaultValue?: string;
};

// ── Epic E — Sohbet Sistemi ──────────────────────────────────────────────────

export interface ConversationParticipant {
    userId: number;
    username: string;
    role: string;
    lastReadMessageId?: number | null;
    joinedAt: string;
}

export interface MessageDto {
    id: number;
    conversationId: number;
    senderUserId: number;
    senderUsername: string;
    body: string;
    createdAt: string;
    isDeleted: boolean;
}

export interface ConversationSummary {
    id: number;
    type: 'direct' | 'group' | 'support';
    scope: 'institution' | 'global';
    institutionId?: number | null;
    title?: string | null;
    createdByUserId: number;
    createdAt: string;
    participantCount: number;
    unreadCount: number;
    lastMessage?: MessageDto | null;
    // destek alanları
    status: 'active' | 'pending' | 'closed';
    supportCategory?: 'general' | 'official' | 'expert' | 'moderator' | 'admin' | null;
    assignedToUserId?: number | null;
    assignedToUsername?: string | null;
}

export interface ConversationDetail extends ConversationSummary {
    participants: ConversationParticipant[];
}

export interface MessagePage {
    items: MessageDto[];
    hasMore: boolean;
}

// Görüntüleme / oy takip DTO'ları
export interface ProblemViewerDto {
    userId?: number | null;
    username?: string | null;
    profileImageUrl?: string | null;
    viewedAt: string;
}

export interface ProblemUpvoterDto {
    userId: number;
    username: string;
    profileImageUrl?: string | null;
    createdAt: string;
}

export interface ProblemParticipantDto {
    userId: number;
    username: string;
    profileImageUrl?: string | null;
    role: 'solution_author' | 'commenter' | 'upvoter';
}

export interface SolutionVoterDto {
    userId: number;
    username: string;
    profileImageUrl?: string | null;
    isUpvote: boolean;
    voteDate: string;
}

export type VisibilityLevel = 'closed' | 'public' | 'admin_only' | 'admin_and_owner' | 'owner_only';
