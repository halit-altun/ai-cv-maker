'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import AIPromptBox from '../common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';

interface SkillsProps {
  data: string[];
  onChange: (skills: string[]) => void;
  workExperienceData?: any[];
}

const Skills: React.FC<SkillsProps> = ({ data, onChange, workExperienceData = [] }) => {
  const [currentSkill, setCurrentSkill] = React.useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const addSkill = () => {
    if (currentSkill.trim()) {
      onChange([...data, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const removeSkill = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleAIGenerate = async (prompt: string): Promise<string> => {
    try {
      console.log('=== BECERİLER AI GENERATION ===');
      console.log('İş deneyimi verisi:', workExperienceData);
      console.log('Bullet point sayısı:', workExperienceData.flatMap(exp => exp.bulletPoints || []).length);
      console.log('Tüm bullet point\'ler:', workExperienceData.flatMap(exp => exp.bulletPoints || []));
      console.log('================================');
      
      // Beceriler için prompt'a ihtiyaç yok, direkt iş deneyiminden üret
      const skills = await CVMakerAIService.generateSkillsFromExperience(workExperienceData);
      return skills.join('\n');
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };

  const handleAISave = (result: string) => {
    const skills = result.split('\n').filter(skill => skill.trim());
    onChange(skills);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Beceriler
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

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          fullWidth
          label="Beceri Ekle"
          placeholder="Örn: React, Node.js, TypeScript..."
          value={currentSkill}
          onChange={(e) => setCurrentSkill(e.target.value)}
          onKeyPress={handleKeyPress}
          variant="outlined"
          size="small"
        />
        <Button
          variant="contained"
          onClick={addSkill}
          sx={{ minWidth: '100px' }}
          disabled={!currentSkill.trim()}
        >
          <AddIcon />
        </Button>
      </Box>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Henüz beceri eklenmedi. Yukarıdaki alandan becerilerinizi ekleyin.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          {data.map((skill, index) => (
            <Chip
              key={index}
              label={skill}
              onDelete={() => removeSkill(index)}
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.9rem' }}
            />
          ))}
        </Stack>
      )}

      <AIPromptBox
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        title="AI ile Beceriler Üret"
        placeholder="Beceriler iş deneyimlerinizden otomatik olarak üretilecektir..."
        onGenerate={handleAIGenerate}
        onSave={handleAISave}
        type="skills"
        workExperienceData={workExperienceData}
      />
    </Paper>
  );
};

export default Skills;

