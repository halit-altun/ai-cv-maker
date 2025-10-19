'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  LinearProgress,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Upload as UploadIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import CompanyBasedCVPreview from '@/components/company-based-cv-editor/CompanyBasedCVPreview';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import { CompanyBasedCVData, CompanyInfo, CVAnalysisResponse, CompanyLink } from '@/lib/company-based-cv-editor/types';

const steps = [
  'CV Yükle',
  'Şirket Linkleri Gir',
  'Analiz Et',
  'Önizleme'
];

interface AIAdaptationSettings {
  about: boolean;
  workExperience: boolean;
  skills: boolean;
  languages: boolean;
}

const defaultAISettings: AIAdaptationSettings = {
  about: true,
  workExperience: false,
  skills: false,
  languages: false
};

export default function CompanyBasedCVEditor() {
  const [activeStep, setActiveStep] = useState(0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [companyLinks, setCompanyLinks] = useState<CompanyLink[]>([{ url: '', description: '' }]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [cvData, setCvData] = useState<CompanyBasedCVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AIAdaptationSettings>(defaultAISettings);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCVData, setEditableCVData] = useState<CompanyBasedCVData | null>(null);
  const [cvLanguage, setCvLanguage] = useState<'turkish' | 'english'>('turkish');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI'dan gelen metinleri parse et - sadece bullet point'leri uyarla
  const parseWorkExperienceFromText = (text: string) => {
    if (!text) return [];
    
    console.log('AI Work Experience Text:', text);
    
    // AI'dan gelen metni iş deneyimlerine böl - daha akıllı parsing
    // Önce \n\n ile böl, sonra her bölümü kontrol et
    let workExperienceSections = text.split('\n\n').filter(section => section.trim().length > 0);
    
    // Eğer sadece 1 bölüm varsa, orijinal CV'den 2 iş deneyimi olduğunu biliyoruz
    // AI metnini manuel olarak 2 parçaya böl
    if (workExperienceSections.length === 1) {
      console.log('AI returned only 1 experience, splitting manually...');
      const lines = workExperienceSections[0].split('\n');
      
      // İkinci iş deneyiminin başlangıcını bul (genellikle "Stajyer" veya benzeri kelimelerle başlar)
      let secondExpStartIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Stajyer') || lines[i].includes('Backend') || lines[i].includes('Developer')) {
          secondExpStartIndex = i;
          break;
        }
      }
      
      if (secondExpStartIndex > 0) {
        const firstExp = lines.slice(0, secondExpStartIndex).join('\n');
        const secondExp = lines.slice(secondExpStartIndex).join('\n');
        workExperienceSections = [firstExp, secondExp];
        console.log('Manually split into 2 experiences');
      }
    }
    
    console.log('Work Experience Sections:', workExperienceSections.length);
    
    // Her iş deneyimi için bullet point'leri çıkar
    const parsedExperiences = workExperienceSections.map((section, index) => {
      const lines = section.split('\n');
      const headerLine = lines[0]; // İlk satır: pozisyon, şirket, tarih
      const bulletLines = lines.slice(1).filter(line => 
        line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')
      );
      
      // Bullet point'leri temizle
      const bulletPoints = bulletLines.map(line => 
        line.replace(/^[•\-\*]\s*/, '').trim()
      ).filter(point => point.length > 0);
      
      console.log(`Experience ${index + 1}:`, {
        header: headerLine,
        bulletCount: bulletPoints.length,
        bullets: bulletPoints
      });
      
      // Orijinal CV'den pozisyon ve şirket bilgilerini al
      // AI sadece bullet point'leri uyarlar, diğer bilgiler orijinal CV'den gelir
      const originalWorkExperience = cvData?.workExperience || [];
      const originalExp = originalWorkExperience[index];
      
      console.log(`Experience ${index + 1} - Original:`, originalExp);
      
      // Eğer orijinal CV'den bilgi yoksa, AI'dan gelen header'ı parse et
      let position = originalExp?.position || '';
      let company = originalExp?.company || '';
      let startDate = originalExp?.startDate || '2025-01';
      let endDate = originalExp?.endDate || 'Present';
      let city = originalExp?.city || 'İstanbul';
      let country = originalExp?.country || 'Türkiye';
      
      // AI metninden tarih bilgilerini parse et
      const sectionLines = section.split('\n');
      console.log(`Experience ${index + 1} - AI Section Lines:`, sectionLines);
      
      // Tarih bilgilerini AI metninden bul
      for (const line of sectionLines) {
        // Tarih formatlarını ara: "01/2025 - Present", "08/2023 - 10/2023"
        const dateMatch = line.match(/(\d{2}\/\d{4})\s*-\s*(Present|\d{2}\/\d{4})/);
        if (dateMatch) {
          const [, startDateStr, endDateStr] = dateMatch;
          console.log(`Found date in line: ${line}`);
          console.log(`Start: ${startDateStr}, End: ${endDateStr}`);
          
          // Tarih formatını dönüştür: "01/2025" -> "2025-01"
          const [month, year] = startDateStr.split('/');
          startDate = `${year}-${month.padStart(2, '0')}`;
          
          if (endDateStr === 'Present') {
            endDate = 'Present';
          } else {
            const [endMonth, endYear] = endDateStr.split('/');
            endDate = `${endYear}-${endMonth.padStart(2, '0')}`;
          }
          
          console.log(`Parsed dates - Start: ${startDate}, End: ${endDate}`);
          break;
        }
      }
      
      // Eğer orijinal CV'den bilgi yoksa, AI header'ından parse et
      if (!position || !company) {
        console.log('Parsing from AI header:', headerLine);
        
        // Basit parsing - ilk satır genellikle pozisyon, ikinci satır şirket
        const lines = section.split('\n');
        if (lines.length >= 2) {
          position = position || lines[0].trim();
          company = company || lines[1].trim();
        }
      }
      
      console.log(`Parsed Experience ${index + 1}:`, {
        position: position,
        company: company,
        startDate,
        endDate
      });
      
      return {
        id: originalExp?.id || (index + 1).toString(),
        position: position || `İş Deneyimi ${index + 1}`,
        company: company || `Şirket ${index + 1}`,
        city: city,
        country: country,
        startDate: startDate,
        endDate: endDate,
        bulletPoints: bulletPoints.length > 0 ? bulletPoints : originalExp?.bulletPoints || ['AI tarafından uyarlanmış iş deneyimi']
      };
    });
    
    console.log('Parsed Work Experiences:', parsedExperiences);
    return parsedExperiences;
  };

  const parseSkillsFromText = (text: string) => {
    if (!text) return [];
    
    // AI'dan gelen metni temizle ve kısa beceri isimlerine dönüştür
    const skills = text.split(',').map(skill => {
      // Uzun açıklamaları temizle, sadece ilk 2 kelimeyi al
      const words = skill.trim().split(' ');
      if (words.length > 2) {
        return words.slice(0, 2).join(' ');
      }
      return skill.trim();
    }).filter(skill => skill.length > 0 && skill.length < 50); // Çok uzun becerileri filtrele
    
    console.log('Parsed Skills:', skills);
    return skills;
  };

  const parseLanguagesFromText = (text: string) => {
    if (!text) return [];
    return [{
      id: '1',
      language: 'AI Uyarlanmış Dil',
      level: 'AI Uyarlanmış Seviye'
    }];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCvFile(file);
      setError(null);
      setActiveStep(1);
    } else {
      setError('Lütfen geçerli bir PDF dosyası seçin.');
    }
  };

  // Company link ekleme fonksiyonları
  const addCompanyLink = () => {
    if (companyLinks.length >= 3) {
      setError('Maksimum 3 link ekleyebilirsiniz.');
      return;
    }
    
    setCompanyLinks(prev => [...prev, { url: '', description: '' }]);
  };

  const removeCompanyLink = (index: number) => {
    setCompanyLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateCompanyLink = (index: number, field: keyof CompanyLink, value: string) => {
    setCompanyLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ));
  };

  const handleCompanyLinksSubmit = async () => {
    // Validation
    if (companyLinks.length === 0) {
      setError('En az 1 link eklemelisiniz.');
      return;
    }

    for (let i = 0; i < companyLinks.length; i++) {
      const link = companyLinks[i];
      if (!link.url.trim()) {
        setError(`Link ${i + 1}: URL boş olamaz.`);
        return;
      }
      if (!link.description.trim() || link.description.trim().length < 5) {
        setError(`Link ${i + 1}: Açıklama en az 5 karakter olmalıdır.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting company analysis with links:', companyLinks);
      const company = await CompanyBasedCVService.analyzeCompany(companyLinks);
      setCompanyInfo(company);
      setActiveStep(2);
    } catch (err) {
      setError('Şirket bilgileri analiz edilirken bir hata oluştu.');
      console.error('Company analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCV = async () => {
    if (!cvFile || !companyInfo) return;

    setLoading(true);
    setError(null);

    try {
      // PDF'den metin çıkar
      const cvText = await CompanyBasedCVService.extractTextFromPDF(cvFile);
      console.log('Extracted CV text:', cvText);
      
      // AI ile CV'yi analiz et ve proje formatına dönüştür
      const parsedCVData = await CompanyBasedCVService.parseCVDataWithAI(cvText);
      console.log('AI parsed CV data:', parsedCVData);
      
      // CV'yi analiz et ve uyarla
      const analysis = await CompanyBasedCVService.analyzeAndAdaptCV({
        cvText,
        companyUrl: companyLinks[0]?.url || '',
        companyInfo,
        cvLanguage
      });

      setAnalysisResult(analysis);

      // AI ayarlarına göre CV data oluştur
      const adaptedCVData: CompanyBasedCVData = {
        personalInfo: {
          firstName: parsedCVData.personalInfo?.firstName || 'Ad',
          lastName: parsedCVData.personalInfo?.lastName || 'Soyad',
          title: parsedCVData.personalInfo?.title || 'Ünvan',
          country: parsedCVData.personalInfo?.country || '',
          city: parsedCVData.personalInfo?.city || '',
          phone: parsedCVData.personalInfo?.phone || '',
          email: parsedCVData.personalInfo?.email || '',
          portfolio: parsedCVData.personalInfo?.portfolio || '',
          github: parsedCVData.personalInfo?.github || '',
          linkedin: parsedCVData.personalInfo?.linkedin || ''
        },
        about: aiSettings.about ? analysis.updatedAbout : parsedCVData.about || '',
        workExperience: aiSettings.workExperience ? 
          parseWorkExperienceFromText(analysis.updatedExperience) : 
          parsedCVData.workExperience || [],
        education: parsedCVData.education || [],
        skills: aiSettings.skills ? 
          parseSkillsFromText(analysis.updatedSkills) : 
          parsedCVData.skills || [],
        languages: aiSettings.languages ? 
          parseLanguagesFromText(analysis.updatedLanguages) : 
          parsedCVData.languages || [],
        companyInfo,
        analysisResult: analysis
      };

      setCvData(adaptedCVData);
      setEditableCVData(adaptedCVData);
      setActiveStep(3);
    } catch (err) {
      setError('CV analiz edilirken bir hata oluştu.');
      console.error('CV analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Editör fonksiyonları
  const handleStartEditing = () => {
    setIsEditing(true);
    setEditableCVData({ ...cvData! });
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditableCVData(cvData);
  };

  const handleSaveEditing = () => {
    setCvData(editableCVData);
    setIsEditing(false);
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!editableCVData) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const updatedData = { ...editableCVData };
      (updatedData as any)[parent] = {
        ...(updatedData as any)[parent],
        [child]: value
      };
      setEditableCVData(updatedData);
    } else {
      setEditableCVData(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleUpdateWorkExperience = (index: number, field: string, value: any) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    updatedWorkExperience[index] = {
      ...updatedWorkExperience[index],
      [field]: value
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleUpdateWorkExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = [...updatedWorkExperience[expIndex].bulletPoints];
    updatedBullets[bulletIndex] = value;
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleAddWorkExperienceBullet = (expIndex: number) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = [...updatedWorkExperience[expIndex].bulletPoints, ''];
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleRemoveWorkExperienceBullet = (expIndex: number, bulletIndex: number) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = updatedWorkExperience[expIndex].bulletPoints.filter((_, i) => i !== bulletIndex);
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleTranslateToEnglish = (translatedData: CompanyBasedCVData) => {
    setEditableCVData(translatedData);
    setCvData(translatedData);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              CV Dosyanızı Yükleyin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              PDF formatında CV dosyanızı seçin
            </Typography>
            
            {/* CV Dil Seçimi */}
            <Box sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
                CV'nizin dili nedir?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant={cvLanguage === 'turkish' ? 'contained' : 'outlined'}
                  onClick={() => setCvLanguage('turkish')}
                  sx={{ minWidth: 120 }}
                >
                  🇹🇷 Türkçe
                </Button>
                <Button
                  variant={cvLanguage === 'english' ? 'contained' : 'outlined'}
                  onClick={() => setCvLanguage('english')}
                  sx={{ minWidth: 120 }}
                >
                  🇺🇸 English
                </Button>
              </Box>
            </Box>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              size="large"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<UploadIcon />}
            >
              PDF Seç
            </Button>
            {cvFile && (
              <Box sx={{ mt: 2 }}>
                <Chip label={cvFile.name} color="primary" />
                <Chip 
                  label={cvLanguage === 'turkish' ? 'Türkçe CV' : 'English CV'} 
                  color="secondary" 
                  sx={{ ml: 1 }} 
                />
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LinkIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Şirket Web Siteleri
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hedef şirketin web sitesi linklerini girin (maksimum 3 link)
              </Typography>
            </Box>
            
            {/* Company Links */}
            <Box sx={{ mb: 3 }}>
              {companyLinks.map((link, index) => (
                <Card key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Link {index + 1}
                    </Typography>
                    {companyLinks.length > 1 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeCompanyLink(index)}
                      >
                        Kaldır
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="URL"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => updateCompanyLink(index, 'url', e.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="Açıklama (en az 5 karakter)"
                      placeholder="Bu sayfanın ne hakkında olduğunu açıklayın"
                      value={link.description}
                      onChange={(e) => updateCompanyLink(index, 'description', e.target.value)}
                      helperText={`${link.description.length}/5 karakter`}
                      error={link.description.length > 0 && link.description.length < 5}
                    />
                  </Box>
                </Card>
              ))}
              
              {companyLinks.length < 3 && (
                <Button
                  variant="outlined"
                  onClick={addCompanyLink}
                  startIcon={<LinkIcon />}
                  sx={{ mb: 2 }}
                >
                  Link Ekle ({companyLinks.length}/3)
                </Button>
              )}
            </Box>
            
            {/* AI Ayarları Accordion */}
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    AI Uyarlama Ayarları
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  AI'ın hangi bölümlere müdahale etmesini istediğinizi seçin:
                </Typography>
                <FormControl component="fieldset">
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.about}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, about: e.target.checked }))}
                        />
                      }
                      label="Hakkımda bölümü"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.workExperience}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, workExperience: e.target.checked }))}
                        />
                      }
                      label="İş Deneyimi bölümü"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.skills}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, skills: e.target.checked }))}
                        />
                      }
                      label="Beceriler bölümü"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.languages}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, languages: e.target.checked }))}
                        />
                      }
                      label="Diller bölümü"
                    />
                  </FormGroup>
                </FormControl>
              </AccordionDetails>
            </Accordion>
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCompanyLinksSubmit}
                disabled={loading || companyLinks.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
              >
                {loading ? 'Analiz Ediliyor...' : 'Şirketleri Analiz Et'}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 4 }}>
            {companyInfo && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {companyInfo.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {companyInfo.description}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip label={companyInfo.industry} color="primary" size="small" />
                    {companyInfo.values.slice(0, 3).map((value, index) => (
                      <Chip key={index} label={value} variant="outlined" size="small" />
                    ))}
                  </Stack>
                  
                  {/* Analyzed Links */}
                  {companyInfo.analyzedLinks && companyInfo.analyzedLinks.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Analiz Edilen Linkler:
                      </Typography>
                      <Stack spacing={1}>
                        {companyInfo.analyzedLinks.map((link, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {link.description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* AI Ayarları Özeti */}
            <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  AI Uyarlama Ayarları
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Aşağıdaki bölümler AI tarafından şirket bilgilerine göre uyarlanacak:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {aiSettings.about && <Chip label="Hakkımda" color="success" size="small" />}
                  {aiSettings.workExperience && <Chip label="İş Deneyimi" color="success" size="small" />}
                  {aiSettings.skills && <Chip label="Beceriler" color="success" size="small" />}
                  {aiSettings.languages && <Chip label="Diller" color="success" size="small" />}
                  {!aiSettings.about && !aiSettings.workExperience && !aiSettings.skills && !aiSettings.languages && (
                    <Chip label="Hiçbir bölüm uyarlanmayacak" color="warning" size="small" />
                  )}
                </Stack>
              </CardContent>
            </Card>
            
            <Box sx={{ textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                CV Analizi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                CV'niz şirket bilgilerine göre analiz edilecek ve seçili bölümler uyarlanacak
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyzeCV}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {loading ? 'Analiz Ediliyor...' : 'CV\'yi Analiz Et'}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            {analysisResult && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Analiz Sonuçları
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Uyum Skoru: {analysisResult.matchScore}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={analysisResult.matchScore} 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Öneriler:</strong>
                  </Typography>
                  <Stack spacing={1}>
                    {analysisResult.recommendations.map((rec, index) => (
                      <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                        • {rec}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
            
            
            {editableCVData && (
              <CompanyBasedCVPreview 
                data={editableCVData} 
                isEditing={isEditing}
                cvLanguage={cvLanguage}
                onUpdateField={handleUpdateField}
                onUpdateWorkExperience={handleUpdateWorkExperience}
                onUpdateWorkExperienceBullet={handleUpdateWorkExperienceBullet}
                onAddWorkExperienceBullet={handleAddWorkExperienceBullet}
                onRemoveWorkExperienceBullet={handleRemoveWorkExperienceBullet}
                onStartEditing={handleStartEditing}
                onCancelEditing={handleCancelEditing}
                onSaveEditing={handleSaveEditing}
                onTranslateToEnglish={handleTranslateToEnglish}
              />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Şirket Odaklı CV Editörü
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        CV'nizi hedef şirkete göre optimize edin
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
      </Paper>
    </Box>
  );
}