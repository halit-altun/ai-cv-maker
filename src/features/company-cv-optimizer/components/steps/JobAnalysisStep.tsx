'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LinkIcon from '@mui/icons-material/Link';
import type { CompanyCvOptimizerState } from '../../types';
import { GlassCard } from '../shell/GlassCard';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type JobAnalysisStepProps = Pick<
  CompanyCvOptimizerState,
  | 'cvFile'
  | 'setActiveStep'
  | 'companyLinks'
  | 'addCompanyLink'
  | 'removeCompanyLink'
  | 'updateCompanyLink'
  | 'cvAdaptationSource'
  | 'setCvAdaptationSource'
  | 'shouldGenerateCoverLetter'
  | 'setShouldGenerateCoverLetter'
  | 'shouldGenerateLinkedInMessage'
  | 'setShouldGenerateLinkedInMessage'
  | 'coverLetterSource'
  | 'setCoverLetterSource'
  | 'linkedinMessageSource'
  | 'setLinkedinMessageSource'
  | 'targetPosition'
  | 'setTargetPosition'
  | 'coverLetterRecipientName'
  | 'setCoverLetterRecipientName'
  | 'coverLetterCompanyName'
  | 'setCoverLetterCompanyName'
  | 'manualMustMentionTopicsText'
  | 'setManualMustMentionTopicsText'
  | 'manualMustNotMentionTopicsText'
  | 'setManualMustNotMentionTopicsText'
  | 'jobDescriptionText'
  | 'setJobDescriptionText'
  | 'aiSettings'
  | 'setAiSettings'
  | 'loading'
  | 'handleCompanyLinksSubmit'
>;

export function JobAnalysisStep(props: JobAnalysisStepProps) {
  const { colors, fonts } = dashboardTokens;
  const [sourceTab, setSourceTab] = useState<'site' | 'job'>('site');

  const needsJobText =
    props.cvAdaptationSource === 'text' ||
    (props.shouldGenerateCoverLetter && props.coverLetterSource === 'text') ||
    (!props.shouldGenerateCoverLetter &&
      props.shouldGenerateLinkedInMessage &&
      props.linkedinMessageSource === 'text');

  const targetAreaLabels = [
    { key: 'about' as const, label: 'Hakkımda' },
    { key: 'workExperience' as const, label: 'Deneyim' },
    { key: 'skills' as const, label: 'Beceriler' },
  ];

  const activeAreas = targetAreaLabels.filter((a) => props.aiSettings[a.key]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <GlassCard sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <GpsFixedIcon sx={{ color: colors.secondary }} />
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.25rem', fontWeight: 600 }}>
              Hedef Kaynağı Seçimi
            </Typography>
          </Box>

          {props.cvFile && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ bgcolor: colors.surfaceContainerLow, px: 1.5, py: 0.5, borderRadius: 1 }}>
                {props.cvFile.name}
              </Typography>
              <Button size="small" onClick={() => props.setActiveStep(0)} sx={{ textTransform: 'none' }}>
                CV değiştir
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', p: 0.5, bgcolor: colors.surfaceContainerLow, borderRadius: 2, mb: 3 }}>
            <Button
              fullWidth
              onClick={() => setSourceTab('site')}
              sx={{
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor: sourceTab === 'site' ? colors.surfaceContainerLowest : 'transparent',
                color: sourceTab === 'site' ? colors.secondary : colors.onSurfaceVariant,
                boxShadow: sourceTab === 'site' ? 1 : 0,
              }}
            >
              Şirket Web Sitesi
            </Button>
            <Button
              fullWidth
              onClick={() => setSourceTab('job')}
              sx={{
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor: sourceTab === 'job' ? colors.surfaceContainerLowest : 'transparent',
                color: sourceTab === 'job' ? colors.secondary : colors.onSurfaceVariant,
                boxShadow: sourceTab === 'job' ? 1 : 0,
              }}
            >
              İlan Metni
            </Button>
          </Box>

          {sourceTab === 'site' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {props.companyLinks.map((link, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography fontWeight={600}>Link {index + 1}</Typography>
                    {props.companyLinks.length > 1 && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => props.removeCompanyLink(index)}
                        sx={{ textTransform: 'none' }}
                      >
                        Kaldır
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="URL"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => props.updateCompanyLink(index, 'url', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                    />
                    <TextField
                      fullWidth
                      label="Açıklama (en az 5 karakter)"
                      placeholder="Bu sayfanın ne hakkında olduğunu açıklayın"
                      value={link.description}
                      onChange={(e) => props.updateCompanyLink(index, 'description', e.target.value)}
                      helperText={`${link.description.length}/5 karakter`}
                      error={link.description.length > 0 && link.description.length < 5}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                    />
                  </Box>
                </Box>
              ))}

              {props.companyLinks.length < 3 && (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={props.addCompanyLink}
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                  Link Ekle ({props.companyLinks.length}/3)
                </Button>
              )}
            </Box>
          )}

          {sourceTab === 'job' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="İş Başlığı / Hedef Pozisyon"
                  placeholder="Senior Product Designer"
                  value={props.targetPosition}
                  onChange={(e) => props.setTargetPosition(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
                <TextField
                  fullWidth
                  label="Firma Adı (opsiyonel)"
                  placeholder="Innova Tech"
                  value={props.coverLetterCompanyName}
                  onChange={(e) => props.setCoverLetterCompanyName(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
              </Box>
              <TextField
                fullWidth
                label="İşe Alım Müdürü (Opsiyonel)"
                placeholder="Ad Soyad"
                value={props.coverLetterRecipientName}
                onChange={(e) => props.setCoverLetterRecipientName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
              />
              <TextField
                fullWidth
                label="Job Description (JD)"
                placeholder="İlan detaylarını buraya yapıştırın..."
                value={props.jobDescriptionText}
                onChange={(e) => props.setJobDescriptionText(e.target.value)}
                multiline
                rows={6}
                maxRows={6}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: colors.surfaceContainerLow,
                    alignItems: 'flex-start',
                  },
                  '& textarea': {
                    overflowY: 'auto !important',
                    resize: 'none',
                  },
                }}
              />
            </Box>
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Hedef Kaynağı — Detaylı Seçim
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: colors.onSurfaceVariant, mb: 2 }}>
            CV düzenleme, cover letter ve isteğe bağlı LinkedIn mesajı için kaynak seçin.
          </Typography>

          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>CV Düzenleme</Typography>
          <RadioGroup
            row
            value={props.cvAdaptationSource}
            onChange={(e) =>
              props.setCvAdaptationSource(e.target.value as 'company' | 'text')
            }
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
            <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
          </RadioGroup>

          <FormControlLabel
            control={
              <Checkbox
                checked={props.shouldGenerateCoverLetter}
                onChange={(e) => props.setShouldGenerateCoverLetter(e.target.checked)}
              />
            }
            label="Kapak Mektubu Üret"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4, mb: 1 }}>
            Bu işe özel kişiselleştirilmiş kapak mektubu.
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={props.shouldGenerateLinkedInMessage}
                onChange={(e) => props.setShouldGenerateLinkedInMessage(e.target.checked)}
              />
            }
            label="LinkedIn Mesajı Üret"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4, mb: 2 }}>
            İşe alım müdürü için ağ oluşturma metni.
          </Typography>

          {props.shouldGenerateCoverLetter && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                Cover Letter Kaynağı
              </Typography>
              <RadioGroup
                row
                value={props.coverLetterSource}
                onChange={(e) =>
                  props.setCoverLetterSource(e.target.value as 'company' | 'text')
                }
              >
                <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
              </RadioGroup>
            </Box>
          )}

          {!props.shouldGenerateCoverLetter && props.shouldGenerateLinkedInMessage && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                LinkedIn mesajı kaynağı
              </Typography>
              <RadioGroup
                row
                value={props.linkedinMessageSource}
                onChange={(e) =>
                  props.setLinkedinMessageSource(e.target.value as 'company' | 'text')
                }
              >
                <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
              </RadioGroup>
            </Box>
          )}

          {needsJobText && sourceTab === 'site' && (
            <TextField
              fullWidth
              label="Job Description / İlan Metni"
              placeholder="About the job ... (metni buraya yapıştırın)"
              value={props.jobDescriptionText}
              onChange={(e) => props.setJobDescriptionText(e.target.value)}
              multiline
              rows={6}
              maxRows={6}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: colors.surfaceContainerLow,
                  alignItems: 'flex-start',
                },
                '& textarea': {
                  overflowY: 'auto !important',
                  resize: 'none',
                },
              }}
            />
          )}
        </GlassCard>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: colors.surfaceContainerLowest,
            border: '1px solid transparent',
            backgroundImage: `linear-gradient(${colors.surfaceContainerLowest}, ${colors.surfaceContainerLowest}), linear-gradient(to right, ${colors.secondary}, #9466ff)`,
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <AutoAwesomeIcon sx={{ color: colors.secondary }} />
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.25rem', fontWeight: 600 }}>
              AI Uyarlama Ayarları
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.about}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({ ...prev, about: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Hakkımda bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI bu bölümü hedef şirkete göre uyarlar.
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                border: '1px solid transparent',
                width: '100%',
                alignItems: 'flex-start',
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.workExperience}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({
                      ...prev,
                      workExperience: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>İş Deneyimi bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bullet point&apos;ler hedef role göre optimize edilir.
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                width: '100%',
                alignItems: 'flex-start',
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.skills}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({ ...prev, skills: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Beceriler bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Anahtar beceriler ilana göre vurgulanır.
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                width: '100%',
                alignItems: 'flex-start',
              }}
            />

            <TextField
              fullWidth
              label="Vurgulanacak Noktalar"
              placeholder="Örn: 5+ yıl liderlik deneyimi, Figma uzmanlığı"
              value={props.manualMustMentionTopicsText}
              onChange={(e) => props.setManualMustMentionTopicsText(e.target.value)}
              helperText="Doğrudan cümle/paragraf yazabilirsiniz. AI bu metni dikkate alır."
              multiline
              minRows={2}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
            />

            <TextField
              fullWidth
              label="Müdahale Edilmeyecek Alanlar"
              placeholder="Örn: Mezuniyet yılı, eski staj bilgileri"
              value={props.manualMustNotMentionTopicsText}
              onChange={(e) => props.setManualMustNotMentionTopicsText(e.target.value)}
              helperText="AI bu metni çıktıda geçirmez."
              multiline
              minRows={2}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
            />

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                AI&apos;nın Müdahale Edeceği Alanlar
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {activeAreas.map((area) => (
                  <Box
                    key={area.key}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: colors.secondaryFixed,
                      color: colors.secondary,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {area.label}
                    <IconButton
                      size="small"
                      onClick={() =>
                        props.setAiSettings((prev) => ({ ...prev, [area.key]: false }))
                      }
                      sx={{ p: 0, color: 'inherit' }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
                {targetAreaLabels
                  .filter((a) => !props.aiSettings[a.key])
                  .map((area) => (
                    <Button
                      key={area.key}
                      size="small"
                      onClick={() =>
                        props.setAiSettings((prev) => ({ ...prev, [area.key]: true }))
                      }
                      sx={{
                        borderRadius: 999,
                        border: `1px dashed ${colors.outlineVariant}`,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      + {area.label}
                    </Button>
                  ))}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => void props.handleCompanyLinksSubmit()}
            disabled={props.loading}
            endIcon={props.loading ? <CircularProgress size={20} color="inherit" /> : <BoltIcon />}
            sx={{
              height: 56,
              borderRadius: 3,
              bgcolor: colors.primary,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 3,
            }}
          >
            {props.loading ? 'Analiz Ediliyor...' : 'Analizi Başlat'}
          </Button>
          <Typography
            sx={{ textAlign: 'center', fontSize: '0.75rem', color: colors.onSurfaceVariant, mt: 2 }}
          >
            AI işlem süresi yaklaşık 10-15 saniye sürebilir.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
