import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { featureService } from '../services/featureService';
import { institutionService } from '../services/institutionService';
import { userService } from '../services/userService';
import { useAuth } from './AuthContext';

import type { Institution } from '../types';

// Dinamik feature map — key: "Identity.AllowGoogleLogin", value: "true"
export type FeatureMap = Record<string, string>;

// Default feature değerleri (backend'den yüklenemezse fallback)
const defaultFeatures: FeatureMap = {
  'Identity.AllowGoogleLogin': 'true',
  'Identity.RequireEmailVerification': 'true',
  'Identity.EnableCaptcha': 'true',
  'Identity.AllowImpersonation': 'false',
  'Identity.SessionTimeoutMinutes': '60',
  'Identity.MaxLoginAttempts': '5',
  'Content.RequireMapLocation': 'true',
  'Content.AllowImageUpload': 'true',
  'Content.AllowAnonymousReport': 'false',
  'Content.MaxTitleLength': '200',
  'Content.RequireCategorySelection': 'true',
  'Content.MinSolutionLength': '50',
  'Social.EnableUpvote': 'true',
  'Social.EnableNestedComments': 'true',
  'Social.EnableFollowSystem': 'true',
  'Social.EnableSavedSolutions': 'true',
  'Moderation.RequireExpertApproval': 'false',
  'Moderation.EnableReportSystem': 'true',
  'Communication.EnableSignalR': 'true',
  'Communication.EnableFeedbackInbox': 'true',
  'Identity.EnableIpWhitelist': 'false',
  'UX.InfiniteScrollEnabled': 'true',
  'UX.DarkModeEnabled': 'false',
  'Content.EnableCustomHierarchy': 'false',
  'Content.RequireLocationSelection': 'true',
};

const FeatureMapContext = createContext<FeatureMap>(defaultFeatures);
const InstitutionIdContext = createContext<number>(1);
const InstitutionContext = createContext<Institution | null>(null);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId } = useAuth();
  const [features, setFeatures] = useState<FeatureMap>(defaultFeatures);
  const [institutionId, setInstitutionId] = useState<number>(1);
  const [institution, setInstitution] = useState<Institution | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (userId === null) return; // Auth hala yükleniyorsa bekle

      try {
        let instId = 1;

        // 1. Resolve by Subdomain/Domain (Login olmayan kullanıcılar için izolasyon)
        // kurum1.developturkey.com → slug="kurum1" → getBySubdomain
        // developturkey.com (apex) → getByDomain fallback
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && !hostname.startsWith('127.0.0.')) {
            const parts = hostname.split('.');
            const isWww = parts[0] === 'www';
            if (parts.length >= 3 && !isWww) {
                // gerçek subdomain var: kurum1.developturkey.com
                const slug = parts[0];
                try {
                    const subRes = await institutionService.getBySubdomain(slug);
                    if (subRes.data?.success && subRes.data.data?.id) {
                        instId = subRes.data.data.id;
                    }
                } catch {
                    // subdomain kayıtlı değil — apex domain ile dene
                    try {
                        const domainRes = await institutionService.getByDomain(hostname);
                        if (domainRes.data?.success && domainRes.data.data?.id) {
                            instId = domainRes.data.data.id;
                        }
                    } catch {
                        // kayıtlı kurum yok, varsayılan instId=1 kullanılır
                    }
                }
            } else {
                // apex domain veya www — subdomain yok, varsayılan kurum 1 kullanılır
            }
        }

        // 2. Resolve by User (Login olan kullanıcı kendi kurumuna tabidir)
        if (userId !== false) {
          const meRes = await userService.getMe();
          if (meRes.data?.success && meRes.data.data?.institutionId) {
            instId = meRes.data.data.institutionId;
          }
        }

        if (isActive) setInstitutionId(instId);

        // 3. Fetch Institution Details (Logo, Color, Hierarchy)
        const instRes = await institutionService.getById(instId);
        if (isActive && instRes.data?.success) {
            setInstitution(instRes.data.data);
        }

        // 4. Fetch structured features for this institution
        const featRes = await featureService.getInstitutionFeatures(instId);
        if (!isActive) return;

        if (featRes.data?.success && featRes.data.data) {
          setFeatures({ ...defaultFeatures, ...featRes.data.data });
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Feature yükleme hatası", err);
        setFeatures(defaultFeatures);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const featuresValue = useMemo(() => features, [features]);

  return (
    <InstitutionIdContext.Provider value={institutionId}>
        <InstitutionContext.Provider value={institution}>
            <FeatureMapContext.Provider value={featuresValue}>
                {children}
            </FeatureMapContext.Provider>
        </InstitutionContext.Provider>
    </InstitutionIdContext.Provider>
  );
};

export const useFeatureMap = () => useContext(FeatureMapContext);
export const useInstitutionId = () => useContext(InstitutionIdContext);
export const useInstitution = () => useContext(InstitutionContext);
export const useTerminology = () => {
    const inst = useInstitution();
    const map = useContext(FeatureMapContext);
    const enableCustomHierarchy = map['Content.EnableCustomHierarchy'] === 'true';

    return {
        cityLabel: enableCustomHierarchy ? (inst?.customHierarchyLabel || 'Özel Hiyerarşi') : 'Şehir',
        problemLabel: 'Sorun',
        topicLabel: 'Kategori'
    };
};

// Geriye dönük uyumluluk için eski useFeatures hook'u
export const useFeatures = () => {
  const map = useContext(FeatureMapContext);
  return {
    Identity: {
      AllowGoogleLogin: map['Identity.AllowGoogleLogin'] === 'true',
      RequireEmailVerification: map['Identity.RequireEmailVerification'] === 'true',
    },
    Content: {
      RequireMapLocation: map['Content.RequireMapLocation'] === 'true',
      AllowImageUpload: map['Content.AllowImageUpload'] === 'true',
      AllowAnonymous: map['Content.AllowAnonymousReport'] === 'true',
    },
    Social: {
      EnableUpvote: map['Social.EnableUpvote'] === 'true',
      EnableNestedComments: map['Social.EnableNestedComments'] === 'true',
    },
    Moderation: {
      RequireExpertApproval: map['Moderation.RequireExpertApproval'] === 'true',
    },
  };
};
