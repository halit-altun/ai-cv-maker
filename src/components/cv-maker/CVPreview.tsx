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

const contactPreviewIconSx = { fontSize: '1rem', color: '#555', flexShrink: 0 };
import { pdf } from '@react-pdf/renderer';
import PDFDocument from './PDFDocument';
import { WorkExperienceItem } from './WorkExperience';
import { EducationItem } from './Education';
import { LanguageItem } from './Languages';

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
}

const CVPreview: React.FC<CVPreviewProps> = ({ data, isEnglish = false }) => {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

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
      const blob = await pdf(<PDFDocument data={data} isEnglish={isEnglish} />).toBlob();
      
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
            '@media print': {
              boxShadow: 'none',
              margin: 0,
              padding: '15mm',
              marginBottom: 0,
            }
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
            fontSize: '10px',
            '@media print': {
              display: 'none',
            }
          }
        }}
      >
        <Box className="cv-page">
          <Typography className="page-number">Sayfa 1</Typography>

      {/* Header - Kişisel Bilgiler */}
      <Box className="section-item" sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
          {data.personalInfo.firstName || 'Ad'} {data.personalInfo.lastName || 'Soyad'}
        </Typography>
        <Typography variant="h6" sx={{ color: '#2c5aa0', mb: 2, fontWeight: 500 }}>
          {data.personalInfo.title || 'Ünvan'}
        </Typography>

        {/* İletişim Bilgileri */}
        <Box sx={{ fontSize: '0.85rem', color: '#555', textAlign: 'center' }}>
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
                wordBreak: 'break-all'
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

      <Divider sx={{ my: 2 }} />

      {/* Hakkımda */}
      {data.about && (
        <>
          <Box className="section-item" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
              Hakkımda
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'justify', lineHeight: 1.6, color: '#333' }}>
              {data.about}
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* İş Deneyimi */}
      {data.workExperience.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 3 }}>
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
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
          <Divider sx={{ my: 2 }} />
        </>
      )}

        {/* Eğitim */}
      {data.education.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 3 }}>
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
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Beceriler */}
      {data.skills.length > 0 && (
        <>
          <Box className="section-item" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              Beceriler
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {data.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  sx={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    fontWeight: 500
                  }}
                />
              ))}
            </Stack>
          </Box>
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Diller */}
      {data.languages.length > 0 && (
        <Box className="section-item" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
            Diller
          </Typography>
          <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6 }}>
            {data.languages
              .filter(lang => lang.language)
              .map(lang => `${lang.language} (${lang.level})`)
              .join(' - ')}
          </Typography>
        </Box>
      )}
        </Box>
      </Box>
    </Box>
  );
};

export default CVPreview;

