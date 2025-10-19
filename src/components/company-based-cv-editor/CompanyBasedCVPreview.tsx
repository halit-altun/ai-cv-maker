'use client';

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Stack,
  Button,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  AutoAwesome as AutoAwesomeIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { pdf } from '@react-pdf/renderer';
import PDFDocument from '../cv-maker/PDFDocument';
import { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';

// Sortable Skill Item Component
const SortableSkillItem = ({ skill, index, onUpdate, onRemove }: { 
  skill: string; 
  index: number; 
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `skill-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: '#e0e0e0',
          }
        }}
      >
        ⋮⋮
      </Box>
      <TextField
        size="small"
        value={skill}
        onChange={(e) => onUpdate(index, e.target.value)}
        placeholder="Beceri adı"
        sx={{ flex: 1 }}
      />
      <Button
        size="small"
        color="error"
        onClick={() => onRemove(index)}
      >
        Sil
      </Button>
    </Box>
  );
};

// Sortable Bullet Point Item Component
const SortableBulletItem = ({ 
  bullet, 
  expIndex, 
  bulletIndex, 
  onUpdate, 
  onRemove 
}: { 
  bullet: string; 
  expIndex: number;
  bulletIndex: number; 
  onUpdate: (expIndex: number, bulletIndex: number, value: string) => void;
  onRemove: (expIndex: number, bulletIndex: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `bullet-${expIndex}-${bulletIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      component="li"
      sx={{ mb: 0.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          mt: 0.5,
          '&:hover': {
            backgroundColor: '#e0e0e0',
          }
        }}
      >
        ⋮⋮
      </Box>
      <TextField
        fullWidth
        size="small"
        value={bullet}
        onChange={(e) => onUpdate(expIndex, bulletIndex, e.target.value)}
        placeholder="Görev açıklaması"
        multiline
        rows={1}
        sx={{ 
          '& .MuiOutlinedInput-root': {
            fontSize: '0.875rem'
          }
        }}
      />
      <Button
        size="small"
        color="error"
        onClick={() => onRemove(expIndex, bulletIndex)}
        sx={{ minWidth: 'auto', px: 1, mt: 0.5 }}
      >
        ×
      </Button>
    </Box>
  );
};

interface CompanyBasedCVPreviewProps {
  data: CompanyBasedCVData;
  isEditing?: boolean;
  onUpdateField?: (field: string, value: any) => void;
  onUpdateWorkExperience?: (index: number, field: string, value: any) => void;
  onUpdateWorkExperienceBullet?: (expIndex: number, bulletIndex: number, value: string) => void;
  onAddWorkExperienceBullet?: (expIndex: number) => void;
  onRemoveWorkExperienceBullet?: (expIndex: number, bulletIndex: number) => void;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
  onSaveEditing?: () => void;
  onTranslateToEnglish?: (translatedData: CompanyBasedCVData) => void;
}

const CompanyBasedCVPreview: React.FC<CompanyBasedCVPreviewProps> = ({ 
  data, 
  isEditing = false, 
  onUpdateField, 
  onUpdateWorkExperience,
  onUpdateWorkExperienceBullet,
  onAddWorkExperienceBullet,
  onRemoveWorkExperienceBullet,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onTranslateToEnglish
}) => {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isEnglish, setIsEnglish] = React.useState(false);
  
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
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      // Skills drag and drop
      if (active.id.startsWith('skill-') && over.id.startsWith('skill-')) {
        const oldIndex = data.skills.findIndex((_, index) => `skill-${index}` === active.id);
        const newIndex = data.skills.findIndex((_, index) => `skill-${index}` === over.id);
        
        const newSkills = arrayMove(data.skills, oldIndex, newIndex);
        onUpdateField?.('skills', newSkills);
      }
      // Bullet points drag and drop
      else if (active.id.startsWith('bullet-') && over.id.startsWith('bullet-')) {
        const activeExpIndex = parseInt(active.id.split('-')[1]);
        const activeBulletIndex = parseInt(active.id.split('-')[2]);
        const overExpIndex = parseInt(over.id.split('-')[1]);
        const overBulletIndex = parseInt(over.id.split('-')[2]);
        
        // Only allow reordering within the same experience
        if (activeExpIndex === overExpIndex) {
          const exp = data.workExperience[activeExpIndex];
          const newBullets = arrayMove(exp.bulletPoints, activeBulletIndex, overBulletIndex);
          
          const updatedWorkExperience = [...data.workExperience];
          updatedWorkExperience[activeExpIndex] = {
            ...updatedWorkExperience[activeExpIndex],
            bulletPoints: newBullets
          };
          
          onUpdateField?.('workExperience', updatedWorkExperience);
        }
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      console.log('PDF oluşturuluyor...');
      
      // PDF document oluştur
      const blob = await pdf(<PDFDocument data={data} isEnglish={isEnglish} />).toBlob();
      
      console.log('PDF blob oluşturuldu, boyut:', blob.size);
      
      // Dosya adı - şirket adıyla birlikte
      const companyName = data.companyInfo?.name ? data.companyInfo.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Company';
      const fileName = `${data.personalInfo.firstName || 'CV'}_${data.personalInfo.lastName || 'Resume'}_${companyName}.pdf`;
      
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

  const handleTranslateToEnglish = async () => {
    if (!onTranslateToEnglish) return;
    
    setIsTranslating(true);
    try {
      console.log('Çeviri başlatılıyor...');
      const translatedData = await CompanyBasedCVService.translateCVToEnglish(data);
      console.log('Çeviri tamamlandı:', translatedData);
      onTranslateToEnglish(translatedData);
      setIsEnglish(true);
    } catch (error) {
      console.error('Çeviri hatası:', error);
      alert('Çeviri yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleToggleLanguage = () => {
    if (isEnglish) {
      // Türkçe'ye çevir - orijinal veriyi geri yükle
      setIsEnglish(false);
    } else {
      // İngilizce'ye çevir
      handleTranslateToEnglish();
    }
  };

  return (
    <Box>
      {/* Şirket Bilgileri ve Analiz Sonuçları */}
      {data.companyInfo && (
        <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Hedef Şirket: {data.companyInfo.name}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {data.companyInfo.description}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip label={data.companyInfo.industry} color="primary" size="small" />
              {data.companyInfo.values.slice(0, 3).map((value, index) => (
                <Chip key={index} label={value} variant="outlined" size="small" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Analiz Sonuçları */}
      {data.analysisResult && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                AI Analiz Sonuçları
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Uyum Skoru: {data.analysisResult.matchScore}%
              </Typography>
              <Box sx={{ 
                width: '100%', 
                height: 8, 
                backgroundColor: '#e0e0e0', 
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  width: `${data.analysisResult.matchScore}%`, 
                  height: '100%', 
                  backgroundColor: data.analysisResult.matchScore >= 80 ? '#4caf50' : 
                                 data.analysisResult.matchScore >= 60 ? '#ff9800' : '#f44336',
                  transition: 'width 0.3s ease'
                }} />
              </Box>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
              Öneriler:
            </Typography>
            <Stack spacing={1}>
              {data.analysisResult.recommendations.map((rec, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {rec}
                </Typography>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Hakkımda Bölümü Değişiklikleri:
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  <strong>Orijinal:</strong> {data.analysisResult.originalAbout}
                </Typography>
              </Alert>
              <Alert severity="success" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  <strong>Güncellenmiş:</strong> {data.analysisResult.updatedAbout}
                </Typography>
              </Alert>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                İş Deneyimi Bölümü Değişiklikleri:
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  <strong>Orijinal:</strong> {data.analysisResult.originalExperience}
                </Typography>
              </Alert>
              <Alert severity="success">
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  <strong>Güncellenmiş:</strong> {data.analysisResult.updatedExperience}
                </Typography>
              </Alert>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* CV Önizleme Header */}
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
            Şirket Odaklı CV Önizleme
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isEditing ? (
              <Button
                variant="outlined"
                onClick={onStartEditing}
                startIcon={<SettingsIcon />}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Düzenle
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onCancelEditing}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  İptal
                </Button>
                <Button
                  variant="contained"
                  onClick={onSaveEditing}
                  startIcon={<PreviewIcon />}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Kaydet
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<TranslateIcon />}
              onClick={handleToggleLanguage}
              size="small"
              disabled={isTranslating}
              sx={{ textTransform: 'none' }}
            >
              {isTranslating ? 'Çevriliyor...' : (isEnglish ? 'Türkçe\'ye Çevir' : 'İngilizce Çevir')}
            </Button>
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
      </Box>

      {/* CV İçeriği */}
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
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, width: '100%', maxWidth: 400 }}>
                  <TextField
                    size="small"
                    value={data.personalInfo.firstName || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.firstName', e.target.value)}
                    placeholder="Ad"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    value={data.personalInfo.lastName || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.lastName', e.target.value)}
                    placeholder="Soyad"
                    sx={{ flex: 1 }}
                  />
                </Box>
                <TextField
                  size="small"
                  value={data.personalInfo.title || ''}
                  onChange={(e) => onUpdateField?.('personalInfo.title', e.target.value)}
                  placeholder="Ünvan/Pozisyon"
                  sx={{ width: '100%', maxWidth: 400 }}
                />
              </Box>
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {data.personalInfo.firstName || 'Ad'} {data.personalInfo.lastName || 'Soyad'}
                </Typography>
                <Typography variant="h6" sx={{ color: '#2c5aa0', mb: 2, fontWeight: 500 }}>
                  {data.personalInfo.title || 'Ünvan'}
                </Typography>
              </>
            )}

            {/* İletişim Bilgileri */}
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 600 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    value={data.personalInfo.city || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.city', e.target.value)}
                    placeholder="Şehir"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    value={data.personalInfo.country || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.country', e.target.value)}
                    placeholder="Ülke"
                    sx={{ flex: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    value={data.personalInfo.phone || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.phone', e.target.value)}
                    placeholder="Telefon"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    value={data.personalInfo.email || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.email', e.target.value)}
                    placeholder="E-posta"
                    sx={{ flex: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    value={data.personalInfo.portfolio || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.portfolio', e.target.value)}
                    placeholder="Portfolio URL"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    value={data.personalInfo.github || ''}
                    onChange={(e) => onUpdateField?.('personalInfo.github', e.target.value)}
                    placeholder="GitHub URL"
                    sx={{ flex: 1 }}
                  />
                </Box>
                <TextField
                  size="small"
                  value={data.personalInfo.linkedin || ''}
                  onChange={(e) => onUpdateField?.('personalInfo.linkedin', e.target.value)}
                  placeholder="LinkedIn URL"
                  sx={{ width: '100%' }}
                />
              </Box>
            ) : (
              <Box sx={{ fontSize: '0.85rem', color: '#555', textAlign: 'center' }}>
                {/* İlk Satır: Adres | Telefon | E-posta */}
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {data.personalInfo.city && data.personalInfo.country && (
                    <span>{`${data.personalInfo.city}, ${data.personalInfo.country}`}</span>
                  )}
                  {(data.personalInfo.city || data.personalInfo.country) && data.personalInfo.phone && ' | '}
                  {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
                  {((data.personalInfo.city || data.personalInfo.country) || data.personalInfo.phone) && data.personalInfo.email && ' | '}
                  {data.personalInfo.email && (
                    <a 
                      href={`mailto:${data.personalInfo.email}`} 
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {data.personalInfo.email}
                    </a>
                  )}
                </Typography>

                {/* İkinci Satır: Portfolyo | GitHub | LinkedIn */}
                {(data.personalInfo.portfolio || data.personalInfo.github || data.personalInfo.linkedin) && (
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {data.personalInfo.portfolio && (
                      <a
                        href={data.personalInfo.portfolio.startsWith('http') ? data.personalInfo.portfolio : `https://${data.personalInfo.portfolio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {formatUrl(data.personalInfo.portfolio)}
                      </a>
                    )}
                    {data.personalInfo.portfolio && data.personalInfo.github && ' | '}
                    {data.personalInfo.github && (
                      <a
                        href={data.personalInfo.github.startsWith('http') ? data.personalInfo.github : `https://${data.personalInfo.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {formatUrl(data.personalInfo.github)}
                      </a>
                    )}
                    {(data.personalInfo.portfolio || data.personalInfo.github) && data.personalInfo.linkedin && ' | '}
                    {data.personalInfo.linkedin && (
                      <a
                        href={data.personalInfo.linkedin.startsWith('http') ? data.personalInfo.linkedin : `https://${data.personalInfo.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {formatUrl(data.personalInfo.linkedin)}
                      </a>
                    )}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Hakkımda */}
          {data.about && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
                  {getSectionTitle('Hakkımda')}
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={data.about}
                    onChange={(e) => onUpdateField?.('about', e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.875rem',
                        lineHeight: 1.6
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'justify', lineHeight: 1.6, color: '#333' }}>
                    {data.about}
                  </Typography>
                )}
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* İş Deneyimi */}
          {data.workExperience.length > 0 && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                  {getSectionTitle('İş Deneyimi')}
                </Typography>
                {Array.isArray(data.workExperience) && data.workExperience.map((exp, index) => (
                  <Box key={exp.id} sx={{ mb: 2.5, p: isEditing ? 2 : 0, border: isEditing ? '1px solid #e0e0e0' : 'none', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <TextField
                              size="small"
                              value={exp.position || ''}
                              onChange={(e) => onUpdateWorkExperience?.(index, 'position', e.target.value)}
                              placeholder="Pozisyon"
                              sx={{ mb: 1 }}
                            />
                            <TextField
                              size="small"
                              value={exp.company || ''}
                              onChange={(e) => onUpdateWorkExperience?.(index, 'company', e.target.value)}
                              placeholder="Şirket Adı"
                              sx={{ mb: 1 }}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                size="small"
                                value={exp.city || ''}
                                onChange={(e) => onUpdateWorkExperience?.(index, 'city', e.target.value)}
                                placeholder="Şehir"
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                size="small"
                                value={exp.country || ''}
                                onChange={(e) => onUpdateWorkExperience?.(index, 'country', e.target.value)}
                                placeholder="Ülke"
                                sx={{ flex: 1 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                size="small"
                                value={exp.startDate || ''}
                                onChange={(e) => onUpdateWorkExperience?.(index, 'startDate', e.target.value)}
                                placeholder="Başlangıç (YYYY-MM)"
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                size="small"
                                value={exp.endDate || ''}
                                onChange={(e) => onUpdateWorkExperience?.(index, 'endDate', e.target.value)}
                                placeholder="Bitiş (YYYY-MM veya Present)"
                                sx={{ flex: 1 }}
                              />
                            </Box>
                          </Box>
                        ) : (
                          <>
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
                          </>
                        )}
                      </Box>
                      {!isEditing && (
                        <Typography variant="body2" sx={{ color: '#2c5aa0', fontStyle: 'italic', whiteSpace: 'nowrap', ml: 2 }}>
                          {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                        </Typography>
                      )}
                    </Box>
                    {exp.bulletPoints.filter(bp => bp.trim()).length > 0 && (
                      <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                        {isEditing ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext 
                              items={exp.bulletPoints
                                .filter(bp => bp.trim())
                                .map((_, bIndex) => `bullet-${index}-${bIndex}`)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {exp.bulletPoints
                                .filter(bp => bp.trim())
                                .map((bullet, bIndex) => (
                                  <SortableBulletItem
                                    key={bIndex}
                                    bullet={bullet}
                                    expIndex={index}
                                    bulletIndex={bIndex}
                                    onUpdate={onUpdateWorkExperienceBullet!}
                                    onRemove={onRemoveWorkExperienceBullet!}
                                  />
                                ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          exp.bulletPoints
                            .filter(bp => bp.trim())
                            .map((bullet, bIndex) => (
                              <Typography
                                key={bIndex}
                                component="li"
                                variant="body2"
                                sx={{ color: '#333', lineHeight: 1.5, mb: 0.5 }}
                              >
                                {bullet}
                              </Typography>
                            ))
                        )}
                        {isEditing && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => onAddWorkExperienceBullet?.(index)}
                              sx={{ fontSize: '0.75rem' }}
                            >
                              + Görev Ekle
                            </Button>
                          </Box>
                        )}
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                  {getSectionTitle('Eğitim')}
                </Typography>
                {data.education.map((edu, index) => (
                  <Box key={edu.id} sx={{ mb: 2.5, p: isEditing ? 2 : 0, border: isEditing ? '1px solid #e0e0e0' : 'none', borderRadius: 1 }}>
                    {isEditing ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField
                          size="small"
                          value={edu.university || ''}
                          onChange={(e) => onUpdateField?.(`education.${index}.university`, e.target.value)}
                          placeholder="Üniversite Adı"
                        />
                        <TextField
                          size="small"
                          value={edu.department || ''}
                          onChange={(e) => onUpdateField?.(`education.${index}.department`, e.target.value)}
                          placeholder="Bölüm"
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            size="small"
                            value={edu.startDate || ''}
                            onChange={(e) => onUpdateField?.(`education.${index}.startDate`, e.target.value)}
                            placeholder="Başlangıç (YYYY-MM)"
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            size="small"
                            value={edu.endDate || ''}
                            onChange={(e) => onUpdateField?.(`education.${index}.endDate`, e.target.value)}
                            placeholder="Bitiş (YYYY-MM)"
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </Box>
                    ) : (
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
                    )}
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Beceriler */}
          {data.skills.length > 0 && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                  {getSectionTitle('Beceriler')}
                </Typography>
                {isEditing ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={Array.isArray(data.skills) ? data.skills.map((_, index) => `skill-${index}`) : []} strategy={verticalListSortingStrategy}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {Array.isArray(data.skills) && data.skills.map((skill, index) => (
                          <SortableSkillItem
                            key={index}
                            skill={skill}
                            index={index}
                            onUpdate={(idx, value) => onUpdateField?.(`skills.${idx}`, value)}
                            onRemove={(idx) => {
                              const newSkills = data.skills.filter((_, i) => i !== idx);
                              onUpdateField?.('skills', newSkills);
                            }}
                          />
                        ))}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const newSkills = [...data.skills, ''];
                            onUpdateField?.('skills', newSkills);
                          }}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          + Beceri Ekle
                        </Button>
                      </Box>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {Array.isArray(data.skills) && data.skills.map((skill, index) => (
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
                )}
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Diller */}
          {data.languages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                {getSectionTitle('Diller')}
              </Typography>
              {isEditing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Array.isArray(data.languages) && data.languages.map((lang, index) => (
                    <Box key={lang.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={lang.language || ''}
                        onChange={(e) => onUpdateField?.(`languages.${index}.language`, e.target.value)}
                        placeholder="Dil adı"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        value={lang.level || ''}
                        onChange={(e) => onUpdateField?.(`languages.${index}.level`, e.target.value)}
                        placeholder="Seviye (A1, B2, C1, vb.)"
                        sx={{ flex: 1 }}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          const newLanguages = data.languages.filter((_, i) => i !== index);
                          onUpdateField?.('languages', newLanguages);
                        }}
                      >
                        Sil
                      </Button>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const newLanguages = [...data.languages, { id: Date.now().toString(), language: '', level: '' }];
                      onUpdateField?.('languages', newLanguages);
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    + Dil Ekle
                  </Button>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6 }}>
                  {data.languages
                    .filter(lang => lang.language)
                    .map(lang => `${lang.language} (${lang.level})`)
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

export default CompanyBasedCVPreview;
