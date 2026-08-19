'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
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
  const raw = row.sentAt || row.scheduledAt || row.createdAt;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
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
    const map = new Map<string, SendQueueItem[]>();
    for (const item of items) {
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
  }, [items]);

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

      {pendingJobItems.length > 0 && (
        <Box
          sx={{
            borderRadius: 3,
            border: `1px solid ${colors.outlineVariant}`,
            overflow: 'auto',
            bgcolor: colors.surfaceContainerLowest,
          }}
        >
          <Typography sx={{ px: 2, pt: 1.5, fontWeight: 600 }}>
            Job kuyruğunda (henüz SMTP zamanı yok) — satıra tıklayınca analiz detayı. Liste Yenile ile güncellenir.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Şirket</TableCell>
                <TableCell>Alıcılar</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Plan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingJobItems.map((row) => (
                <TableRow
                  key={`${row.jobId}:${row.itemId}`}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => void openDetail({ jobId: row.jobId, itemId: row.itemId })}
                >
                  <TableCell>{row.companyName || '—'}</TableCell>
                  <TableCell>
                    {row.recipients.slice(0, 4).join(', ')}
                    {row.recipients.length > 4
                      ? ` +${row.recipients.length - 4}`
                      : ''}
                    {` (${row.recipientCount})`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.itemStatus}
                      color={row.itemStatus === 'failed' ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {row.itemStatus === 'failed'
                      ? row.errorMessage || 'Gönderilemedi'
                      : 'Gönderim bekleniyor'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {loading && items.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 && pendingJobItems.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Aralıklı gönderim kuyruğu boş. Company-based’te analiz sonrası gönderim buraya düşer.
        </Alert>
      ) : items.length > 0 ? (
        <Box
          sx={{
            borderRadius: 3,
            border: `1px solid ${colors.outlineVariant}`,
            overflow: 'auto',
            bgcolor: colors.surfaceContainerLowest,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
            Satıra tıklayınca KW, CV farkları, itibar skoru ve mailler açılır.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Şirket / alıcı</TableCell>
                <TableCell>Konu</TableCell>
                <TableCell>Planlanan</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Gönderildi</TableCell>
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
                          ? { jobId: row.todoJobId, itemId: row.todoItemId, queueId: row.id }
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListTablePagination
            {...buildTablePaginationProps(total)}
          />
        </Box>
      ) : null}
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
