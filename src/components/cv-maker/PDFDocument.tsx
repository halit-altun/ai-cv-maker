import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Font } from '@react-pdf/renderer';

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
    color: '#2c5aa0',
    marginBottom: 10,
  },
  contactLine: {
    fontSize: 9,
    color: '#555',
    marginBottom: 3,
  },
  link: {
    color: '#555',
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
    color: '#2c5aa0',
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
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Devam Ediyor';
  const [year, month] = dateString.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

const formatUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const ensureHttps = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

const PDFDocument: React.FC<PDFDocumentProps> = ({ data }) => {
  const { personalInfo, about, workExperience, education, skills, languages } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {personalInfo.firstName} {personalInfo.lastName}
          </Text>
          <Text style={styles.title}>{personalInfo.title}</Text>
          
          {/* Contact Info - Line 1 */}
          <Text style={styles.contactLine}>
            {[
              personalInfo.city && personalInfo.country 
                ? `${personalInfo.city}, ${personalInfo.country}` 
                : personalInfo.city || personalInfo.country,
              personalInfo.phone,
              personalInfo.email
            ].filter(Boolean).join(' | ')}
          </Text>

          {/* Contact Info - Line 2 with Links */}
          <View style={styles.contactLine}>
            <Text>
              {personalInfo.portfolio && (
                <>
                  <Link src={ensureHttps(personalInfo.portfolio)} style={styles.link}>
                    {formatUrl(personalInfo.portfolio)}
                  </Link>
                  {(personalInfo.github || personalInfo.linkedin) && ' | '}
                </>
              )}
              {personalInfo.github && (
                <>
                  <Link src={ensureHttps(personalInfo.github)} style={styles.link}>
                    {formatUrl(personalInfo.github)}
                  </Link>
                  {personalInfo.linkedin && ' | '}
                </>
              )}
              {personalInfo.linkedin && (
                <Link src={ensureHttps(personalInfo.linkedin)} style={styles.link}>
                  {formatUrl(personalInfo.linkedin)}
                </Link>
              )}
            </Text>
          </View>
        </View>

        {/* About */}
        {about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkımda</Text>
            <Text style={styles.text}>{about}</Text>
          </View>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İş Deneyimi</Text>
            {workExperience.map((exp) => (
              <View key={exp.id} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceTitle}>{exp.position}</Text>
                  <Text style={styles.experienceDate}>
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
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
            <Text style={styles.sectionTitle}>Eğitim</Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.educationItem}>
                <View style={styles.educationHeader}>
                  <View>
                    <Text style={styles.experienceTitle}>{edu.university}</Text>
                    <Text style={styles.text}>{edu.department}</Text>
                  </View>
                  <Text style={styles.experienceDate}>
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beceriler</Text>
            <Text style={styles.skillsContainer}>{skills.join(' - ')}</Text>
          </View>
        )}

        {/* Languages */}
        {languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diller</Text>
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

