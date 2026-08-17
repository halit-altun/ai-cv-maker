import type { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import type { EducationItem } from '@/components/cv-maker/Education';
import type { LanguageItem } from '@/components/cv-maker/Languages';

import {
  CV_PHOTO_SIZE_PT,
} from '@/components/cv-maker/cvPhoto';

export const emptyPersonalInfo = {
  firstName: '',
  lastName: '',
  title: '',
  country: '',
  city: '',
  phone: '',
  email: '',
  portfolio: '',
  github: '',
  linkedin: '',
  /** Profil fotoğrafı URL (Cloudinary) — includePhoto açıkken kullanılır */
  photoUrl: '',
  /** CV önizleme/PDF'te fotoğraf göster */
  includePhoto: false,
  /** Oval foto çapı (pt) — sabit 3.5 cm */
  photoSizePt: CV_PHOTO_SIZE_PT,
};

export type PersonalInfoState = typeof emptyPersonalInfo;

/** Profilim URL’si yoksa kayıtlı CV fotoğrafına düş. */
export function resolveCvProfilePhotoUrl(
  profilePhotoUrl?: string | null,
  cvPhotoUrl?: string | null
): string {
  return String(profilePhotoUrl || '').trim() || String(cvPhotoUrl || '').trim();
}

export function normalizeWorkExperience(items: unknown[]): WorkExperienceItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw, index) => {
    const item = raw as Partial<WorkExperienceItem>;
    return {
      id: item?.id ? String(item.id) : `${Date.now()}-exp-${index}`,
      position: item?.position ?? '',
      company: item?.company ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      country: item?.country ?? '',
      city: item?.city ?? '',
      bulletPoints:
        Array.isArray(item?.bulletPoints) && item.bulletPoints.length > 0
          ? item.bulletPoints.map((bp) => String(bp ?? ''))
          : [''],
    };
  });
}

export function normalizeEducation(items: unknown[]): EducationItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw, index) => {
    const item = raw as Partial<EducationItem>;
    return {
      id: item?.id ? String(item.id) : `${Date.now()}-edu-${index}`,
      university: item?.university ?? '',
      department: item?.department ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
    };
  });
}

export function normalizeLanguages(items: unknown[]): LanguageItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw, index) => {
    const item = raw as Partial<LanguageItem>;
    return {
      id: item?.id ? String(item.id) : `${Date.now()}-lang-${index}`,
      language: item?.language ?? '',
      level: item?.level ?? '',
    };
  });
}

/** Basit doluluk skorundan CV Strength (0–100) */
export function computeCvStrength(input: {
  personalInfo: PersonalInfoState;
  about: string;
  workExperience: WorkExperienceItem[];
  education: EducationItem[];
  skills: string[];
  languages: LanguageItem[];
}): number {
  let score = 0;
  const p = input.personalInfo;
  const personalFields = [
    p.firstName,
    p.lastName,
    p.title,
    p.email,
    p.phone,
    p.city,
    p.country,
  ];
  score += (personalFields.filter((f) => f.trim()).length / personalFields.length) * 25;
  score += input.about.trim() ? 15 : 0;
  score += Math.min(input.workExperience.length, 2) * 15;
  const hasBullets = input.workExperience.some((w) =>
    w.bulletPoints.some((b) => b.trim())
  );
  score += hasBullets ? 10 : 0;
  score += Math.min(input.education.length, 1) * 10;
  score += Math.min(input.skills.length, 5) * 2;
  score += Math.min(input.languages.length, 2) * 5;
  return Math.min(100, Math.round(score));
}
