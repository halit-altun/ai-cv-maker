'use client';

import React from 'react';
import { Box, TextField, Typography, Paper, Stack } from '@mui/material';

interface PersonalInfoProps {
  data: {
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
  onChange: (field: string, value: string) => void;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ data, onChange }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Kişisel Bilgiler
      </Typography>
      
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Ad"
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            variant="outlined"
            required
          />
          
          <TextField
            fullWidth
            label="Soyad"
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            variant="outlined"
            required
          />
        </Box>
        
        <TextField
          fullWidth
          label="Ünvan"
          placeholder="Örn: Full Stack Developer"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          variant="outlined"
          required
        />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Ülke"
            value={data.country}
            onChange={(e) => onChange('country', e.target.value)}
            variant="outlined"
          />
          
          <TextField
            fullWidth
            label="Şehir"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Telefon"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            variant="outlined"
            type="tel"
          />
          
          <TextField
            fullWidth
            label="E-posta"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            variant="outlined"
            type="email"
            required
          />
        </Box>
        
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Portfolyo Linki"
            placeholder="https://portfolio.com"
            value={data.portfolio}
            onChange={(e) => onChange('portfolio', e.target.value)}
            variant="outlined"
            type="url"
          />
          
          <TextField
            fullWidth
            label="GitHub Linki"
            placeholder="https://github.com/kullanici-adi"
            value={data.github}
            onChange={(e) => onChange('github', e.target.value)}
            variant="outlined"
            type="url"
          />

          <TextField
            fullWidth
            label="LinkedIn Linki"
            placeholder="https://linkedin.com/in/kullanici-adi"
            value={data.linkedin}
            onChange={(e) => onChange('linkedin', e.target.value)}
            variant="outlined"
            type="url"
          />
        </Stack>
      </Stack>
    </Paper>
  );
};

export default PersonalInfo;

