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
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import CompanyBasedCVPreview from '@/components/company-based-cv-editor/CompanyBasedCVPreview';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import { CompanyBasedCVData, CompanyInfo, CVAnalysisResponse } from '@/lib/company-based-cv-editor/types';

const steps = [
  'CV Yükle',
  'Şirket URL Gir',
  'Analiz Et',
  'Önizleme'
];

export default function CompanyBasedCVEditor() {
  const [activeStep, setActiveStep] = useState(0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [cvData, setCvData] = useState<CompanyBasedCVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCompanyUrlSubmit = async () => {
    if (!companyUrl.trim()) {
      setError('Lütfen geçerli bir şirket URL\'si girin.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const company = await CompanyBasedCVService.analyzeCompany(companyUrl);
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
        companyUrl,
        companyInfo
      });

      setAnalysisResult(analysis);

      // AI ile parse edilen gerçek CV verilerini kullanarak analiz sonuçlarına göre CV data oluştur
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
        about: analysis.updatedAbout, // AI tarafından uyarlanmış hakkımda
        workExperience: parsedCVData.workExperience || [],
        education: parsedCVData.education || [],
        skills: parsedCVData.skills || [],
        languages: parsedCVData.languages || [],
        companyInfo,
        analysisResult: analysis
      };

      setCvData(adaptedCVData);
      setActiveStep(3);
    } catch (err) {
      setError('CV analiz edilirken bir hata oluştu.');
      console.error('CV analysis error:', err);
    } finally {
      setLoading(false);
    }
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
                Şirket Web Sitesi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hedef şirketin web sitesi URL'sini girin
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Şirket Web Sitesi URL'si"
              placeholder="https://example.com"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCompanyUrlSubmit}
                disabled={loading || !companyUrl.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
              >
                {loading ? 'Analiz Ediliyor...' : 'Şirketi Analiz Et'}
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
                </CardContent>
              </Card>
            )}
            <Box sx={{ textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                CV Analizi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                CV'niz şirket bilgilerine göre analiz edilecek ve uyarlanacak
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
            {cvData && <CompanyBasedCVPreview data={cvData} />}
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