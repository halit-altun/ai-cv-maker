import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Font, Svg, Path, Image } from '@react-pdf/renderer';
import type {
  CvBadgeStyle,
  CvBodyFontSize,
  CvHeadingFontSize,
  CvJobTitleFontSize,
  CvNameFontSize,
  CvProfileTitleFontSize,
  CvSkillsFontSize,
} from './cvTypography';
import {
  DEFAULT_CV_BODY_FONT_SIZE,
  DEFAULT_CV_HEADING_FONT_SIZE,
  DEFAULT_CV_JOB_TITLE_FONT_SIZE,
  DEFAULT_CV_NAME_FONT_SIZE,
  DEFAULT_CV_PROFILE_TITLE_FONT_SIZE,
  DEFAULT_CV_SKILLS_FONT_SIZE,
  clampCvBodyFontSize,
  clampCvHeadingFontSize,
  clampCvJobTitleFontSize,
  clampCvNameFontSize,
  clampCvProfileTitleFontSize,
  clampCvSkillsFontSize,
} from './cvTypography';
import {
  resolveCvPhotoSizePt,
  CV_PAGE_PADDING_X_PT,
  CV_PAGE_PADDING_TOP_PT,
  CV_PAGE_PADDING_BOTTOM_PT,
  CV_SECTION_GAP_PT,
  CV_ITEM_GAP_PT,
  CV_BULLET_GAP_PT,
  CV_CONTINUATION_PAGE_TOP_PT,
  CV_PHOTO_FRAME_COLOR,
  CV_PHOTO_FRAME_WIDTH_PT,
  CV_IDENTITY_BEFORE_CONTACT_PT,
  CV_PHOTO_SIZE_PT,
  CV_PHOTO_PAGE_LEFT_PT,
  CV_PHOTO_PAGE_TOP_PT,
} from './cvPhoto';

import { PdfFlowGap, withFlowGaps } from './pdf/PdfFlowGap';
import {
  CV_BADGE_ROW_GAP_PT,
  canRenderAtomically,
  chunkBadgeLabels,
  estimateBadgeSectionHeightPt,
  estimateTextSectionHeightPt,
} from './pdf/pdfPagination';

/** MUI @mui/icons-material ile aynı path'ler — PDF'te önizleme ikonlarıyla uyumlu */
const PDF_ICON_PATHS = {
  location:
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5',
  phone:
    'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02z',
  email:
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 4-8 5-8-5V6l8 5 8-5z',
  public:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39',
  github:
    'M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27',
  linkedin:
    'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z'
} as const;

/** Ünvan (`styles.title`) ve tarih / "Present" satırlarıyla aynı mavi */
const PDF_ACCENT_BLUE = '#2c5aa0';

/** İletişim alanları — her biri için ayrı arka plan */
const PDF_CONTACT_FIELD_BG = '#F5F5F5';

const PdfContactIcon = ({ pathD }: { pathD: string }) => (
  <Svg width={9} height={9} viewBox="0 0 24 24" style={{ marginRight: 3 }}>
    <Path d={pathD} fill={PDF_ACCENT_BLUE} />
  </Svg>
);

// Calibri ile metrik uyumlu, açık lisanslı Carlito dosyalarını Calibri ailesi
// olarak kaydet. Böylece PDF çıktısı platformdan bağımsız ve ATS uyumlu kalır.
Font.register({
  family: 'Calibri',
  fonts: [
    {
      src: '/fonts/Carlito-Regular.ttf',
      fontWeight: 300,
      fontStyle: 'normal',
    },
    {
      src: '/fonts/Carlito-Italic.ttf',
      fontWeight: 300,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Carlito-Regular.ttf',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    {
      src: '/fonts/Carlito-Italic.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Carlito-Regular.ttf',
      fontWeight: 500,
      fontStyle: 'normal',
    },
    {
      src: '/fonts/Carlito-Italic.ttf',
      fontWeight: 500,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Carlito-Bold.ttf',
      fontWeight: 700,
      fontStyle: 'normal',
    },
    {
      src: '/fonts/Carlito-BoldItalic.ttf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
});

// Kelimeleri hecelerine ayırma; sığmayan kelime tirelenmeden alt satıra geçer.
Font.registerHyphenationCallback((word) => [word.replace(/\u00AD/g, '')]);

/**
 * Ligature (fi/fl/ti vb.) ATS text extraction için kapatılır.
 * @react-pdf/textkit fontkit.layout'a varsayılan OpenType features geçirirdi;
 * ligature glyph'leri bazı parser'larda harf kaybettirir (solutions→solutons).
 * Kalıcı yama: patches/@react-pdf+textkit+6.1.0.patch (postinstall → patch-package).
 * Regression: npm test / npm run test:pdf-ligatures (prebuild'de de çalışır).
 */
const createStyles = (
  bodyPt: CvBodyFontSize,
  headingPt: CvHeadingFontSize,
  jobTitlePt: CvJobTitleFontSize,
  skillsPt: CvSkillsFontSize,
  namePt: CvNameFontSize,
  profileTitlePt: CvProfileTitleFontSize
) =>
  StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingLeft: 0,
      paddingRight: 0,
      /** Her sayfada alt boşluk — wrap motoru bu alanı rezerv eder */
      paddingBottom: CV_PAGE_PADDING_BOTTOM_PT,
      fontSize: bodyPt,
      fontFamily: 'Calibri',
      position: 'relative',
    },
    /** Same insets as preview `.cv-page` (top/X); bottom Page üzerinde */
    pageContent: {
      paddingTop: CV_PAGE_PADDING_TOP_PT,
      paddingBottom: 0,
      paddingLeft: CV_PAGE_PADDING_X_PT,
      paddingRight: CV_PAGE_PADDING_X_PT,
    },
    /** 2+ sayfa üst boşluğu (wrap sonrası paddingTop uygulanmadığı için) */
    continuationPageTopSpacer: {
      height: CV_CONTINUATION_PAGE_TOP_PT,
      width: '100%',
    },
    /** Bloklar arası boşluk PdfFlowGap ile verilir; marginBottom kullanılmaz */
    header: {
      marginBottom: 0,
      textAlign: 'center',
      position: 'relative',
    },
    /**
     * Photo frame on Page (padding:0) — same coords as preview
     * (page padding + header offset). View border ≈ CSS border-box oval.
     */
    photoFrameOnPage: {
      position: 'absolute',
      left: CV_PHOTO_PAGE_LEFT_PT,
      top: CV_PHOTO_PAGE_TOP_PT,
      zIndex: 10,
      borderWidth: CV_PHOTO_FRAME_WIDTH_PT,
      borderColor: CV_PHOTO_FRAME_COLOR,
      borderStyle: 'solid',
      overflow: 'hidden',
    },
    photoImage: {
      objectFit: 'cover',
      width: '100%',
      height: '100%',
    },
    /**
     * Name/title band on Page — same vertical band as photo (preview flex center).
     */
    nameTitleOnPage: {
      position: 'absolute',
      left: CV_PAGE_PADDING_X_PT,
      right: CV_PAGE_PADDING_X_PT,
      top: CV_PHOTO_PAGE_TOP_PT,
      height: CV_PHOTO_SIZE_PT,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      zIndex: 5,
    },
    /** Reserves info start Y in flow (preview spacer) */
    identitySpacer: {
      height: CV_IDENTITY_BEFORE_CONTACT_PT,
    },
    name: {
      fontSize: namePt,
      fontWeight: 700,
      marginBottom: 5,
      textAlign: 'center',
    },
    title: {
      fontSize: profileTitlePt,
      color: PDF_ACCENT_BLUE,
      marginBottom: 10,
      textAlign: 'center',
    },
    titleCentered: {
      fontSize: profileTitlePt,
      color: PDF_ACCENT_BLUE,
      marginBottom: 0,
      textAlign: 'center',
    },
    contactBlock: {
      marginTop: 0,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
      gap: 5,
    },
    contactBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: PDF_CONTACT_FIELD_BG,
      paddingTop: 3,
      paddingBottom: 3,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 4,
    },
    contactItemText: {
      fontSize: bodyPt,
      color: '#333',
    },
    link: {
      color: PDF_ACCENT_BLUE,
      textDecoration: 'none',
    },
    /**
     * Bölüm kutusu — alt boşluk YOK.
     * marginBottom, react-pdf `endOfPresence` hesabına girip sığan bölümü
     * sonraki sayfaya attırır; boşluk PdfFlowGap ile bölümlerin arasına konur.
     */
    section: {
      marginBottom: 0,
    },
    sectionTitle: {
      fontSize: headingPt,
      fontWeight: 700,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
      paddingBottom: 2,
    },
    text: {
      fontSize: bodyPt,
      lineHeight: 1.5,
      textAlign: 'left',
    },
    experienceItem: {
      marginBottom: 0,
      minHeight: 0,
    },
    experienceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    experienceTitle: {
      fontSize: jobTitlePt,
      fontWeight: 700,
    },
    educationTitle: {
      fontSize: bodyPt,
      fontWeight: 700,
    },
    experienceDate: {
      fontSize: bodyPt,
      color: PDF_ACCENT_BLUE,
      fontStyle: 'italic',
    },
    experienceCompany: {
      fontSize: bodyPt,
      color: '#666',
      fontStyle: 'italic',
      marginBottom: 5,
    },
    bulletPoint: {
      fontSize: bodyPt,
      marginLeft: 15,
    },
    bulletPointWrap: {
      marginBottom: 0,
    },
    educationItem: {
      marginBottom: 0,
    },
    educationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    skillsContainer: {
      fontSize: skillsPt,
      lineHeight: 1.5,
    },
    /** flexWrap yok — satırlar chunkBadgeLabels ile önceden bölünür */
    skillsBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      marginBottom: 0,
    },
    skillBadge: {
      backgroundColor: PDF_CONTACT_FIELD_BG,
      paddingTop: 3,
      paddingBottom: 3,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 4,
      marginRight: 5,
    },
    skillBadgeLastInRow: {
      backgroundColor: PDF_CONTACT_FIELD_BG,
      paddingTop: 3,
      paddingBottom: 3,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 4,
      marginRight: 0,
    },
    skillBadgeText: {
      fontSize: skillsPt,
      color: '#333',
    },
    languageBadgeText: {
      fontSize: bodyPt,
      color: '#333',
    },
    languagesContainer: {
      fontSize: bodyPt,
      lineHeight: 1.5,
    },
  });

interface PDFDocumentProps {
  data: {
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
      startDate: string;
      endDate: string;
      country: string;
      city: string;
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
  isEnglish?: boolean;
  bodyFontSize?: CvBodyFontSize;
  headingFontSize?: CvHeadingFontSize;
  jobTitleFontSize?: CvJobTitleFontSize;
  skillsFontSize?: CvSkillsFontSize;
  nameFontSize?: CvNameFontSize;
  profileTitleFontSize?: CvProfileTitleFontSize;
  skillsStyle?: CvBadgeStyle;
  languagesStyle?: CvBadgeStyle;
}

const formatDate = (dateString: string, isEnglish: boolean = false) => {
  if (!dateString || dateString === 'Present' || dateString === 'present') {
    return isEnglish ? 'Present' : 'Devam Ediyor';
  }
  if (dateString.includes('Present') || dateString.includes('present')) {
    return isEnglish ? 'Present' : 'Devam Ediyor';
  }
  
  // Eğer tarih zaten İngilizce formatında ise (Oct, Aug, Jan vb.)
  if (dateString.includes('Oct') || dateString.includes('Aug') || dateString.includes('Jan') || 
      dateString.includes('Feb') || dateString.includes('Mar') || dateString.includes('Apr') ||
      dateString.includes('May') || dateString.includes('Jun') || dateString.includes('Jul') ||
      dateString.includes('Sep') || dateString.includes('Nov') || dateString.includes('Dec')) {
    return dateString;
  }
  
  // Hem Türkçe hem İngilizce için sayısal format - 2025-01 → 01/2025
  const [year, month] = dateString.split('-');
  if (!year || !month) return dateString; // undefined kontrolü
  return `${month}/${year}`;
};

const formatUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const formatLinkedInDisplayUrl = (url: string) => {
  if (!url) return '';
  return formatUrl(url).replace(/^www\./, '');
};

const ensureHttps = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

const PDFDocument: React.FC<PDFDocumentProps> = ({
  data,
  isEnglish = false,
  bodyFontSize = DEFAULT_CV_BODY_FONT_SIZE,
  headingFontSize = DEFAULT_CV_HEADING_FONT_SIZE,
  jobTitleFontSize = DEFAULT_CV_JOB_TITLE_FONT_SIZE,
  skillsFontSize = DEFAULT_CV_SKILLS_FONT_SIZE,
  nameFontSize = DEFAULT_CV_NAME_FONT_SIZE,
  profileTitleFontSize = DEFAULT_CV_PROFILE_TITLE_FONT_SIZE,
  skillsStyle = 'plain',
  languagesStyle = 'plain',
}) => {
  const { personalInfo, about, workExperience, education, skills, languages } = data;
  const bodyPt = clampCvBodyFontSize(bodyFontSize);
  const skillsPt = clampCvSkillsFontSize(skillsFontSize);
  const headingPt = clampCvHeadingFontSize(headingFontSize);
  const styles = createStyles(
    bodyPt,
    headingPt,
    clampCvJobTitleFontSize(jobTitleFontSize),
    skillsPt,
    clampCvNameFontSize(nameFontSize),
    clampCvProfileTitleFontSize(profileTitleFontSize)
  );

  const locationLine = [personalInfo.city, personalInfo.country].filter(Boolean).join(', ');
  const showPhoto = Boolean(personalInfo.includePhoto && personalInfo.photoUrl);
  const photoSizePt = resolveCvPhotoSizePt(personalInfo);

  // Başlık çevirileri
  const getSectionTitle = (section: string) => {
    if (!isEnglish) return section;
    
    const translations: { [key: string]: string } = {
      'Hakkımda': 'About Me',
      'İş Deneyimi': 'Work Experience',
      'Eğitim': 'Education',
      'Beceriler': 'Skills',
      'Diller': 'Languages'
    };
    
    return translations[section] || section;
  };

  const headerInner = (
    <>
      <View style={styles.identitySpacer} />

      <View style={styles.contactBlock}>
      <View style={styles.contactRow}>
        {locationLine ? (
          <View style={styles.contactBadge}>
            <PdfContactIcon pathD={PDF_ICON_PATHS.location} />
            <Text style={styles.contactItemText}>{locationLine}</Text>
          </View>
        ) : null}
        {personalInfo.phone ? (
          <View style={styles.contactBadge}>
            <PdfContactIcon pathD={PDF_ICON_PATHS.phone} />
            <Text style={styles.contactItemText}>{personalInfo.phone}</Text>
          </View>
        ) : null}
        {personalInfo.email ? (
          <View style={styles.contactBadge}>
            <PdfContactIcon pathD={PDF_ICON_PATHS.email} />
            <Link src={`mailto:${personalInfo.email}`} style={styles.link}>
              <Text style={styles.contactItemText}>{personalInfo.email}</Text>
            </Link>
          </View>
        ) : null}
      </View>

      {(personalInfo.portfolio || personalInfo.github || personalInfo.linkedin) && (
        <View style={styles.contactRow}>
          {personalInfo.portfolio ? (
            <View style={styles.contactBadge}>
              <PdfContactIcon pathD={PDF_ICON_PATHS.public} />
              <Link src={ensureHttps(personalInfo.portfolio)} style={styles.link}>
                <Text style={styles.contactItemText}>{formatUrl(personalInfo.portfolio)}</Text>
              </Link>
            </View>
          ) : null}
          {personalInfo.github ? (
            <View style={styles.contactBadge}>
              <PdfContactIcon pathD={PDF_ICON_PATHS.github} />
              <Link src={ensureHttps(personalInfo.github)} style={styles.link}>
                <Text style={styles.contactItemText}>{formatUrl(personalInfo.github)}</Text>
              </Link>
            </View>
          ) : null}
          {personalInfo.linkedin ? (
            <View style={styles.contactBadge}>
              <PdfContactIcon pathD={PDF_ICON_PATHS.linkedin} />
              <Link src={ensureHttps(personalInfo.linkedin)} style={styles.link}>
                <Text style={styles.contactItemText}>
                  {formatLinkedInDisplayUrl(personalInfo.linkedin)}
                </Text>
              </Link>
            </View>
          ) : null}
        </View>
      )}
      </View>
    </>
  );

  const photoInnerSize = Math.max(
    photoSizePt - CV_PHOTO_FRAME_WIDTH_PT * 2,
    1
  );

  const skillLabels = skills.filter((skill) => skill.trim());
  const skillBadgeRows = chunkBadgeLabels(skillLabels, skillsPt);
  const languageLabels = languages
    .filter((lang) => lang.language)
    .map((lang) => `${lang.language} (${lang.level})`);
  const languageBadgeRows = chunkBadgeLabels(languageLabels, bodyPt);

  /** Badge satırları: her satır bölünmez; satır arası boşluk spacer ile */
  const renderBadgeRows = (
    rows: string[][],
    keyPrefix: string,
    textStyle: typeof styles.skillBadgeText
  ) =>
    withFlowGaps(
      rows.map((row, rowIndex) => (
        <View key={`${keyPrefix}-row-${rowIndex}`} style={styles.skillsBadgeRow} wrap={false}>
          {row.map((label, index) => (
            <View
              key={`${label}-${index}`}
              style={index === row.length - 1 ? styles.skillBadgeLastInRow : styles.skillBadge}
            >
              <Text style={textStyle}>{label}</Text>
            </View>
          ))}
        </View>
      )),
      CV_BADGE_ROW_GAP_PT,
      `${keyPrefix}-row-gap`
    );

  /**
   * Bölüm bütün halinde mi taşınacak?
   * Tek sayfaya sığan bölümlere wrap={false} verilir → sığmıyorsa tamamı
   * sonraki sayfaya geçer, sığıyorsa kesinlikle bulunduğu sayfada kalır.
   * Sayfadan uzun bölümler doğal akışta parçalanır (taşma / kırpılma olmaz).
   */
  const isAboutAtomic = canRenderAtomically(
    estimateTextSectionHeightPt(about ?? '', headingPt, bodyPt, 1.5)
  );
  const isSkillsAtomic = canRenderAtomically(
    skillsStyle === 'badge'
      ? estimateBadgeSectionHeightPt(skillBadgeRows.length, headingPt, skillsPt)
      : estimateTextSectionHeightPt(skillLabels.join(' - '), headingPt, skillsPt, 1.5)
  );
  const isLanguagesAtomic = canRenderAtomically(
    languagesStyle === 'badge'
      ? estimateBadgeSectionHeightPt(languageBadgeRows.length, headingPt, bodyPt)
      : estimateTextSectionHeightPt(languageLabels.join(' - '), headingPt, bodyPt, 1.5)
  );

  /**
   * Akış blokları — aralarındaki sabit boşluk withFlowGaps ile eklenir.
   * Hiçbir blokta marginBottom veya minPresenceAhead kullanılmaz.
   * Gerekçe: ./pdf/pdfPagination.ts
   */
  const flowBlocks: React.ReactNode[] = [
    <View key="header" style={styles.header} wrap={false}>
      {headerInner}
    </View>,
  ];

  if (about) {
    flowBlocks.push(
      <View key="about" style={styles.section} wrap={!isAboutAtomic}>
        <Text style={styles.sectionTitle}>{getSectionTitle('Hakkımda')}</Text>
        <Text style={styles.text}>{about}</Text>
      </View>
    );
  }

  if (workExperience.length > 0) {
    flowBlocks.push(
      <View key="work-experience" style={styles.section}>
        {withFlowGaps(
          workExperience.map((exp, expIndex) => {
            const bullets = exp.bulletPoints.filter((bp) => bp.trim());
            return (
              <View key={exp.id} style={styles.experienceItem}>
                {/* Başlık + şirket satırı hiçbir zaman ayrılmaz */}
                <View wrap={false}>
                  {expIndex === 0 ? (
                    <Text style={styles.sectionTitle}>{getSectionTitle('İş Deneyimi')}</Text>
                  ) : null}
                  <View style={styles.experienceHeader}>
                    <Text style={styles.experienceTitle}>{exp.position}</Text>
                    <Text style={styles.experienceDate}>
                      {formatDate(exp.startDate, isEnglish)} - {formatDate(exp.endDate, isEnglish)}
                    </Text>
                  </View>
                  <Text style={styles.experienceCompany}>
                    {exp.company}
                    {(exp.city || exp.country) &&
                      ` | ${exp.city && exp.country ? `${exp.city}, ${exp.country}` : exp.city || exp.country}`}
                  </Text>
                </View>
                {withFlowGaps(
                  bullets.map((bullet, idx) => (
                    <View key={idx} style={styles.bulletPointWrap}>
                      <Text style={styles.bulletPoint} wrap={false}>
                        • {bullet}
                      </Text>
                    </View>
                  )),
                  CV_BULLET_GAP_PT,
                  `bullet-gap-${exp.id}`
                )}
              </View>
            );
          }),
          CV_ITEM_GAP_PT,
          'experience-gap'
        )}
      </View>
    );
  }

  if (education.length > 0) {
    flowBlocks.push(
      <View key="education" style={styles.section}>
        {withFlowGaps(
          education.map((edu, eduIndex) => (
            <View key={edu.id} style={styles.educationItem} wrap={false}>
              {eduIndex === 0 ? (
                <Text style={styles.sectionTitle}>{getSectionTitle('Eğitim')}</Text>
              ) : null}
              <View style={styles.educationHeader}>
                <View>
                  <Text style={styles.educationTitle}>{edu.university}</Text>
                  <Text style={styles.text}>{edu.department}</Text>
                </View>
                <Text style={styles.experienceDate}>
                  {formatDate(edu.startDate, isEnglish)} - {formatDate(edu.endDate, isEnglish)}
                </Text>
              </View>
            </View>
          )),
          CV_ITEM_GAP_PT,
          'education-gap'
        )}
      </View>
    );
  }

  if (skillLabels.length > 0) {
    flowBlocks.push(
      <View key="skills" style={styles.section} wrap={!isSkillsAtomic}>
        <Text style={styles.sectionTitle}>{getSectionTitle('Beceriler')}</Text>
        {skillsStyle === 'badge' ? (
          renderBadgeRows(skillBadgeRows, 'skill', styles.skillBadgeText)
        ) : (
          <Text style={styles.skillsContainer}>{skillLabels.join(' - ')}</Text>
        )}
      </View>
    );
  }

  if (languageLabels.length > 0) {
    flowBlocks.push(
      <View key="languages" style={styles.section} wrap={!isLanguagesAtomic}>
        <Text style={styles.sectionTitle}>{getSectionTitle('Diller')}</Text>
        {languagesStyle === 'badge' ? (
          renderBadgeRows(languageBadgeRows, 'lang', styles.languageBadgeText)
        ) : (
          <Text style={styles.languagesContainer}>{languageLabels.join(' - ')}</Text>
        )}
      </View>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Wrap ile gelen 2+ sayfada içerik üstten 25pt boşlukla başlar */}
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <View style={styles.continuationPageTopSpacer} />
            ) : null
          }
        />
        {/* Page-absolute layers — same geometry as preview (padding + offsets) */}
        {showPhoto ? (
          <View
            style={[
              styles.photoFrameOnPage,
              {
                width: photoSizePt,
                height: photoSizePt,
                borderRadius: photoSizePt / 2,
              },
            ]}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image
              src={personalInfo.photoUrl!}
              style={[
                styles.photoImage,
                {
                  width: photoInnerSize,
                  height: photoInnerSize,
                  borderRadius: photoInnerSize / 2,
                },
              ]}
            />
          </View>
        ) : null}
        <View style={styles.nameTitleOnPage}>
          <Text style={styles.name}>
            {personalInfo.firstName} {personalInfo.lastName}
          </Text>
          <Text style={styles.titleCentered}>{personalInfo.title}</Text>
        </View>

        <View style={styles.pageContent}>{withFlowGaps(flowBlocks, CV_SECTION_GAP_PT, 'section-gap')}</View>
      </Page>
    </Document>
  );
};

export default PDFDocument;

