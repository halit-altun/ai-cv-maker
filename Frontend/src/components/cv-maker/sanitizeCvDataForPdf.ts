/**
 * PDF üretimi için CV verisini güvenli hale getirir.
 * Analiz sonrası gelen object/null alanlar ve CORS'lu fotoğraf
 * react-pdf'i "PDF oluşturulurken bir hata oluştu" ile düşürür.
 */

export type PdfCvData = {
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    country: string;
    city: string;
    phone: string;
    email: string;
    portfolio: string;
    github: string;
    linkedin: string;
    photoUrl?: string;
    includePhoto?: boolean;
    photoSizePt?: number;
  };
  about: string;
  workExperience: Array<{
    id: string;
    position: string;
    company: string;
    city: string;
    country: string;
    startDate: string;
    endDate: string;
    bulletPoints: string[];
  }>;
  education: Array<{
    id: string;
    university: string;
    department: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    level: string;
  }>;
};

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type || 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export function sanitizeCvDataForPdf(data: PdfCvData | null | undefined): PdfCvData {
  const personal = data?.personalInfo || ({} as PdfCvData['personalInfo']);
  const work = Array.isArray(data?.workExperience) ? data!.workExperience : [];
  const edu = Array.isArray(data?.education) ? data!.education : [];
  const skillsRaw = data?.skills;
  const langs = Array.isArray(data?.languages) ? data!.languages : [];

  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => asText(s).trim()).filter(Boolean)
    : typeof skillsRaw === 'string'
      ? asText(skillsRaw)
          .split(/[,;\n•·]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return {
    personalInfo: {
      firstName: asText(personal.firstName),
      lastName: asText(personal.lastName),
      title: asText(personal.title),
      country: asText(personal.country),
      city: asText(personal.city),
      phone: asText(personal.phone),
      email: asText(personal.email),
      portfolio: asText(personal.portfolio),
      github: asText(personal.github),
      linkedin: asText(personal.linkedin),
      photoUrl: asText(personal.photoUrl),
      includePhoto: Boolean(personal.includePhoto && asText(personal.photoUrl)),
      photoSizePt: Number(personal.photoSizePt) || undefined,
    },
    about: asText(data?.about),
    workExperience: work.filter(Boolean).map((exp, index) => ({
      id: asText(exp?.id) || String(index + 1),
      position: asText(exp?.position),
      company: asText(exp?.company),
      city: asText(exp?.city),
      country: asText(exp?.country),
      startDate: asText(exp?.startDate),
      endDate: asText(exp?.endDate),
      bulletPoints: Array.isArray(exp?.bulletPoints)
        ? exp.bulletPoints.map((bp) => asText(bp).trim()).filter(Boolean)
        : [],
    })),
    education: edu.filter(Boolean).map((item, index) => ({
      id: asText(item?.id) || String(index + 1),
      university: asText(item?.university),
      department: asText(item?.department),
      startDate: asText(item?.startDate),
      endDate: asText(item?.endDate),
    })),
    skills,
    languages: langs.filter(Boolean).map((lang, index) => ({
      id: asText(lang?.id) || String(index + 1),
      language: asText(lang?.language),
      level: asText(lang?.level),
    })),
  };
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 32) return null;
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl.startsWith('data:image') ? dataUrl : null;
  } catch {
    return null;
  }
}

/**
 * Fotoğrafı PDF'in yutacağı data URL'e çevirir; CORS/HTTP hata olursa fotoğrafsız devam.
 */
export async function prepareCvDataForPdf(data: PdfCvData): Promise<PdfCvData> {
  const sanitized = sanitizeCvDataForPdf(data);
  const url = sanitized.personalInfo.photoUrl || '';
  if (!sanitized.personalInfo.includePhoto || !url) {
    return {
      ...sanitized,
      personalInfo: { ...sanitized.personalInfo, includePhoto: false, photoUrl: '' },
    };
  }
  if (url.startsWith('data:image')) return sanitized;

  const resolved = await fetchImageAsDataUrl(url);
  if (!resolved) {
    return {
      ...sanitized,
      personalInfo: { ...sanitized.personalInfo, includePhoto: false, photoUrl: '' },
    };
  }
  return {
    ...sanitized,
    personalInfo: { ...sanitized.personalInfo, photoUrl: resolved },
  };
}
