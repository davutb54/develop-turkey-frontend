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
    name: string;
    surname: string;
    email: string;
    cityName: string;
    gender: string;
    emailNotificationPermission: boolean;
    isAdmin: boolean;
    isExpert: boolean;
    isOfficial: boolean;
    isReported: boolean;
    isDeleted: boolean;
    isBanned: boolean;
    isEmailVerified: boolean;
    registerDate: string; // Tarihler string olarak gelir (ISO formatı)
    deleteDate?: string | null;
    profileImageUrl?: string | null;
}

// Konu Başlıkları (Entities/Concrete/Topic.cs)
export interface Topic {
    institutionId: any;
    id: number;
    name: string;
    imageName: string;
    status: boolean;
}

// Sorun Detayları (Entities/DTOs/ProblemDetailDto.cs)
export interface ProblemDetailDto {
    institutionId: number;
    isResolved: boolean;
    id: number;
    senderId: number;
    topicName: string;
    senderUsername: string;
    senderIsExpert: boolean;
    senderIsOfficial: boolean;
    title: string;
    description: string;
    topics: TopicDto[];
    cityCode: number;
    topicId: number;
    cityName: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    sendDate: string;
    imageUrl?: string | null;
    isResolvedByExpert: boolean;
    solutionCount: number;
    viewCount: number;
    senderImageUrl?: string | null;
}

export interface TopicDto {
    id: number;
    name: string;
}

// Çözüm Detayları (Entities/DTOs/SolutionDetailDto.cs)
export interface SolutionDetailDto {
    id: number;
    senderId: number;
    problemId: number;
    title: string;
    description: string;
    senderUsername: string;
    senderIsExpert: boolean;
    senderIsOfficial: boolean;
    problemName: string;
    isHighlighted: boolean;
    isReported: boolean;
    isDeleted: boolean;
    sendDate: string;
    voteCount: number;
    expertApprovalStatus: number;
    senderImageUrl?: string | null;
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
    image?: File | null;
    solutionTitle?: string;       // YENİ EKLENDİ
    solutionDescription?: string;
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
    creationDate: string;
}

export interface LogFilterDto {
    category?: string;
    action?: string;
    level?: string;
    searchText?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
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
}

export interface UserForPasswordUpdateDto {
    id: number;
    oldPassword: string;
    newPassword: string;
}

// --- KURUM (INSTITUTION) TİPLERİ ---
export interface Institution {
    id?: number;
    name: string;
    domain: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    status: boolean;
}