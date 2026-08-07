'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { TodoApplicationJob } from '@/lib/todo-applications/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { GlassCard } from '@/features/company-cv-optimizer/components/shell/GlassCard';
import { ListTablePagination, useListPagination } from '@/shared/list-pagination';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('tr-TR');
  } catch {
    return String(value);
  }
}

function jobStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Bekliyor';
    case 'running':
      return 'Çalışıyor';
    case 'paused':
      return 'Duraklatıldı';
    case 'completed':
      return 'Tamamlandı';
    case 'failed':
      return 'Başarısız';
    case 'cancelled':
      return 'İptal / kaldırıldı';
    default:
      return status;
  }
}

function itemStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Sırada';
    case 'fetching':
      return 'Sayfa çekiliyor';
    case 'analyzing':
      return 'AI analiz';
    case 'sending':
      return 'Mail gönderiliyor';
    case 'completed':
      return 'Tamam';
    case 'failed':
      return 'Hata';
    case 'skipped':
      return 'Atlandı';
    case 'cancelled':
      return 'Kaldırıldı';
    default:
      return status;
  }
}

function statusColor(
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed':
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'paused':
    case 'pending':
    case 'cancelled':
      return 'warning';
    case 'running':
    case 'fetching':
    case 'analyzing':
    case 'sending':
      return 'info';
    default:
      return 'default';
  }
}

interface TodoJobStatusPanelProps {
  job: TodoApplicationJob | null;
  loading?: boolean;
  onRefresh?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  title?: string;
  onOpenCompany?: (itemId: string) => void;
}

export function TodoJobStatusPanel({
  job,
  loading,
  onRefresh,
  onPause,
  onResume,
  onCancel,
  title = 'İş durumu',
  onOpenCompany,
}: TodoJobStatusPanelProps) {
  const { colors, fonts } = dashboardTokens;
  const jobItems = job?.items || [];
  const { pageItems, tablePaginationProps } = useListPagination(jobItems, [job?.id]);

  if (!job) {
    return (
      <GlassCard sx={{ p: 3 }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Henüz başlatılmış bir iş yok. Toplu başvuru ile başlatabilirsiniz.
        </Typography>
      </GlassCard>
    );
  }

  const progress = job.progress || {
    total: job.items?.length || 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    companiesMailed: 0,
    mailsSent: 0,
    mailsFailed: 0,
    mailsQueued: 0,
    mailsOpened: 0,
    uniqueOpenedRecipients: 0,
  };

  const companiesMailed =
    progress.companiesMailed ??
    (job.items || []).filter(
      (i) => (i.sentCount || 0) > 0 || (i.queuedCount || 0) > 0
    ).length;

  const doneCount =
    progress.completed + progress.failed + progress.skipped + progress.cancelled;
  const percent =
    progress.total > 0 ? Math.round((doneCount / progress.total) * 100) : 0;
  const isActive = job.status === 'pending' || job.status === 'running';
  const isPaused = job.status === 'paused';

  return (
    <GlassCard sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Job #{job.id.slice(-8)} ·{' '}
            {job.mode === 'analyze_only' ? 'Sadece analiz' : 'Analiz + mail'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={jobStatusLabel(job.status)}
            color={statusColor(job.status)}
          />
          {onRefresh && (
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
              sx={{ textTransform: 'none' }}
            >
              Yenile
            </Button>
          )}
          {isActive && onPause && (
            <Button
              size="small"
              startIcon={<PauseIcon />}
              onClick={onPause}
              sx={{ textTransform: 'none' }}
            >
              Duraklat
            </Button>
          )}
          {isPaused && onResume && (
            <Button
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={onResume}
              sx={{ textTransform: 'none' }}
            >
              Devam et
            </Button>
          )}
          {(isActive || isPaused) && onCancel && (
            <Button
              size="small"
              color="error"
              startIcon={<StopIcon />}
              onClick={onCancel}
              sx={{ textTransform: 'none' }}
            >
              Kaldır / İptal
            </Button>
          )}
        </Stack>
      </Box>

      {isPaused && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Duraklatıldı: Analizi başlamış firma tamamlanır; sıradaki firmaya geçilmez.
          <strong> Devam et</strong> ile sıradakilerden devam edilir.
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption">
            İlerleme: {doneCount}/{progress.total} firma
          </Typography>
          <Typography variant="caption">%{percent}</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label={`Mail giden firma: ${companiesMailed}`}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`Kaldırılan firma: ${progress.cancelled}`}
        />
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={`Hatalı firma: ${progress.failed}`}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`Sırada: ${progress.pending}`}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`Mail adedi: ${progress.mailsSent} gönderildi / ${progress.mailsQueued} kuyruk`}
        />
        <Chip
          size="small"
          color="info"
          variant="outlined"
          label={`Açılan: ${progress.uniqueOpenedRecipients} kişi / ${progress.mailsOpened} hit`}
        />
      </Stack>

      {job.lastError ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Son hata: {job.lastError}
        </Alert>
      ) : null}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Başlangıç: {formatDateTime(job.startedAt)} · Bitiş: {formatDateTime(job.completedAt)}
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Firma</TableCell>
            <TableCell>Durum</TableCell>
            <TableCell>Mail</TableCell>
            <TableCell>Açılma</TableCell>
            <TableCell>Detay</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageItems.map((item) => (
            <TableRow
              key={item.id}
              hover={Boolean(onOpenCompany)}
              sx={{ cursor: onOpenCompany ? 'pointer' : 'default' }}
              onClick={() => onOpenCompany?.(item.id)}
            >
              <TableCell>
                <Typography fontSize={13} fontWeight={600}>
                  {item.companyName || item.emailDomainInput || '—'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {item.companyUrl}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={itemStatusLabel(item.status)}
                  color={statusColor(item.status)}
                />
              </TableCell>
              <TableCell sx={{ fontSize: 12 }}>
                {item.sentCount || 0} gönderildi
                {(item.queuedCount || 0) > 0 ? ` / ${item.queuedCount} kuyruk` : ''}
                {(item.failedCount || 0) > 0 ? ` / ${item.failedCount} hata` : ''}
              </TableCell>
              <TableCell sx={{ fontSize: 12 }}>
                {item.uniqueOpenedRecipients || 0} kişi
                {(item.openedCount || 0) > 0 ? ` (${item.openedCount} hit)` : ''}
              </TableCell>
              <TableCell sx={{ maxWidth: 280 }} onClick={(e) => e.stopPropagation()}>
                {item.errorMessage ? (
                  <Typography variant="caption" color="error">
                    {item.errorMessage}
                  </Typography>
                ) : item.coldEmailSubject ? (
                  <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ minHeight: 32, px: 0 }}
                    >
                      <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>
                        {item.coldEmailSubject}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      {item.adaptationNotes && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', mb: 1, color: colors.secondary }}
                        >
                          Değişiklikler: {item.adaptationNotes}
                        </Typography>
                      )}
                      {item.cvFileName && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          CV: {item.cvFileName}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        {item.coldEmailBody}
                      </Typography>
                      {item.linkedinMessage ? (
                        <>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ display: 'block', mt: 1.5, mb: 0.5 }}
                          >
                            LinkedIn mesajı
                          </Typography>
                          <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'inherit',
                              color: colors.onSurfaceVariant,
                            }}
                          >
                            {item.linkedinMessage}
                          </Typography>
                        </>
                      ) : null}
                    </AccordionDetails>
                  </Accordion>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {item.step || '—'}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {jobItems.length > 0 ? <ListTablePagination {...tablePaginationProps} /> : null}
    </GlassCard>
  );
}
