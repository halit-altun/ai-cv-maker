'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  deleteFailedSendQueueRequest,
  getSendQueueDetailRequest,
  getSendQueueSummaryRequest,
  listSendQueueRequest,
  type PendingJobSendItem,
  type SendQueueAnalysisDetail,
  type SendQueueItem,
  type SendQueueStatus,
  type SendQueueSummary,
} from '@/lib/mail-tracking/api';
import { MailSendQueueDetailDialog } from './MailSendQueueDetailDialog';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import {
  ListTablePagination,
  useServerListPagination,
} from '@/shared/list-pagination';

type Props = {
  recipientFilter: string;
  companyFilter: string;
  projectFilter: string;
  sentDateFilter: string;
  statusFilter: '' | SendQueueStatus;
  refreshToken?: number;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function queueStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Sırada';
    case 'processing':
      return 'Gönderiliyor';
    case 'sent':
      return 'Gönderildi';
    case 'failed':
      return 'Başarısız';
    default:
      return status;
  }
}

function queueStatusColor(
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'sent':
      return 'success';
    case 'pending':
      return 'info';
    case 'processing':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function queueItemTime(row: SendQueueItem): number {
  const raw = row.lastActionAt || row.sentAt || row.processedAt || row.updatedAt || row.createdAt;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function jobItemToQueueRow(row: PendingJobSendItem): SendQueueItem {
  const status =
    row.queueStatus ||
    (row.itemStatus === 'failed'
      ? 'failed'
      : ['sending', 'fetching', 'analyzing'].includes(row.itemStatus || '')
        ? 'processing'
        : 'pending');
  const lastActionAt = row.lastActionAt || row.updatedAt || row.createdAt || null;
  return {
    id: `job:${row.jobId}:${row.itemId}`,
    status,
    to: row.recipients || [],
    recipient: (row.recipients || []).join(', ') || '—',
    subject: row.coldEmailSubject || '',
    companyName: row.companyName,
    lastError: row.errorMessage || '',
    projectId: row.projectId,
    companyUrl: row.companyUrl,
    todoJobId: row.jobId,
    todoItemId: row.itemId,
    scheduledAt: null,
    sentAt: null,
    createdAt: row.createdAt || lastActionAt || undefined,
    updatedAt: row.updatedAt || undefined,
    lastActionAt,
  };
}

function formatInterval(minSec?: number, maxSec?: number): string {
  const min = Number(minSec || 0);
  const max = Number(maxSec || 0);
  if (min <= 0 && max <= 0) return 'anında';
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m > 0 && r > 0) return `${m} dk ${r} sn`;
    if (m > 0) return `${m} dk`;
    return `${r} sn`;
  };
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

export function MailSendQueueView({
  recipientFilter,
  companyFilter,
  projectFilter,
  sentDateFilter,
  statusFilter,
  refreshToken = 0,
}: Props) {
  const { colors } = dashboardTokens;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SendQueueItem[]>([]);
  const [pendingJobItems, setPendingJobItems] = useState<PendingJobSendItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SendQueueSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAnalysis, setDetailAnalysis] = useState<SendQueueAnalysisDetail | null>(null);
  const [detailQueueItems, setDetailQueueItems] = useState<SendQueueItem[]>([]);

  const { skip, limit, buildTablePaginationProps } = useServerListPagination([
    recipientFilter,
    companyFilter,
    projectFilter,
    sentDateFilter,
    statusFilter,
  ]);

  const filters = useMemo(
    () => ({
      recipient: recipientFilter.trim() || undefined,
      company: companyFilter.trim() || undefined,
      projectId: projectFilter || undefined,
      date: sentDateFilter || undefined,
      status: statusFilter || undefined,
    }),
    [recipientFilter, companyFilter, projectFilter, sentDateFilter, statusFilter]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        listSendQueueRequest({ limit, skip, ...filters }),
        getSendQueueSummaryRequest({
          recipient: filters.recipient,
          company: filters.company,
          projectId: filters.projectId,
          date: filters.date,
        }),
      ]);
      setItems(list.items);
      setPendingJobItems(list.pendingJobItems || []);
      setTotal(list.total);
      setSummary(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kuyruk yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, skip]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshToken]);

  const openDetail = async (params: { jobId?: string; itemId?: string; queueId?: string }) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailAnalysis(null);
    setDetailQueueItems([]);
    try {
      const detail = await getSendQueueDetailRequest(params);
      setDetailAnalysis(detail.analysis);
      setDetailQueueItems(detail.relatedQueueItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detay alınamadı.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const smtpKeys = new Set(
      items.map((i) => i.todoItemId).filter(Boolean) as string[]
    );
    const jobRows = pendingJobItems
      .filter((row) => !smtpKeys.has(row.itemId) || row.itemStatus === 'failed')
      .map(jobItemToQueueRow);
    const merged = [...jobRows, ...items];
    const map = new Map<string, SendQueueItem[]>();
    for (const item of merged) {
      const key = item.companyName?.trim() || item.domain || 'Diğer';
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([company, rows]) => {
        const sortedRows = [...rows].sort((a, b) => queueItemTime(b) - queueItemTime(a));
        return [company, sortedRows] as [string, SendQueueItem[]];
      })
      .sort((a, b) => queueItemTime(b[1][0]) - queueItemTime(a[1][0]));
  }, [items, pendingJobItems]);

  const hasRows = grouped.some(([, rows]) => rows.length > 0);

  const cancelQueueRow = async (row: SendQueueItem, event: MouseEvent) => {
    event.stopPropagation();
    const cancellable = row.status === 'pending' || row.status === 'failed';
    if (!cancellable) return;
    const confirmText =
      row.status === 'failed'
        ? 'Bu başarısız kaydı silmek istiyor musunuz?'
        : 'Bu mail kuyruktan çıkarılacak. Sonraki mailler öne çekilir; gönderim saatleri yeniden hesaplanır. Devam?';
    if (!window.confirm(confirmText)) return;
    try {
      if (row.id.startsWith('job:') && row.todoJobId && row.todoItemId) {
        await deleteFailedSendQueueRequest({
          jobId: row.todoJobId,
          itemId: row.todoItemId,
        });
      } else {
        await deleteFailedSendQueueRequest({ queueId: row.id });
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt silinemedi.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          {[
            { label: 'Sırada (SMTP)', value: summary.queued },
            { label: 'Gönderildi', value: summary.sent },
            { label: 'Başarısız', value: summary.failed },
            {
              label: 'Job bekleyen firma',
              value: summary.pendingJobItemCount,
            },
            {
              label: 'Job bekleyen alıcı',
              value: summary.pendingJobRecipientCount,
            },
            {
              label: 'Profil aralığı',
              value: formatInterval(summary.intervalMinSeconds, summary.intervalMaxSeconds),
            },
            {
              label: 'Tahmini bitiş',
              value: formatDateTime(summary.estimatedCompletionAt),
            },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                px: 2,
                py: 1.5,
                minWidth: 130,
                borderRadius: 2,
                border: `1px solid ${colors.outlineVariant}`,
                bgcolor: colors.surfaceContainerLowest,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
              <Typography fontWeight={700}>{s.value}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !hasRows ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !hasRows ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Aralıklı gönderim kuyruğu boş. Company-based’te analiz sonrası gönderim buraya düşer.
        </Alert>
      ) : (
        <Box
          sx={{
            borderRadius: 3,
            border: `1px solid ${colors.outlineVariant}`,
            overflow: 'auto',
            bgcolor: colors.surfaceContainerLowest,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
            En son eyleme göre (yeniden eskiye). Sıradan çıkarınca sonraki mailler öne çekilir.
            Satıra tıklayınca analiz detayı açılır.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Şirket / alıcı</TableCell>
                <TableCell>Konu</TableCell>
                <TableCell>Planlanan</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Gönderildi</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {grouped.map(([company, rows]) =>
                rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() =>
                      void openDetail(
                        row.todoJobId && row.todoItemId
                          ? { jobId: row.todoJobId, itemId: row.todoItemId, queueId: row.id.startsWith('job:') ? undefined : row.id }
                          : { queueId: row.id }
                      )
                    }
                  >
                    <TableCell>
                      {idx === 0 ? (
                        <Typography variant="body2" fontWeight={700}>
                          {company}
                        </Typography>
                      ) : null}
                      <Typography variant="body2">{row.recipient}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {row.subject || '—'}
                      </Typography>
                      {row.status === 'failed' && row.lastError ? (
                        <Typography variant="caption" color="error" display="block">
                          {row.lastError}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatDateTime(row.scheduledAt)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={queueStatusLabel(row.status)}
                        color={queueStatusColor(row.status)}
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(row.sentAt)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {row.status === 'pending' || row.status === 'failed' ? (
                        <Tooltip
                          title={
                            row.status === 'failed'
                              ? 'Başarısız kaydı sil'
                              : 'Kuyruktan çıkar (sonraki saatler yeniden hesaplanır)'
                          }
                        >
                          <IconButton
                            size="small"
                            aria-label={
                              row.status === 'failed' ? 'Başarısız kaydı sil' : 'Kuyruktan çıkar'
                            }
                            onClick={(e) => void cancelQueueRow(row, e)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListTablePagination {...buildTablePaginationProps(total)} />
        </Box>
      )}
      <MailSendQueueDetailDialog
        open={detailOpen}
        loading={detailLoading}
        analysis={detailAnalysis}
        relatedQueueItems={detailQueueItems}
        onClose={() => setDetailOpen(false)}
      />
    </Box>
  );
}
