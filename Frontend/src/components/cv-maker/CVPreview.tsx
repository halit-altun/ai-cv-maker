'use client';

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Stack,
  Button
} from '@mui/material';
import {
  Download as DownloadIcon,
  LocationOn,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Public,
  GitHub,
  LinkedIn
} from '@mui/icons-material';

import { pdf } from '@react-pdf/renderer';
import PDFDocument from './PDFDocument';
import { WorkExperienceItem } from './WorkExperience';
import { EducationItem } from './Education';
import { LanguageItem } from './Languages';
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
  CV_FONT_FAMILY,
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
  CV_PHOTO_GAP_PT,
  CV_PHOTO_LEFT_PT,
  CV_PHOTO_FRAME_COLOR,
  CV_PHOTO_FRAME_WIDTH_PT,
  CV_IDENTITY_BEFORE_CONTACT_PT,
} from './cvPhoto';

/** İletişim rozetleriyle aynı arka plan */
const CONTACT_BADGE_BG = '#F5F5F5';

interface CVData {
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
  workExperience: WorkExperienceItem[];
  education: EducationItem[];
  skills: string[];
  languages: LanguageItem[];
}

interface CVPreviewProps {
  data: CVData;
  isEnglish?: boolean;
  /** AI CV Builder gibi gömülü panellerde üst indirme çubuğunu gizler */
  hideChrome?: boolean;
  bodyFontSize?: CvBodyFontSize;
  headingFontSize?: CvHeadingFontSize;
  jobTitleFontSize?: CvJobTitleFontSize;
  skillsFontSize?: CvSkillsFontSize;
  nameFontSize?: CvNameFontSize;
  profileTitleFontSize?: CvProfileTitleFontSize;
  skillsStyle?: CvBadgeStyle;
  languagesStyle?: CvBadgeStyle;
}

const CVPreview: React.FC<CVPreviewProps> = ({
  data,
  isEnglish = false,
  hideChrome = false,
  bodyFontSize = DEFAULT_CV_BODY_FONT_SIZE,
  headingFontSize = DEFAULT_CV_HEADING_FONT_SIZE,
  jobTitleFontSize = DEFAULT_CV_JOB_TITLE_FONT_SIZE,
  skillsFontSize = DEFAULT_CV_SKILLS_FONT_SIZE,
  nameFontSize = DEFAULT_CV_NAME_FONT_SIZE,
  profileTitleFontSize = DEFAULT_CV_PROFILE_TITLE_FONT_SIZE,
  skillsStyle = 'plain',
  languagesStyle = 'plain',
}) => {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const resolvedBodyFontSize = clampCvBodyFontSize(bodyFontSize);
  const resolvedHeadingFontSize = clampCvHeadingFontSize(headingFontSize);
  const resolvedJobTitleFontSize = clampCvJobTitleFontSize(jobTitleFontSize);
  const resolvedSkillsFontSize = clampCvSkillsFontSize(skillsFontSize);
  const resolvedNameFontSize = clampCvNameFontSize(nameFontSize);
  const resolvedProfileTitleFontSize = clampCvProfileTitleFontSize(profileTitleFontSize);
  const bodyPt = resolvedBodyFontSize;
  const headingPt = resolvedHeadingFontSize;
  const jobTitlePt = resolvedJobTitleFontSize;
  const skillsPt = resolvedSkillsFontSize;
  const namePt = resolvedNameFontSize;
  const profileTitlePt = resolvedProfileTitleFontSize;
  const showPhoto = Boolean(
    data.personalInfo.includePhoto && data.personalInfo.photoUrl
  );
  const photoSizePt = resolveCvPhotoSizePt(data.personalInfo);

  const contactPreviewIconSx = {
    fontSize: `${bodyPt}pt`,
    color: '#555',
    flexShrink: 0,
  };

  const formatDate = (dateString: string) => {
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

  const locationLine = [data.personalInfo.city, data.personalInfo.country]
    .filter(Boolean)
    .join(', ');

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      console.log('PDF oluşturuluyor...');
      
      // PDF document oluştur
      const blob = await pdf(
        <PDFDocument
          data={data}
          isEnglish={isEnglish}
          bodyFontSize={resolvedBodyFontSize}
          headingFontSize={resolvedHeadingFontSize}
          jobTitleFontSize={resolvedJobTitleFontSize}
          skillsFontSize={resolvedSkillsFontSize}
          nameFontSize={resolvedNameFontSize}
          profileTitleFontSize={resolvedProfileTitleFontSize}
          skillsStyle={skillsStyle}
          languagesStyle={languagesStyle}
        />
      ).toBlob();
      
      console.log('PDF blob oluşturuldu, boyut:', blob.size);
      
      // Dosya adı
      const fileName = `${data.personalInfo.firstName || 'CV'}_${data.personalInfo.lastName || 'Resume'}.pdf`;
      
      console.log('İndiriliyor:', fileName);
      
      // Blob'u indir
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('PDF başarıyla indirildi!');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      {!hideChrome && (
      <Box
        sx={{
          position: 'sticky',
          top: 20,
          zIndex: 10,
          backgroundColor: '#f5f5f5',
          pb: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#666' }}>
            CV Önizleme
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
            size="small"
            disabled={isGenerating}
            sx={{ textTransform: 'none' }}
          >
            {isGenerating ? 'Oluşturuluyor...' : 'PDF İndir'}
          </Button>
        </Box>
      </Box>
      )}

      <Box
        ref={cvRef}
        sx={{
          backgroundColor: '#ffffff',
          padding: 0,
          '& .cv-page': {
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: '#ffffff',
            padding: '20mm',
            marginBottom: '20px',
            position: 'relative',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
            fontFamily: CV_FONT_FAMILY,
            fontSize: `${bodyPt}pt`,
            wordBreak: 'normal',
            overflowWrap: 'normal',
            hyphens: 'none',
            WebkitHyphens: 'none',
            fontVariantLigatures: 'none',
            fontFeatureSettings: '"liga" 0, "clig" 0, "dlig" 0, "hlig" 0, "calt" 0',
            '@media print': {
              boxShadow: 'none',
              margin: 0,
              padding: '15mm',
              marginBottom: 0,
            },
            '& .MuiTypography-h4': {
              fontSize: `${namePt}pt`,
              fontWeight: 700,
              fontFamily: 'inherit',
            },
            '& .MuiTypography-h6': {
              fontSize: `${headingPt}pt`,
              fontFamily: 'inherit',
            },
            '& .MuiTypography-subtitle1': {
              fontSize: `${bodyPt}pt`,
              fontFamily: 'inherit',
            },
            '& .MuiTypography-body1': {
              fontSize: `${bodyPt}pt`,
              fontFamily: 'inherit',
            },
            '& .MuiTypography-body2': {
              fontSize: `${bodyPt}pt`,
              fontFamily: 'inherit',
            },
            '& .MuiChip-label': {
              fontSize: `${bodyPt}pt`,
              fontFamily: 'inherit',
            },
            // cv-* kuralları MUI variant kurallarından sonra gelmeli (aynı specificity)
            '& .cv-name': {
              fontSize: `${namePt}pt`,
              fontWeight: 700,
              fontFamily: 'inherit',
            },
            '& .cv-profile-title': {
              fontSize: `${profileTitlePt}pt`,
              fontFamily: 'inherit',
            },
            '& .cv-job-title': {
              fontSize: `${jobTitlePt}pt`,
              fontWeight: 700,
              fontFamily: 'inherit',
            },
            '& .cv-skill-text, & .cv-skill-text .MuiChip-label': {
              fontSize: `${skillsPt}pt`,
              fontWeight: 400,
              fontFamily: 'inherit',
            },
            '& a, & span, & li': {
              fontFamily: 'inherit',
              hyphens: 'none',
              WebkitHyphens: 'none',
            },
          },
          '& .experience-item': {
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            '@media print': {
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }
          },
          '& .section-item': {
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            '@media print': {
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }
          },
          '& .education-item': {
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            '@media print': {
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }
          },
          '& .page-number': {
            position: 'absolute',
            bottom: '10mm',
            right: '15mm',
            color: '#999',
            fontSize: `${bodyPt}pt`,
            '@media print': {
              display: 'none',
            }
          }
        }}
      >
        <Box className="cv-page">
          <Typography className="page-number">Sayfa 1</Typography>

      {/* Header: ad/ünvan/info konumu sabit; foto varsa absolute eklenir */}
      <Box
        className="section-item"
        sx={{
          mb: 2,
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {showPhoto ? (
          <Box
            component="img"
            src={data.personalInfo.photoUrl}
            alt=""
            sx={{
              position: 'absolute',
              left: `${CV_PHOTO_LEFT_PT}pt`,
              top: `${CV_PHOTO_GAP_PT}pt`,
              width: `${photoSizePt}pt`,
              height: `${photoSizePt}pt`,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `${CV_PHOTO_FRAME_WIDTH_PT}pt solid ${CV_PHOTO_FRAME_COLOR}`,
              boxSizing: 'border-box',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        <Box
          sx={{
            position: 'relative',
            height: `${CV_IDENTITY_BEFORE_CONTACT_PT}pt`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${CV_PHOTO_GAP_PT}pt`,
              height: `${photoSizePt}pt`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            <Typography
              className="cv-name"
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1a1a1a',
                mb: 0.5,
                fontSize: `${namePt}pt`,
                textAlign: 'center',
              }}
            >
              {data.personalInfo.firstName || 'Ad'} {data.personalInfo.lastName || 'Soyad'}
            </Typography>
            <Typography
              className="cv-profile-title"
              sx={{
                color: '#2c5aa0',
                mb: 0,
                fontWeight: 500,
                fontSize: `${profileTitlePt}pt`,
                textAlign: 'center',
              }}
            >
              {data.personalInfo.title || 'Ünvan'}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            fontSize: `${bodyPt}pt`,
            color: '#555',
            textAlign: 'center',
          }}
        >
          {/* İlk Satır: Konum | Telefon | E-posta */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              columnGap: 1,
              rowGap: 0.5,
              mb: 0.5
            }}
          >
            {locationLine && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={contactPreviewIconSx} aria-hidden />
                <Typography component="span" variant="body2" sx={{ color: 'inherit' }}>
                  {locationLine}
                </Typography>
              </Box>
            )}
            {data.personalInfo.phone && (
              <>
                {locationLine && (
                  <Typography component="span" variant="body2" sx={{ color: '#bbb', userSelect: 'none' }}>
                    |
                  </Typography>
                )}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={contactPreviewIconSx} aria-hidden />
                  <Typography component="span" variant="body2">
                    {data.personalInfo.phone}
                  </Typography>
                </Box>
              </>
            )}
            {data.personalInfo.email && (
              <>
                {(locationLine || data.personalInfo.phone) && (
                  <Typography component="span" variant="body2" sx={{ color: '#bbb', userSelect: 'none' }}>
                    |
                  </Typography>
                )}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailIcon sx={contactPreviewIconSx} aria-hidden />
                  <a
                    href={`mailto:${data.personalInfo.email}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {data.personalInfo.email}
                  </a>
                </Box>
              </>
            )}
          </Box>

          {/* İkinci Satır: Portfolyo | GitHub | LinkedIn */}
          {(data.personalInfo.portfolio || data.personalInfo.github || data.personalInfo.linkedin) && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                columnGap: 1,
                rowGap: 0.5,
                wordBreak: 'normal',
                overflowWrap: 'normal',
                hyphens: 'none',
              }}
            >
              {data.personalInfo.portfolio && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Public sx={contactPreviewIconSx} aria-hidden />
                  <a
                    href={
                      data.personalInfo.portfolio.startsWith('http')
                        ? data.personalInfo.portfolio
                        : `https://${data.personalInfo.portfolio}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {formatUrl(data.personalInfo.portfolio)}
                  </a>
                </Box>
              )}
              {data.personalInfo.portfolio && data.personalInfo.github && (
                <Typography component="span" variant="body2" sx={{ color: '#bbb', userSelect: 'none' }}>
                  |
                </Typography>
              )}
              {data.personalInfo.github && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <GitHub sx={contactPreviewIconSx} aria-hidden />
                  <a
                    href={
                      data.personalInfo.github.startsWith('http')
                        ? data.personalInfo.github
                        : `https://${data.personalInfo.github}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {formatUrl(data.personalInfo.github)}
                  </a>
                </Box>
              )}
              {(data.personalInfo.portfolio || data.personalInfo.github) && data.personalInfo.linkedin && (
                <Typography component="span" variant="body2" sx={{ color: '#bbb', userSelect: 'none' }}>
                  |
                </Typography>
              )}
              {data.personalInfo.linkedin && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <LinkedIn sx={contactPreviewIconSx} aria-hidden />
                  <a
                    href={
                      data.personalInfo.linkedin.startsWith('http')
                        ? data.personalInfo.linkedin
                        : `https://${data.personalInfo.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {formatLinkedInDisplayUrl(data.personalInfo.linkedin)}
                  </a>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 1.25 }} />

      {/* Hakkımda */}
      {data.about && (
        <>
          <Box className="section-item" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
              Hakkımda
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'left', lineHeight: 1.6, color: '#333' }}>
              {data.about}
            </Typography>
          </Box>
          <Divider sx={{ my: 1.25 }} />
        </>
      )}

      {/* İş Deneyimi */}
      {data.workExperience.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              İş Deneyimi
            </Typography>
            {data.workExperience.map((exp, index) => (
              <Box 
                key={exp.id} 
                className="experience-item"
                sx={{ 
                  mb: 2.5,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box>
                    <Typography
                      className="cv-job-title"
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: '#1a1a1a' }}
                    >
                      {exp.position || 'Pozisyon'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                      {exp.company || 'Firma Adı'}
                      {(exp.city || exp.country) && (
                        <span>
                          {' | '}
                          {exp.city && exp.country ? `${exp.city}, ${exp.country}` : exp.city || exp.country}
                        </span>
                      )}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#2c5aa0', fontStyle: 'italic', whiteSpace: 'nowrap', ml: 2 }}>
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                  </Typography>
                </Box>
                {exp.bulletPoints.filter(bp => bp.trim()).length > 0 && (
                  <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                    {exp.bulletPoints
                      .filter(bp => bp.trim())
                      .map((bullet, bIndex) => (
                        <Typography
                          component="li"
                          key={bIndex}
                          variant="body2"
                          sx={{ mb: 0.5, color: '#333', lineHeight: 1.5 }}
                        >
                          {bullet}
                        </Typography>
                      ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Divider sx={{ my: 1.25 }} />
        </>
      )}

        {/* Eğitim */}
      {data.education.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              Eğitim
            </Typography>
            {data.education.map((edu) => (
              <Box key={edu.id} className="education-item" sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                      {edu.university || 'Üniversite'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#333' }}>
                      {edu.department || 'Bölüm'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#2c5aa0', fontStyle: 'italic', whiteSpace: 'nowrap', ml: 2 }}>
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Divider sx={{ my: 1.25 }} />
        </>
      )}

      {/* Beceriler */}
      {data.skills.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              Beceriler
            </Typography>
            {skillsStyle === 'badge' ? (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                }}
              >
                {data.skills.map((skill, index) => (
                  <Box
                    key={index}
                    className="cv-skill-text"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      bgcolor: CONTACT_BADGE_BG,
                      px: 1,
                      py: 0.4,
                      borderRadius: '4px',
                      fontSize: `${skillsPt}pt`,
                      color: '#333',
                      lineHeight: 1.4,
                      fontWeight: 400,
                    }}
                  >
                    {skill}
                  </Box>
                ))}
              </Box>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {data.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    className="cv-skill-text"
                    label={skill}
                    size="small"
                    sx={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      fontWeight: 400,
                      fontSize: `${skillsPt}pt`,
                      '& .MuiChip-label': {
                        fontSize: `${skillsPt}pt`,
                        fontWeight: 400,
                      },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
          <Divider sx={{ my: 1.25 }} />
        </>
      )}

      {/* Diller */}
      {data.languages.length > 0 && (
        <Box className="section-item" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
            Diller
          </Typography>
          {languagesStyle === 'badge' ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
              }}
            >
              {data.languages
                .filter((lang) => lang.language)
                .map((lang, index) => (
                  <Box
                    key={lang.id || index}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      bgcolor: CONTACT_BADGE_BG,
                      px: 1,
                      py: 0.4,
                      borderRadius: '4px',
                      fontSize: `${bodyPt}pt`,
                      color: '#333',
                      lineHeight: 1.4,
                    }}
                  >
                    {lang.language} ({lang.level})
                  </Box>
                ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6 }}>
              {data.languages
                .filter((lang) => lang.language)
                .map((lang) => `${lang.language} (${lang.level})`)
                .join(' - ')}
            </Typography>
          )}
        </Box>
      )}
        </Box>
      </Box>
    </Box>
  );
};

export default CVPreview;

