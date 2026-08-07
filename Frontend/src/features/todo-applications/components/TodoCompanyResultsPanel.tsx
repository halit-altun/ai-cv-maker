'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getTodoProjectCompanyResultsRequest,
  type TodoJobItem,
  type TodoProjectCvMeta,
} from '@/lib/todo-applications/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { GlassCard } from '@/features/company-cv-optimizer/components/shell/GlassCard';

type CompanyResult = TodoJobItem & {
  jobId?: string;
  jobStatus?: string;
  jobMode?: string;
  jobCreatedAt?: string;
};

type StatusFilter =
  | 'all'
  | 'mailed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'opened';

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
      return 'success';
    case 'failed':
      return 'error';
    case 'cancelled':
    case 'pending':
      return 'warning';
    case 'fetching':
    case 'analyzing':
    case 'sending':
      return 'info';
    default:
      return 'default';
  }
}

interface TodoCompanyResultsPanelProps {
  projectId: string;
}

export function TodoCompanyResultsPanel({ projectId }: TodoCompanyResultsPanelProps) {
  const { colors, fonts } = dashboardTokens;
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    mailed: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    pending: 0,
    opened: 0,
  });
  const [cv, setCv] = useState<TodoProjectCvMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CompanyResult | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTodoProjectCompanyResultsRequest(projectId);
      setCompanies(data.companies);
      setTotals(data.totals);
      setCv(data.cv || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sonuçlar alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (filter === 'mailed') {
        if (!((c.sentCount || 0) > 0 || (c.queuedCount || 0) > 0)) return false;
      } else if (filter === 'opened') {
        if (!((c.uniqueOpenedRecipients || 0) > 0)) return false;
      } else if (filter === 'pending') {
        if (!['pending', 'fetching', 'analyzing', 'sending'].includes(c.status)) {
          return false;
        }
      } else if (filter !== 'all' && c.status !== filter) {
        return false;
      }

      if (!q) return true;
      const hay = `${c.companyName || ''} ${c.emailDomainInput || ''} ${c.companyUrl || ''} ${c.coldEmailSubject || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [companies, filter, search]);

  return (
    <>
      <GlassCard sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600 }}>
            Firma sonuçları
          </Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void load()}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Yenile
          </Button>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip size="small" label={`Toplam: ${totals.total}`} />
          <Chip size="small" color="success" variant="outlined" label={`Mail giden: ${totals.mailed}`} />
          <Chip size="small" variant="outlined" label={`Kaldırılan: ${totals.cancelled}`} />
          <Chip size="small" color="error" variant="outlined" label={`Hata: ${totals.failed}`} />
          <Chip size="small" variant="outlined" label={`Sırada/işlenen: ${totals.pending}`} />
          <Chip size="small" color="info" variant="outlined" label={`Açılan firma: ${totals.opened}`} />
        </Stack>

        {cv?.hasCv && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Proje CV’si: <strong>{cv.cvFileName}</strong>
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 220px' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label="Ara (firma / domain / konu)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Filtre</InputLabel>
            <Select
              label="Filtre"
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
            >
              <MenuItem value="all">Tümü</MenuItem>
              <MenuItem value="mailed">Mail giden</MenuItem>
              <MenuItem value="opened">Açılan</MenuItem>
              <MenuItem value="completed">Tamamlanan</MenuItem>
              <MenuItem value="failed">Hatalı</MenuItem>
              <MenuItem value="cancelled">Kaldırılan</MenuItem>
              <MenuItem value="pending">Sırada / işlenen</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !filtered.length ? (
          <Typography variant="body2" color="text.secondary">
            Bu filtreye uygun firma sonucu yok. Toplu başvuru çalıştırdıktan sonra burada
            görünür.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Firma</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Mail</TableCell>
                <TableCell>Açılma</TableCell>
                <TableCell>Konu</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelected(c)}
                >
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600}>
                      {c.companyName || c.emailDomainInput}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {c.emailDomainInput}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={itemStatusLabel(c.status)}
                      color={statusColor(c.status)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {(c.sentCount || 0) + (c.queuedCount || 0)} adet
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {c.uniqueOpenedRecipients || 0}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, maxWidth: 180 }} noWrap>
                    {c.coldEmailSubject || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="md"
      >
        {selected && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              {selected.companyName || selected.emailDomainInput}
              <IconButton
                onClick={() => setSelected(null)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    URL
                  </Typography>
                  <Typography fontSize={14} sx={{ wordBreak: 'break-all' }}>
                    {selected.companyUrl}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={itemStatusLabel(selected.status)}
                    color={statusColor(selected.status)}
                  />
                  <Chip
                    size="small"
                    label={`Gönderilen: ${selected.sentCount || 0}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`Kuyruk: ${selected.queuedCount || 0}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`Hata: ${selected.failedCount || 0}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    color="info"
                    label={`Açılma: ${selected.uniqueOpenedRecipients || 0} kişi / ${selected.openedCount || 0} hit`}
                    variant="outlined"
                  />
                </Stack>

                <Box>
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                    CV önizleme
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.cvFileName || cv?.cvFileName
                      ? `Gönderimde kullanılan CV: ${selected.cvFileName || cv?.cvFileName}`
                      : 'Bu kayıtta CV bilgisi yok.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Not: Optimize edilmiş PDF önizlemesi henüz üretilmiyor; proje CV PDF’i ek
                    olarak gönderilir.
                  </Typography>
                </Box>

                <Box>
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                    Neler değişti / uyarlandı
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', color: colors.onSurfaceVariant }}
                  >
                    {selected.adaptationNotes || 'Uyarlama notu yok.'}
                  </Typography>
                </Box>

                <Box>
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                    Cold mail
                  </Typography>
                  <Typography fontSize={14} fontWeight={600} sx={{ mb: 1 }}>
                    {selected.coldEmailSubject || '—'}
                  </Typography>
                  <Typography
                    component="pre"
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: colors.surfaceContainerLow,
                      border: `1px solid ${colors.outlineVariant}`,
                    }}
                  >
                    {selected.coldEmailBody || 'Cold mail henüz üretilmedi.'}
                  </Typography>
                </Box>

                <Box>
                  <Typography fontWeight={600} sx={{ mb: 1 }}>
                    Alıcılar
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {(selected.recipientResults || []).length
                      ? selected.recipientResults!.map((r) => (
                          <Chip
                            key={r.email}
                            size="small"
                            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                            label={`${r.email} · ${r.status}${
                              r.openedCount ? ` · açılma ${r.openedCount}` : ''
                            }`}
                          />
                        ))
                      : (selected.selectedRecipients || []).map((email) => (
                          <Chip
                            key={email}
                            size="small"
                            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                            label={email}
                          />
                        ))}
                  </Box>
                </Box>

                {selected.errorMessage && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {selected.errorMessage}
                  </Alert>
                )}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}
