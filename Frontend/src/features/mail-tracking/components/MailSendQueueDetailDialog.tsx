'use client';

import { useMemo, type ComponentProps } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DeliverabilityScore } from '@/features/company-cv-optimizer/components/DeliverabilityScore';
import {
  buildKeywordStatusList,
  formatIntegratedInLabel,
} from '@/lib/company-based-cv-editor/keywordStatus';
import type {
  SendQueueAnalysisDetail,
  SendQueueItem,
} from '@/lib/mail-tracking/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type Props = {
  open: boolean;
  loading: boolean;
  analysis: SendQueueAnalysisDetail | null;
  relatedQueueItems: SendQueueItem[];
  onClose: () => void;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DiffBlock({
  title,
  original,
  updated,
}: {
  title: string;
  original?: string;
  updated?: string;
}) {
  const { colors } = dashboardTokens;
  if (!original && !updated) return null;
  return (
    <Box>
      <Typography fontWeight={600} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {original ? (
        <>
          <Typography variant="caption" color="text.secondary">
            Önce
          </Typography>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', mb: 1, color: colors.onSurfaceVariant }}
          >
            {original}
          </Typography>
        </>
      ) : null}
      {updated ? (
        <>
          <Typography variant="caption" color="text.secondary">
            Sonra
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {updated}
          </Typography>
        </>
      ) : null}
    </Box>
  );
}

export function MailSendQueueDetailDialog({
  open,
  loading,
  analysis,
  relatedQueueItems,
  onClose,
}: Props) {
  const { colors } = dashboardTokens;
  const snap = analysis?.analysisSnapshot;
  const keywordStatusList = useMemo(
    () =>
      buildKeywordStatusList({
        companyKeywords: snap?.extractedKeywords,
        candidateKeywords: snap?.candidateKeywords,
        detectedKeywords: snap?.detectedKeywords,
        report: snap?.keywordIntegrationReport,
      }),
    [snap]
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography fontWeight={700}>
            {analysis?.companyName || 'Gönderim detayı'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Analizden gönderime kadar süreç özeti
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Kapat">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !analysis && relatedQueueItems.length === 0 ? (
          <Typography>Detay bulunamadı.</Typography>
        ) : (
          <Stack spacing={2.5}>
            {analysis?.companyUrl ? (
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {analysis.companyUrl}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {analysis?.itemStatus ? (
                <Chip size="small" label={`Job: ${analysis.itemStatus}`} />
              ) : null}
              {snap?.matchScore != null ? (
                <Chip size="small" color="info" label={`Eşleşme: ${snap.matchScore}`} />
              ) : null}
              {snap?.targetPosition ? (
                <Chip size="small" variant="outlined" label={snap.targetPosition} />
              ) : null}
              {analysis?.cvFileName ? (
                <Chip size="small" variant="outlined" label={`CV: ${analysis.cvFileName}`} />
              ) : null}
            </Stack>

            <DeliverabilityScore
              data={
                snap?.deliverabilityScore &&
                typeof snap.deliverabilityScore === 'object' &&
                (snap.deliverabilityScore as { ok?: boolean }).ok
                  ? (snap.deliverabilityScore as unknown as ComponentProps<
                      typeof DeliverabilityScore
                    >['data'])
                  : null
              }
              loading={false}
            />

            {keywordStatusList.length > 0 && (
              <Box>
                <Typography fontWeight={600} sx={{ mb: 1 }}>
                  Anahtar kelime entegrasyonu
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>KW</TableCell>
                      <TableCell>Nereye</TableCell>
                      <TableCell>Not</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keywordStatusList.map((row) => (
                      <TableRow key={row.keyword}>
                        <TableCell>
                          <strong>{row.keyword}</strong>
                        </TableCell>
                        <TableCell>{formatIntegratedInLabel(row.integratedIn)}</TableCell>
                        <TableCell>{row.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {(analysis?.adaptationNotes || snap?.recommendations?.length) && (
              <Box>
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  Neler değişti / uyarlandı
                </Typography>
                {analysis?.adaptationNotes ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                    {analysis.adaptationNotes}
                  </Typography>
                ) : null}
                {snap?.recommendations?.map((rec) => (
                  <Typography key={rec} variant="body2" sx={{ color: colors.onSurfaceVariant }}>
                    • {rec}
                  </Typography>
                ))}
              </Box>
            )}

            <DiffBlock title="Hakkımda" original={snap?.originalAbout} updated={snap?.updatedAbout} />
            <DiffBlock
              title="Deneyim"
              original={snap?.originalExperience}
              updated={snap?.updatedExperience}
            />
            <DiffBlock title="Yetenekler" original={snap?.originalSkills} updated={snap?.updatedSkills} />

            {snap?.coverLetter ? (
              <Box>
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  Ön yazı
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {snap.coverLetter}
                </Typography>
              </Box>
            ) : null}

            {analysis?.coldEmailBody ? (
              <Box>
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  Cold mail
                </Typography>
                <Typography fontWeight={600} variant="body2" sx={{ mb: 1 }}>
                  {analysis.coldEmailSubject || '—'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {analysis.coldEmailBody}
                </Typography>
              </Box>
            ) : null}

            {analysis?.linkedinMessage ? (
              <Box>
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  LinkedIn mesajı
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {analysis.linkedinMessage}
                </Typography>
              </Box>
            ) : null}

            <Box>
              <Typography fontWeight={600} sx={{ mb: 1 }}>
                Mail sırası
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Alıcı</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Durum</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(relatedQueueItems.length
                    ? relatedQueueItems
                    : (analysis?.selectedRecipients || []).map((email) => ({
                        id: email,
                        recipient: email,
                        status: 'pending',
                        scheduledAt: null,
                      }))
                  ).map((row) => (
                    <TableRow key={row.id || row.recipient}>
                      <TableCell>{row.recipient}</TableCell>
                      <TableCell>{formatDateTime(row.scheduledAt)}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
