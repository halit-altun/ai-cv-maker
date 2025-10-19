'use client';

import React from 'react';
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
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export interface EducationItem {
  id: string;
  university: string;
  department: string;
  startDate: string;
  endDate: string;
}

interface EducationProps {
  data: EducationItem[];
  onChange: (education: EducationItem[]) => void;
}

const Education: React.FC<EducationProps> = ({ data, onChange }) => {
  const addEducation = () => {
    const newEducation: EducationItem = {
      id: Date.now().toString(),
      university: '',
      department: '',
      startDate: '',
      endDate: ''
    };
    onChange([...data, newEducation]);
  };

  const removeEducation = (id: string) => {
    onChange(data.filter(edu => edu.id !== id));
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    onChange(
      data.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Eğitim
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addEducation}
          size="small"
        >
          Eğitim Ekle
        </Button>
      </Box>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Henüz eğitim bilgisi eklenmedi. Eklemek için yukarıdaki butona tıklayın.
        </Typography>
      ) : (
        data.map((education, index) => (
          <Box key={education.id} sx={{ mb: 3 }}>
            {index > 0 && <Divider sx={{ mb: 3 }} />}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Eğitim {index + 1}
              </Typography>
              <IconButton
                onClick={() => removeEducation(education.id)}
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
                  label="Üniversite Adı"
                  placeholder="Örn: İstanbul Teknik Üniversitesi"
                  value={education.university}
                  onChange={(e) => updateEducation(education.id, 'university', e.target.value)}
                  variant="outlined"
                  required
                />

                <TextField
                  fullWidth
                  label="Bölüm"
                  placeholder="Örn: Bilgisayar Mühendisliği"
                  value={education.department}
                  onChange={(e) => updateEducation(education.id, 'department', e.target.value)}
                  variant="outlined"
                  required
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Başlangıç Tarihi"
                    type="month"
                    value={education.startDate}
                    onChange={(e) => updateEducation(education.id, 'startDate', e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Bitiş Tarihi"
                    type="month"
                    value={education.endDate}
                    onChange={(e) => updateEducation(education.id, 'endDate', e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    placeholder="Halen devam ediyorsa boş bırakın"
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );
};

export default Education;

