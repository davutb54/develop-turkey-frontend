import { useFeatureMap, useInstitution, useTerminology } from '../context/FeatureContext';

export { useInstitution, useTerminology };

/**
 * Belirli bir feature'ın değerini döner.
 * 
 * @param key - Feature anahtarı (örn: "Identity.AllowGoogleLogin")
 * @param defaultValue - Feature bulunamazsa kullanılacak varsayılan değer
 * @returns T tipinde feature değeri
 * 
 * @example
 * // Boolean feature
 * const allowGoogle = useFeature<boolean>('Identity.AllowGoogleLogin', true);
 * 
 * @example
 * // Number feature
 * const maxLength = useFeature<number>('Content.MaxTitleLength', 200);
 * 
 * @example
 * // String feature
 * const color = useFeature<string>('UI.PrimaryColor', '#6366f1');
 */
export function useFeature<T extends boolean | number | string>(
  key: string,
  defaultValue: T
): T {
  const featureMap = useFeatureMap();
  const rawValue = featureMap[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }

  // Tip dönüşümü
  if (typeof defaultValue === 'boolean') {
    return (rawValue.toLowerCase() === 'true') as unknown as T;
  }

  if (typeof defaultValue === 'number') {
    const parsed = Number(rawValue);
    return (isNaN(parsed) ? defaultValue : parsed) as unknown as T;
  }

  return rawValue as unknown as T;
}

/**
 * Birden fazla feature'ı tek seferde okur.
 * 
 * @example
 * const { allowGoogle, requireEmail } = useFeatures({
 *   allowGoogle: ['Identity.AllowGoogleLogin', true],
 *   requireEmail: ['Identity.RequireEmailVerification', true],
 * });
 */
export function useFeatures<T extends Record<string, [string, boolean | number | string]>>(
  config: T
): { [K in keyof T]: T[K][1] } {
  const featureMap = useFeatureMap();

  const result = {} as { [K in keyof T]: T[K][1] };

  for (const [alias, [key, defaultValue]] of Object.entries(config)) {
    const rawValue = featureMap[key as string];

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      (result as any)[alias] = defaultValue;
      continue;
    }

    if (typeof defaultValue === 'boolean') {
      (result as any)[alias] = rawValue.toLowerCase() === 'true';
    } else if (typeof defaultValue === 'number') {
      const parsed = Number(rawValue);
      (result as any)[alias] = isNaN(parsed) ? defaultValue : parsed;
    } else {
      (result as any)[alias] = rawValue;
    }
  }

  return result;
}
