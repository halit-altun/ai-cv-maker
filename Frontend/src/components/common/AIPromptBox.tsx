'use client';

import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Stack
} from '@mui/material';
import { Close as CloseIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

interface AIPromptBoxProps {
  open: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  onGenerate: (prompt: string) => Promise<string>;
  onSave: (result: string) => void;
  type: 'about' | 'work-experience' | 'skills';
  workExperienceData?: any[];
  aboutData?: string;
}

const AIPromptBox: React.FC<AIPromptBoxProps> = ({
  open,
  onClose,
  title,
  placeholder,
  onGenerate,
  onSave,
  type,
  workExperienceData = [],
  aboutData = ''
}) => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    // Beceriler için prompt kontrolü yapma
    if (!shouldAutoGenerate && !prompt.trim()) {
      setError('Lütfen bir prompt girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Beceriler için boş prompt gönder, diğerleri için gerçek prompt
      const promptToSend = shouldAutoGenerate ? '' : prompt;
      const generatedResult = await onGenerate(promptToSend);
      setResult(generatedResult);
    } catch (err) {
      setError('AI işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (result.trim()) {
      onSave(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setResult('');
    setError('');
    onClose();
  };

  const handleRegenerate = async () => {
    // Beceriler için prompt kontrolü yapma, diğerleri için prompt gerekli
    if (shouldAutoGenerate || prompt.trim()) {
      await handleGenerate();
    }
  };

  const getPromptPlaceholder = () => {
    switch (type) {
      case 'about':
        return 'Örn: 3 yıllık frontend developer deneyimi, React ve Next.js uzmanı, ekip çalışmasına yatkın, yazılım geliştirme alanında kariyer yapmak istiyorum...';
      case 'work-experience':
        return 'Örn: E-ticaret projesi geliştirdim, Next.js kullandım, müşteri memnuniyetini artırdım, takım liderliği yaptım...';
      case 'skills':
        return 'Bu alan otomatik olarak iş deneyimlerinizden üretilecektir.';
      default:
        return placeholder;
    }
  };

  const isSkillsType = type === 'skills';
  const hasWorkExperience = workExperienceData && workExperienceData.length > 0;
  const hasBulletPoints = workExperienceData.some(exp => 
    exp.bulletPoints && exp.bulletPoints.some((bp: string) => bp.trim())
  );

  // Beceriler için otomatik üretim kontrolü
  const shouldAutoGenerate = isSkillsType && hasBulletPoints;
  
  // Hakkımda bilgisi kontrolü
  const hasAboutData = aboutData && aboutData.trim().length > 0;
  
  // Debug log'ları
  console.log('=== AIPromptBox Debug ===');
  console.log('Type:', type);
  console.log('About data:', aboutData);
  console.log('Has about data:', hasAboutData);
  console.log('Work experience data:', workExperienceData);
  console.log('Has bullet points:', hasBulletPoints);
  console.log('Should auto generate:', shouldAutoGenerate);
  console.log('========================');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {isSkillsType && !hasBulletPoints && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Beceriler otomatik olarak üretmek için önce iş deneyimlerinizde "Sorumluluklar ve Başarılar" 
              kısmına içerik eklemeniz gerekiyor.
            </Alert>
          )}

          {!shouldAutoGenerate && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Lütfen aşağıdaki alana deneyimlerinizi, yeteneklerinizi ve hedeflerinizi yazın:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder={getPromptPlaceholder()}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                variant="outlined"
                disabled={loading}
              />
            </Box>
          )}

          {shouldAutoGenerate && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Beceriler, iş deneyimlerinizdeki "Sorumluluklar ve Başarılar" kısmından otomatik olarak üretilecektir.
              </Typography>
            </Box>
          )}

          {/* Hakkımda bilgisi uyarısı */}
          {!hasAboutData && (type === 'work-experience' || type === 'about') && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Bilgi:</strong> Hakkımda kısmı boş olduğu için AI sonucu tam olmayabilir. 
                Daha iyi sonuçlar için önce Hakkımda kısmını doldurmanızı öneririz.
              </Typography>
            </Alert>
          )}

          {result && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                AI Tarafından Üretilen İçerik:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }
                }}
              />
            </Box>
          )}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>AI içerik üretiyor...</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        
        {!result && !loading && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={(!shouldAutoGenerate && !prompt.trim()) || (isSkillsType && !hasBulletPoints)}
            startIcon={<AutoAwesomeIcon />}
          >
            Üret
          </Button>
        )}

        {result && !loading && (
          <>
            <Button
              variant="outlined"
              onClick={handleRegenerate}
              disabled={!shouldAutoGenerate && !prompt.trim()}
            >
              Yeniden Üret
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
            >
              Kaydet
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AIPromptBox;
