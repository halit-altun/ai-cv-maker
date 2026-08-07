'use client';

import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Stack
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export interface LanguageItem {
  id: string;
  language: string;
  level: string;
}

interface LanguagesProps {
  data: LanguageItem[];
  onChange: (languages: LanguageItem[]) => void;
}

const languageLevels = [
  { value: 'A1', label: 'A1 - Başlangıç' },
  { value: 'A2', label: 'A2 - Temel' },
  { value: 'B1', label: 'B1 - Orta' },
  { value: 'B2', label: 'B2 - Orta-İleri' },
  { value: 'C1', label: 'C1 - İleri' },
  { value: 'C2', label: 'C2 - Anadil Seviyesi' },
  { value: 'Ana Dil', label: 'Ana Dil' }
];

const Languages: React.FC<LanguagesProps> = ({ data, onChange }) => {
  const addLanguage = () => {
    const newLanguage: LanguageItem = {
      id: Date.now().toString(),
      language: '',
      level: 'B1'
    };
    onChange([...data, newLanguage]);
  };

  const removeLanguage = (id: string) => {
    onChange(data.filter(lang => lang.id !== id));
  };

  const updateLanguage = (id: string, field: keyof LanguageItem, value: string) => {
    onChange(
      data.map(lang =>
        lang.id === id ? { ...lang, [field]: value } : lang
      )
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Diller
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addLanguage}
          size="small"
        >
          Dil Ekle
        </Button>
      </Box>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Henüz dil eklenmedi. Eklemek için yukarıdaki butona tıklayın.
        </Typography>
      ) : (
        data.map((language, index) => (
          <Box key={language.id} sx={{ mb: 2 }}>
            {index > 0 && <Divider sx={{ mb: 2 }} />}
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  label="Dil"
                  placeholder="Örn: İngilizce, Almanca"
                  value={language.language}
                  onChange={(e) => updateLanguage(language.id, 'language', e.target.value)}
                  variant="outlined"
                  size="small"
                  required
                />
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Seviye</InputLabel>
                  <Select
                    value={language.level}
                    label="Seviye"
                    onChange={(e) => updateLanguage(language.id, 'level', e.target.value)}
                  >
                    {languageLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <IconButton
                onClick={() => removeLanguage(language.id)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );
};

export default Languages;

