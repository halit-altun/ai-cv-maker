'use client';

import { useRef, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ProfilePhotoCropDialog } from './ProfilePhotoCropDialog';
import { deleteProfilePhotoRequest, uploadProfilePhotoRequest } from '@/lib/auth/api';
import type { AuthUser } from '@/lib/auth/types';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type Props = {
  photoUrl?: string;
  onUpdated: (user: AuthUser) => void;
};

export function ProfilePhotoUploader({ photoUrl, onUpdated }: Props) {
  const { colors } = dashboardTokens;
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Sadece görsel dosyası seçin.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Görsel max 8MB olmalı.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result || ''));
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropped = async (dataUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await uploadProfilePhotoRequest(dataUrl);
      onUpdated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await deleteProfilePhotoRequest();
      onUpdated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${colors.outlineVariant}`,
        bgcolor: colors.surfaceContainerLowest,
      }}
    >
      <Typography fontWeight={700} sx={{ mb: 1.5 }}>
        Profil fotoğrafı
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Hesap başına tek görsel. Yeni yüklemede eski Cloudinary görseli silinir. CV Maker / Company
        Based’te “CV’ye resim ekle” açıksa bu fotoğraf kullanılır.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          src={photoUrl || undefined}
          sx={{ width: 88, height: 88, bgcolor: colors.surfaceContainerHigh }}
        >
          <PhotoCameraIcon />
        </Avatar>
        <Stack spacing={1}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PhotoCameraIcon />}
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            {photoUrl ? 'Değiştir / Kırp' : 'Fotoğraf yükle'}
          </Button>
          {photoUrl && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              disabled={loading}
              onClick={() => void handleDelete()}
              sx={{ textTransform: 'none' }}
            >
              Sil
            </Button>
          )}
        </Stack>
      </Stack>
      {error && (
        <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {cropSrc && (
        <ProfilePhotoCropDialog
          open={cropOpen}
          imageSrc={cropSrc}
          onClose={() => {
            setCropOpen(false);
            setCropSrc(null);
          }}
          onCropped={(dataUrl) => void handleCropped(dataUrl)}
        />
      )}
    </Box>
  );
}
