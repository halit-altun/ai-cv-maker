'use client';

import React from 'react';
import { Box, TextField, Typography, Paper } from '@mui/material';

interface AboutProps {
  data: string;
  onChange: (value: string) => void;
}

const About: React.FC<AboutProps> = ({ data, onChange }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Hakkımda
      </Typography>
      
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
    </Paper>
  );
};

export default About;

