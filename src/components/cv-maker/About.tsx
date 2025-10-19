'use client';

import React, { useState } from 'react';
import { Box, TextField, Typography, Paper, Button } from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import AIPromptBox from '../common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';

interface AboutProps {
  data: string;
  onChange: (value: string) => void;
}

const About: React.FC<AboutProps> = ({ data, onChange }) => {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const handleAIGenerate = async (prompt: string): Promise<string> => {
    try {
      console.log('=== HAKKIMDA AI GENERATION ===');
      console.log('Orijinal prompt:', prompt);
      console.log('Mevcut hakkımda bilgisi:', data);
      console.log('Hakkımda bilgisi var mı:', !!data.trim());
      console.log('==============================');
      
      return await CVMakerAIService.generateAboutSection(prompt);
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };

  const handleAISave = (result: string) => {
    onChange(result);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Hakkımda
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => setAiDialogOpen(true)}
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
      </Box>
      
      <TextField
        fullWidth
        multiline
        rows={6}
        label="Kendinizi tanıtın"
        placeholder="Profesyonel deneyimlerinizi, yeteneklerinizi ve kariyerinizi özetleyin..."
        value={data}
        onChange={(e) => onChange(e.target.value)}
        variant="outlined"
      />

      <AIPromptBox
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        title="AI ile Hakkımda Bölümü Üret"
        placeholder="Deneyimlerinizi, yeteneklerinizi ve hedeflerinizi yazın..."
        onGenerate={handleAIGenerate}
        onSave={handleAISave}
        type="about"
        aboutData={data}
      />
    </Paper>
  );
};

export default About;

