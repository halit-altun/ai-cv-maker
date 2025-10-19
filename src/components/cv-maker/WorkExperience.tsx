'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Remove as RemoveIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import AIPromptBox from '../common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';

export interface WorkExperienceItem {
  id: string;
  position: string;
  company: string;
  startDate: string;
  endDate: string;
  country: string;
  city: string;
  bulletPoints: string[];
}

interface WorkExperienceProps {
  data: WorkExperienceItem[];
  onChange: (experiences: WorkExperienceItem[]) => void;
  aboutData?: string;
}

const WorkExperience: React.FC<WorkExperienceProps> = ({ data, onChange, aboutData = '' }) => {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  const addExperience = () => {
    const newExperience: WorkExperienceItem = {
      id: Date.now().toString(),
      position: '',
      company: '',
      startDate: '',
      endDate: '',
      country: '',
      city: '',
      bulletPoints: ['']
    };
    onChange([...data, newExperience]);
  };

  const removeExperience = (id: string) => {
    onChange(data.filter(exp => exp.id !== id));
  };

  const updateExperience = (id: string, field: keyof WorkExperienceItem, value: any) => {
    onChange(
      data.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    );
  };

  const addBulletPoint = (id: string) => {
    onChange(
      data.map(exp =>
        exp.id === id
          ? { ...exp, bulletPoints: [...exp.bulletPoints, ''] }
          : exp
      )
    );
  };

  const removeBulletPoint = (id: string, index: number) => {
    onChange(
      data.map(exp =>
        exp.id === id
          ? { ...exp, bulletPoints: exp.bulletPoints.filter((_, i) => i !== index) }
          : exp
      )
    );
  };

  const updateBulletPoint = (id: string, index: number, value: string) => {
    onChange(
      data.map(exp =>
        exp.id === id
          ? {
              ...exp,
              bulletPoints: exp.bulletPoints.map((bp, i) => (i === index ? value : bp))
            }
          : exp
      )
    );
  };

  const handleAIGenerate = async (prompt: string): Promise<string> => {
    try {
      console.log('=== İŞ DENEYİMİ AI GENERATION ===');
      console.log('Orijinal prompt:', prompt);
      console.log('Hakkımda bilgisi:', aboutData);
      console.log('Hakkımda bilgisi var mı:', !!aboutData.trim());
      
      // Hakkımda bilgisini de prompt'a ekle
      const enhancedPrompt = aboutData.trim() 
        ? `${prompt}\n\nHakkımda bilgileri: ${aboutData}`
        : prompt;
      
      console.log('Enhanced prompt:', enhancedPrompt);
      console.log('===============================');
      
      const bullets = await CVMakerAIService.generateWorkExperienceBullets(enhancedPrompt);
      return bullets.join('\n');
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };

  const handleAISave = (result: string) => {
    if (selectedExperienceId) {
      const bullets = result.split('\n').filter(bp => bp.trim());
      updateExperience(selectedExperienceId, 'bulletPoints', bullets);
    }
  };

  const openAIDialog = (experienceId: string) => {
    setSelectedExperienceId(experienceId);
    setAiDialogOpen(true);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          İş Deneyimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addExperience}
          size="small"
        >
          Deneyim Ekle
        </Button>
      </Box>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Henüz iş deneyimi eklenmedi. Eklemek için yukarıdaki butona tıklayın.
        </Typography>
      ) : (
        data.map((experience, expIndex) => (
          <Box key={experience.id} sx={{ mb: 3 }}>
            {expIndex > 0 && <Divider sx={{ mb: 3 }} />}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Deneyim {expIndex + 1}
              </Typography>
              <IconButton
                onClick={() => removeExperience(experience.id)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>

            <Box>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Pozisyon"
                  placeholder="Örn: Senior Frontend Developer"
                  value={experience.position}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'position', e.target.value)}
                  variant="outlined"
                  required
                />

                <TextField
                  fullWidth
                  label="Firma Adı"
                  placeholder="Örn: Microsoft, Google"
                  value={experience.company}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'company', e.target.value)}
                  variant="outlined"
                  required
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Başlangıç Tarihi"
                    type="month"
                    value={experience.startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'startDate', e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Bitiş Tarihi"
                    type="month"
                    value={experience.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'endDate', e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    placeholder="Halen devam ediyorsa boş bırakın"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Ülke"
                    value={experience.country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'country', e.target.value)}
                    variant="outlined"
                  />

                  <TextField
                    fullWidth
                    label="Şehir"
                    value={experience.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(experience.id, 'city', e.target.value)}
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Sorumluluklar ve Başarılar
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => openAIDialog(experience.id)}
                        sx={{ 
                          color: '#1976d2',
                          borderColor: '#1976d2',
                          '&:hover': {
                            backgroundColor: '#1976d2',
                            color: 'white'
                          }
                        }}
                      >
                        AI ile Üret
                      </Button>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addBulletPoint(experience.id)}
                      >
                        Madde Ekle
                      </Button>
                    </Box>
                  </Box>

                  {experience.bulletPoints.map((bullet, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField
                        fullWidth
                        placeholder={`Madde ${index + 1}`}
                        value={bullet}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBulletPoint(experience.id, index, e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      {experience.bulletPoints.length > 1 && (
                        <IconButton
                          onClick={() => removeBulletPoint(experience.id, index)}
                          color="error"
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Box>
          </Box>
        ))
      )}

      <AIPromptBox
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        title="AI ile Sorumluluklar ve Başarılar Üret"
        placeholder="Deneyimlerinizi, yaptığınız işleri ve başarılarınızı yazın..."
        onGenerate={handleAIGenerate}
        onSave={handleAISave}
        type="work-experience"
        workExperienceData={data}
        aboutData={aboutData}
      />
    </Paper>
  );
};

export default WorkExperience;

