import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Font, Svg, Path } from '@react-pdf/renderer';

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

// Türkçe karakter desteği için font kaydet
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-lightitalic-webfont.ttf',
      fontWeight: 300,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-mediumitalic-webfont.ttf',
      fontWeight: 500,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bolditalic-webfont.ttf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
});

// Stil tanımlamaları
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    color: PDF_ACCENT_BLUE,
    marginBottom: 10,
  },
  contactLine: {
    fontSize: 9,
    color: '#555',
    marginBottom: 3,
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
    fontSize: 9,
    color: '#333',
  },
  link: {
    color: PDF_ACCENT_BLUE,
    textDecoration: 'none',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 3,
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  experienceItem: {
    marginBottom: 12,
    minHeight: 0,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  experienceTitle: {
    fontSize: 11,
    fontWeight: 700,
  },
  experienceDate: {
    fontSize: 9,
    color: PDF_ACCENT_BLUE,
    fontStyle: 'italic',
  },
  experienceCompany: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 10,
    marginLeft: 15,
    marginBottom: 3,
  },
  educationItem: {
    marginBottom: 12,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  skillsContainer: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  languagesContainer: {
    fontSize: 10,
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

const PDFDocument: React.FC<PDFDocumentProps> = ({ data, isEnglish = false }) => {
  const { personalInfo, about, workExperience, education, skills, languages } = data;

  const locationLine = [personalInfo.city, personalInfo.country].filter(Boolean).join(', ');

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} wrap={false}>
          <Text style={styles.name}>
            {personalInfo.firstName} {personalInfo.lastName}
          </Text>
          <Text style={styles.title}>{personalInfo.title}</Text>
          
          {/* Contact Info - Line 1: konum, telefon, e-posta (her biri ayrı mavi arka plan) */}
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

          {/* Contact Info - Line 2: portfolyo, GitHub, LinkedIn */}
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

        {/* About */}
        {about && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Hakkımda')}</Text>
            <Text style={styles.text}>{about}</Text>
          </View>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getSectionTitle('İş Deneyimi')}</Text>
            {workExperience.map((exp) => (
              <View 
                key={exp.id} 
                style={styles.experienceItem}
                wrap={false}
              >
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceTitle}>{exp.position}</Text>
                  <Text style={styles.experienceDate}>
                    {formatDate(exp.startDate, isEnglish)} - {formatDate(exp.endDate, isEnglish)}
                  </Text>
                </View>
                <Text style={styles.experienceCompany}>
                  {exp.company}
                  {(exp.city || exp.country) && 
                    ` | ${exp.city && exp.country ? `${exp.city}, ${exp.country}` : exp.city || exp.country}`
                  }
                </Text>
                {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => (
                  <Text key={idx} style={styles.bulletPoint}>• {bullet}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Eğitim')}</Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.educationItem} wrap={false}>
                <View style={styles.educationHeader}>
                  <View>
                    <Text style={styles.experienceTitle}>{edu.university}</Text>
                    <Text style={styles.text}>{edu.department}</Text>
                  </View>
                  <Text style={styles.experienceDate}>
                    {formatDate(edu.startDate, isEnglish)} - {formatDate(edu.endDate, isEnglish)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Beceriler')}</Text>
            <Text style={styles.skillsContainer}>{skills.join(' - ')}</Text>
          </View>
        )}

        {/* Languages */}
        {languages.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Diller')}</Text>
            <Text style={styles.languagesContainer}>
              {languages
                .filter(lang => lang.language)
                .map(lang => `${lang.language} (${lang.level})`)
                .join(' - ')}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default PDFDocument;

