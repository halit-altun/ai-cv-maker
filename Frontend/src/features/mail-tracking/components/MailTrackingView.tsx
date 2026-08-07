'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getMailTrackingDetailRequest,
  getMailTrackingStatsRequest,
  listMailTrackingsRequest,
  setMailDeliveryOutcomeRequest,
  simulateMailOpenRequest,
  type MailOpenEvent,
  type MailTrackingItem,
  type MailTrackingStats,
  type MailTrackingStatus,
} from '@/lib/mail-tracking/api';
import { listOutreachProjectsRequest } from '@/lib/projects/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import {
  ListTablePagination,
  useServerListPagination,
} from '@/shared/list-pagination';

function statusLabel(status: string): string {
  switch (status) {
    case 'SENT':
      return 'Gönderildi';
    case 'DELIVERED':
      return 'Teslim edildi';
    case 'OPENED':
      return 'Okundu';
    case 'FAILED':
      return 'Başarısız';
    default:
      return status;
  }
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'OPENED':
      return 'success';
    case 'DELIVERED':
      return 'info';
    case 'SENT':
      return 'default';
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
}

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

export function MailTrackingView() {
  const { colors, fonts } = dashboardTokens;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackings, setTrackings] = useState<MailTrackingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MailTrackingStats | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const [statusFilter, setStatusFilter] = useState<'' | MailTrackingStatus>('');
  const [projectFilter, setProjectFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  /** Tek gün — gönderim tarihi (YYYY-MM-DD) */
  const [sentDateFilter, setSentDateFilter] = useState('');

  const {
    skip,
    limit,
    buildTablePaginationProps,
  } = useServerListPagination([statusFilter, projectFilter, companyFilter, sentDateFilter]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<MailTrackingItem | null>(null);
  const [openEvents, setOpenEvents] = useState<MailOpenEvent[]>([]);
  const [pixelUrl, setPixelUrl] = useState<string | null>(null);
  const [trackingBaseIsLocal, setTrackingBaseIsLocal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, summary, projectList] = await Promise.all([
        listMailTrackingsRequest({
          limit,
          skip,
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
          company: companyFilter.trim() || undefined,
          date: sentDateFilter || undefined,
        }),
        getMailTrackingStatsRequest(projectFilter || undefined),
        listOutreachProjectsRequest().catch(() => ({ projects: [] as Array<{ id: string; name: string }> })),
      ]);
      setTrackings(list.trackings);
      setTotal(list.total);
      setStats(summary);
      setProjects(
        (projectList.projects || []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mail takip verisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, projectFilter, companyFilter, sentDateFilter, limit, skip]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDetail = async (item: MailTrackingItem) => {
    setSelected(item);
    setDetailOpen(true);
    setDetailLoading(true);
    setPixelUrl(null);
    try {
      const detail = await getMailTrackingDetailRequest(item.mailId);
      setSelected(detail.tracking);
      setOpenEvents(detail.openEvents);
      setPixelUrl(detail.pixelUrl || null);
      setTrackingBaseIsLocal(Boolean(detail.trackingBaseIsLocal));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detay alınamadı.');
    } finally {
      setDetailLoading(false);
    }
  };

  const simulateOpen = async () => {
    if (!selected?.mailId) return;
    try {
      const result = await simulateMailOpenRequest(selected.mailId);
      setSelected(result.tracking);
      setTrackings((prev) =>
        prev.map((t) => (t.mailId === selected.mailId ? { ...t, ...result.tracking } : t))
      );
      setPixelUrl(result.pixelUrl || pixelUrl);
      setTrackingBaseIsLocal(Boolean(result.trackingBaseIsLocal));
      const detail = await getMailTrackingDetailRequest(selected.mailId);
      setOpenEvents(detail.openEvents);
      if (result.hint) setError(result.hint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simülasyon başarısız.');
    }
  };

  const markOutcome = async (
    mailId: string,
    outcome: 'inbox' | 'spam' | 'unknown',
    e?: MouseEvent
  ) => {
    e?.stopPropagation();
    try {
      const updated = await setMailDeliveryOutcomeRequest(mailId, outcome);
      setTrackings((prev) => prev.map((t) => (t.mailId === mailId ? { ...t, ...updated } : t)));
      if (selected?.mailId === mailId) setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
      const summary = await getMailTrackingStatsRequest(projectFilter || undefined);
      setStats(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outcome kaydedilemedi.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <MarkEmailReadIcon sx={{ color: colors.secondary }} />
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              Mail Takip
            </Typography>
          </Box>
          <Typography sx={{ color: colors.onSurfaceVariant }}>
            Gönderilen maillerin durumu ve okundu takibi. Spam skorunu güçlendirmek için her maili
            “Gelen kutusu” veya “Spam” olarak işaretleyin.
          </Typography>
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
            Gmail görselleri Google proxy ile yüklenir — pixel URL <strong>localhost</strong> ise
            OPENED asla düşmez. Backend .env: <code>TRACKING_PUBLIC_BASE_URL</code> = ngrok HTTPS
            adresi. Sonra <strong>yeni mail</strong> gönderin (eski maillerdeki pixel hâlâ
            localhost).
          </Alert>
        </Box>
        <IconButton onClick={() => void loadData()} disabled={loading} aria-label="Yenile">
          <RefreshIcon />
        </IconButton>
      </Box>

      {stats && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          {[
            { label: 'Toplam', value: stats.total },
            { label: 'Gönderildi', value: stats.sent },
            { label: 'Teslim', value: stats.delivered },
            { label: 'Okundu', value: stats.opened },
            { label: 'Başarısız', value: stats.failed },
            { label: 'Open rate', value: `%${stats.openRate}` },
            { label: 'Gelen kutusu', value: stats.inbox ?? 0 },
            { label: 'Spam işaret', value: stats.spam ?? 0 },
            {
              label: 'Inbox oranı',
              value: stats.inboxRate != null ? `%${stats.inboxRate}` : '—',
            },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                px: 2,
                py: 1.5,
                minWidth: 110,
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statü</InputLabel>
          <Select
            label="Statü"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | MailTrackingStatus)}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="SENT">Gönderildi</MenuItem>
            <MenuItem value="DELIVERED">Teslim edildi</MenuItem>
            <MenuItem value="OPENED">Okundu</MenuItem>
            <MenuItem value="FAILED">Başarısız</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Outreach Projesi</InputLabel>
          <Select
            label="Outreach Projesi"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <MenuItem value="">Tümü</MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Şirket ara"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        />

        <TextField
          size="small"
          type="date"
          label="Gönderim tarihi"
          value={sentDateFilter}
          onChange={(e) => setSentDateFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
          helperText={sentDateFilter ? 'Tek gün (gönderim)' : 'Tüm günler'}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : trackings.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Henüz takip kaydı yok. Profilim’de “Mail okundu takibi” açıkken gönderilen mailler burada görünür.
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Alıcı</TableCell>
                <TableCell>Şirket</TableCell>
                <TableCell>Proje</TableCell>
                <TableCell>Statü</TableCell>
                <TableCell>Sonuç (sen işaretle)</TableCell>
                <TableCell>Okundu</TableCell>
                <TableCell>Gönderim</TableCell>
                <TableCell>İlk açılış</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trackings.map((row) => (
                <TableRow
                  key={row.mailId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => void openDetail(row)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.recipient}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.subject || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.company || '—'}</TableCell>
                  <TableCell>{row.projectName || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={statusLabel(row.status)} color={statusColor(row.status)} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ButtonGroup size="small" variant="outlined">
                      <Button
                        color={row.deliveryOutcome === 'inbox' ? 'success' : 'inherit'}
                        variant={row.deliveryOutcome === 'inbox' ? 'contained' : 'outlined'}
                        onClick={(e) => void markOutcome(row.mailId, 'inbox', e)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                      >
                        Gelen
                      </Button>
                      <Button
                        color={row.deliveryOutcome === 'spam' ? 'error' : 'inherit'}
                        variant={row.deliveryOutcome === 'spam' ? 'contained' : 'outlined'}
                        onClick={(e) => void markOutcome(row.mailId, 'spam', e)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                      >
                        Spam
                      </Button>
                    </ButtonGroup>
                  </TableCell>
                  <TableCell>
                    {row.status === 'OPENED' ? `✅ ${row.openedCount} kez` : '—'}
                  </TableCell>
                  <TableCell>{formatDateTime(row.sentAt || row.createdAt)}</TableCell>
                  <TableCell>{formatDateTime(row.firstOpenedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListTablePagination {...buildTablePaginationProps(total)} />
        </Box>
      )}

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Mail detayı
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading || !selected ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Alıcı
                </Typography>
                <Typography fontWeight={600}>{selected.recipient}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={statusLabel(selected.status)} color={statusColor(selected.status)} />
                {selected.status === 'OPENED' && (
                  <Chip size="small" label={`Opened: ✅ (${selected.openedCount} kez)`} color="success" />
                )}
              </Stack>
              <Typography variant="body2">
                <strong>Şirket:</strong> {selected.company || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Pozisyon:</strong> {selected.jobTitle || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Proje:</strong> {selected.projectName || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Konu:</strong> {selected.subject || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Gönderim:</strong> {formatDateTime(selected.sentAt || selected.createdAt)}
              </Typography>
              <Typography variant="body2">
                <strong>İlk açılış:</strong> {formatDateTime(selected.firstOpenedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Son açılış:</strong> {formatDateTime(selected.lastOpenedAt)}
              </Typography>

              {trackingBaseIsLocal && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  Pixel tabanı localhost. Gmail açılışı kayda geçmez. ngrok + TRACKING_PUBLIC_BASE_URL
                  ayarlayıp yeni mail atın. UI testi için aşağıdaki butonu kullanın.
                </Alert>
              )}

              {pixelUrl && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pixel URL
                  </Typography>
                  <Typography
                    variant="caption"
                    component="a"
                    href={pixelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', wordBreak: 'break-all' }}
                  >
                    {pixelUrl}
                  </Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                onClick={() => void simulateOpen()}
                sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
              >
                Manuel okundu işaretle (test)
              </Button>

              <Typography fontWeight={700} sx={{ pt: 1 }}>
                Açılış kayıtları ({openEvents.length})
              </Typography>
              {openEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Henüz açılış yok.
                </Typography>
              ) : (
                openEvents.map((ev) => (
                  <Box
                    key={ev._id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${colors.outlineVariant}`,
                    }}
                  >
                    <Typography variant="body2">{formatDateTime(ev.createdAt)}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {ev.openedInSeconds != null ? `${ev.openedInSeconds}s sonra` : '—'}
                      {ev.ip ? ` · IP: ${ev.ip}` : ''}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', wordBreak: 'break-all' }}
                    >
                      {ev.userAgent || '—'}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
