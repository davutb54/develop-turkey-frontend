export const getProfileImageUrl = (profileImageUrl: string | null | undefined): string => {
    if (!profileImageUrl) {
        return '';
    }
    
    // Google OAuth gibi dış kaynaklı bir resim mi kontrolü
    if (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://')) {
        return profileImageUrl;
    }
    
    // Lokal sunucu upload'ı ise API base path'ini ekle (şu an sadece uploads/profiles/ eklendiğine göre)
    return `/uploads/profiles/${profileImageUrl}`;
};
