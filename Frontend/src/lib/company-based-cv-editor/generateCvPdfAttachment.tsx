import { pdf } from '@react-pdf/renderer';
import PDFDocument from '@/components/cv-maker/PDFDocument';
import type {
  CvBodyFontSize,
  CvHeadingFontSize,
  CvJobTitleFontSize,
  CvNameFontSize,
  CvProfileTitleFontSize,
  CvSkillsFontSize,
} from '@/components/cv-maker/cvTypography';
import type { CompanyBasedCVData } from './types';
import {
  resolveCompanyDisplayName,
  sanitizeCompanyForFileName,
} from '@/lib/company/normalizeCompanyDisplayName';

export type OptimizedCvPdfFontOptions = {
  bodyFontSize?: CvBodyFontSize;
  headingFontSize?: CvHeadingFontSize;
  jobTitleFontSize?: CvJobTitleFontSize;
  skillsFontSize?: CvSkillsFontSize;
  nameFontSize?: CvNameFontSize;
  profileTitleFontSize?: CvProfileTitleFontSize;
  /** Dosya adı sonuna eklenecek gerçek şirket adı (URL/domain değil) */
  companyName?: string;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = () => reject(new Error('PDF base64 dönüşümü başarısız.'));
    reader.readAsDataURL(blob);
  });
}

function buildOptimizedFileName(
  data: CompanyBasedCVData,
  companyNameOverride?: string
): string {
  const first = (data.personalInfo?.firstName || 'CV').replace(/[^\w\-]+/g, '_');
  const last = (data.personalInfo?.lastName || 'Resume').replace(/[^\w\-]+/g, '_');
  const display = resolveCompanyDisplayName({
    name: companyNameOverride || data.companyInfo?.name,
    website: data.companyInfo?.website,
  });
  const company = sanitizeCompanyForFileName(display || 'Optimized');
  return `${first}_${last}_${company}.pdf`;
}

/**
 * Optimize edilmiş / düzenlenmiş CV verisinden mail eki için PDF üretir.
 */
export async function generateOptimizedCvPdfAttachment(
  data: CompanyBasedCVData,
  options?: OptimizedCvPdfFontOptions & { isEnglish?: boolean }
): Promise<{ filename: string; contentBase64: string; contentType: string }> {
  const blob = await pdf(
    <PDFDocument
      data={data}
      isEnglish={Boolean(options?.isEnglish)}
      bodyFontSize={options?.bodyFontSize}
      headingFontSize={options?.headingFontSize}
      jobTitleFontSize={options?.jobTitleFontSize}
      skillsFontSize={options?.skillsFontSize}
      nameFontSize={options?.nameFontSize}
      profileTitleFontSize={options?.profileTitleFontSize}
      skillsStyle="badge"
      languagesStyle="badge"
    />
  ).toBlob();

  const contentBase64 = await blobToBase64(blob);
  if (!contentBase64) {
    throw new Error('Optimize CV PDF oluşturulamadı.');
  }

  // %PDF → base64 "JVBERi" ile başlar; bozuk blob'u erken yakala
  if (!contentBase64.startsWith('JVBERi')) {
    throw new Error('Üretilen CV eki geçerli PDF değil.');
  }

  return {
    filename: buildOptimizedFileName(data, options?.companyName),
    contentBase64,
    contentType: 'application/pdf',
  };
}
