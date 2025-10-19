'use client';

import React from 'react';
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
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface SkillsProps {
  data: string[];
  onChange: (skills: string[]) => void;
}

const Skills: React.FC<SkillsProps> = ({ data, onChange }) => {
  const [currentSkill, setCurrentSkill] = React.useState('');

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

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Beceriler
      </Typography>

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
    </Paper>
  );
};

export default Skills;

