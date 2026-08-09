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
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  downloadMailTrackingCvRequest,
  getMailTrackingColdMailsRequest,
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

/** Soft-delete sonrası archived:<id>:<ad> veya ham ObjectId → okunabilir proje adı */
function formatProjectName(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  const archived = /^archived:[a-f0-9]{24}:(.+)$/i.exec(raw);
  if (archived) return archived[1].trim() || '—';
  if (/^[a-f0-9]{24}$/i.test(raw)) return '—';
  return raw;
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

  const [cvBusyId, setCvBusyId] = useState<string | null>(null);
  const [coldBusyId, setColdBusyId] = useState<string | null>(null);
  const [coldModalOpen, setColdModalOpen] = useState(false);
  const [coldModalTitle, setColdModalTitle] = useState('');
  const [coldModalBody, setColdModalBody] = useState('');
  const [copyToast, setCopyToast] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listFilters = {
        status: statusFilter || undefined,
        projectId: projectFilter || undefined,
        company: companyFilter.trim() || undefined,
        date: sentDateFilter || undefined,
      };
      /** Özet kartları: tarih/proje/şirket; statü kırılımları bozulmasın diye status yok */
      const statsFilters = {
        projectId: projectFilter || undefined,
        company: companyFilter.trim() || undefined,
        date: sentDateFilter || undefined,
      };
      const [list, summary, projectList] = await Promise.all([
        listMailTrackingsRequest({
          limit,
          skip,
          ...listFilters,
        }),
        getMailTrackingStatsRequest(statsFilters),
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
      const summary = await getMailTrackingStatsRequest({
        projectId: projectFilter || undefined,
        company: companyFilter.trim() || undefined,
        date: sentDateFilter || undefined,
      });
      setStats(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outcome kaydedilemedi.');
    }
  };

  const downloadCv = async (row: MailTrackingItem, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!row.hasCvPdf) {
      setError('Bu gönderim için kayıtlı CV yok (eski kayıtlar veya ek gönderilmemiş).');
      return;
    }
    setCvBusyId(row.mailId);
    try {
      const file = await downloadMailTrackingCvRequest(row.mailId);
      const binary = atob(file.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: file.contentType || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename || row.cvFileName || 'CV.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CV indirilemedi.');
    } finally {
      setCvBusyId(null);
    }
  };

  const openColdMail = async (
    row: MailTrackingItem,
    kind: 'standard' | 'infoContact',
    e?: MouseEvent
  ) => {
    e?.stopPropagation();
    setColdBusyId(`${row.mailId}:${kind}`);
    try {
      const data = await getMailTrackingColdMailsRequest(row.mailId);
      const body =
        kind === 'infoContact' ? data.infoContactBody.trim() : data.standardBody.trim();
      if (!body) {
        setError(
          kind === 'infoContact'
            ? 'info/contact cold mail bulunamadı.'
            : 'Standart cold mail bulunamadı.'
        );
        return;
      }
      try {
        await navigator.clipboard.writeText(body);
        setCopyToast(true);
      } catch {
        /* clipboard izni yoksa yine modal açılır */
      }
      setColdModalTitle(
        kind === 'infoContact' ? 'info@ / contact@ cold mail' : 'Standart cold mail'
      );
      setColdModalBody(body);
      setColdModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cold mail alınamadı.');
    } finally {
      setColdBusyId(null);
    }
  };

  const copyColdModalBody = async () => {
    if (!coldModalBody.trim()) return;
    try {
      await navigator.clipboard.writeText(coldModalBody);
      setCopyToast(true);
    } catch {
      setError('Panoya kopyalanamadı.');
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
            { label: 'Toplam mail', value: stats.total },
            { label: 'Toplam firma', value: stats.companyCount ?? 0 },
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
                <TableCell align="right">CV / Cold mail</TableCell>
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
                  <TableCell>{formatProjectName(row.projectName)}</TableCell>
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
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                      <Tooltip title={row.hasCvPdf ? 'Gönderilen CV’yi indir' : 'CV kaydı yok'}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!row.hasCvPdf || cvBusyId === row.mailId}
                            onClick={(e) => void downloadCv(row, e)}
                            aria-label="CV indir"
                          >
                            {cvBusyId === row.mailId ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DownloadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      {row.hasStandardColdMail && (
                        <Tooltip title="Standart cold mail — kopyala ve göster">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={
                                coldBusyId === `${row.mailId}:standard` ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <EmailIcon fontSize="small" />
                                )
                              }
                              disabled={coldBusyId === `${row.mailId}:standard`}
                              onClick={(e) => void openColdMail(row, 'standard', e)}
                              sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                            >
                              Standart
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {row.hasInfoContactColdMail && (
                        <Tooltip title="info/contact cold mail — kopyala ve göster">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              startIcon={
                                coldBusyId === `${row.mailId}:infoContact` ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <EmailIcon fontSize="small" />
                                )
                              }
                              disabled={coldBusyId === `${row.mailId}:infoContact`}
                              onClick={(e) => void openColdMail(row, 'infoContact', e)}
                              sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                            >
                              Info
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
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
                <strong>Proje:</strong> {formatProjectName(selected.projectName)}
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

      <Dialog
        open={coldModalOpen}
        onClose={() => setColdModalOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {coldModalTitle}
          <IconButton onClick={() => setColdModalOpen(false)} size="small" aria-label="Kapat">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              m: 0,
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
          >
            {coldModalBody}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={() => void copyColdModalBody()}
            sx={{ textTransform: 'none' }}
          >
            Tekrar kopyala
          </Button>
          <Button onClick={() => setColdModalOpen(false)} sx={{ textTransform: 'none' }}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copyToast}
        autoHideDuration={2200}
        onClose={() => setCopyToast(false)}
        message="Cold mail panoya kopyalandı"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
