'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useSearchParams } from 'next/navigation';
import {
  listOutreachCompaniesRequest,
  type OutreachCompanyGroup,
  type OutreachLogItem,
} from '@/lib/outreach/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { ListTablePagination, useListPagination } from '@/shared/list-pagination';

type LogFilters = {
  domain: string;
  companyName: string;
  status: string;
  targetPosition: string;
  recipient: string;
  subject: string;
  cvFileName: string;
  templateType: string;
  recipientStatus: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: LogFilters = {
  domain: '',
  companyName: '',
  status: '',
  targetPosition: '',
  recipient: '',
  subject: '',
  cvFileName: '',
  templateType: '',
  recipientStatus: '',
  dateFrom: '',
  dateTo: '',
};

function statusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'Başarılı';
    case 'partial':
      return 'Kısmi';
    case 'failed':
      return 'Başarısız';
    case 'verify_failed':
      return 'Doğrulama başarısız';
    case 'ai_error':
      return 'AI hatası';
    case 'analysis_only':
      return 'Sadece analiz';
    default:
      return status;
  }
}

function statusColor(
  status: string
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'success':
      return 'success';
    case 'partial':
      return 'warning';
    case 'failed':
    case 'verify_failed':
      return 'error';
    case 'ai_error':
      return 'error';
    default:
      return 'default';
  }
}

function recipientStatusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'Gitti';
    case 'logged':
      return 'SMTP yok (loglandı)';
    case 'failed':
      return 'Gönderilemedi';
    case 'invalid':
      return 'Doğrulanamadı — gitmedi';
    case 'skipped':
      return 'Atlandı — gitmedi';
    default:
      return status;
  }
}

function recipientStatusColor(
  status: string
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'sent':
    case 'logged':
      return 'success';
    case 'skipped':
      return 'warning';
    case 'invalid':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function verifyProviderLabel(provider?: string): string {
  switch (String(provider || '').toLowerCase()) {
    case 'emailverify':
      return 'EmailVerify.io';
    case 'abstract':
      return 'EmailVerify.io';
    case 'mx':
      return 'MX (DNS)';
    case 'mx-only':
      return 'MX only';
    case 'user-entered':
      return 'Kullanıcı adresi';
    case 'trusted':
      return 'Ana adres (doğrulamasız)';
    case 'skip':
      return 'Doğrulama atlandı';
    case 'none':
      return 'Provider yok';
    default:
      return provider?.trim() || '—';
  }
}

function verifyResultLabel(result?: string): string {
  const r = String(result || '').toLowerCase();
  switch (r) {
    case 'safe':
    case 'deliverable':
    case 'valid':
    case 'trusted':
    case 'trusted_skip':
    case 'mx_ok':
      return 'Geçerli';
    case 'role_based':
    case 'rolebased':
      return 'Geçerli (role-based / kariyer)';
    case 'invalid':
    case 'undeliverable':
      return 'Geçersiz';
    case 'risky':
    case 'unknown':
    case 'ambiguous':
      return 'Belirsiz / riskli';
    case 'skipped':
      return 'Atlandı';
    case 'quota_exceeded':
      return 'Kota doldu';
    default:
      return result?.trim() || '—';
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function includesCI(haystack: string | undefined | null, needle: string): boolean {
  if (!needle.trim()) return true;
  return String(haystack || '')
    .toLowerCase()
    .includes(needle.trim().toLowerCase());
}

function logMatchesFilters(log: OutreachLogItem, f: LogFilters): boolean {
  if (f.status && log.status !== f.status) return false;
  if (f.templateType && String(log.templateType || '') !== f.templateType) return false;
  if (!includesCI(log.targetPosition, f.targetPosition)) return false;
  if (!includesCI(log.subject, f.subject)) return false;
  if (!includesCI(log.cvFileName || log.cvTitle, f.cvFileName)) return false;
  if (f.recipient.trim()) {
    const q = f.recipient.trim().toLowerCase();
    const hit = (log.recipients || []).some((r) =>
      String(r.email || '')
        .toLowerCase()
        .includes(q)
    );
    if (!hit) return false;
  }
  if (f.recipientStatus) {
    const hit = (log.recipients || []).some((r) => r.status === f.recipientStatus);
    if (!hit) return false;
  }
  if (f.dateFrom) {
    const from = new Date(f.dateFrom);
    const sent = new Date(log.sentAt);
    if (!Number.isNaN(from.getTime()) && sent < from) return false;
  }
  if (f.dateTo) {
    const to = new Date(f.dateTo);
    to.setHours(23, 59, 59, 999);
    const sent = new Date(log.sentAt);
    if (!Number.isNaN(to.getTime()) && sent > to) return false;
  }
  return true;
}

function filterCompanies(
  companies: OutreachCompanyGroup[],
  f: LogFilters,
  focusDomain: string
): OutreachCompanyGroup[] {
  return companies
    .map((company) => {
      if (f.domain.trim() && !includesCI(company.domain, f.domain)) {
        return null;
      }
      if (f.companyName.trim() && !includesCI(company.companyName, f.companyName)) {
        return null;
      }
      const logs = (company.logs || []).filter((log) => logMatchesFilters(log, f));
      const hasLogFilters =
        Boolean(f.status) ||
        Boolean(f.templateType) ||
        Boolean(f.targetPosition.trim()) ||
        Boolean(f.recipient.trim()) ||
        Boolean(f.subject.trim()) ||
        Boolean(f.cvFileName.trim()) ||
        Boolean(f.recipientStatus) ||
        Boolean(f.dateFrom) ||
        Boolean(f.dateTo);
      if (hasLogFilters && logs.length === 0) return null;
      return {
        ...company,
        logs: hasLogFilters ? logs : company.logs,
      };
    })
    .filter((c): c is OutreachCompanyGroup => Boolean(c))
    .sort((a, b) => {
      if (focusDomain) {
        if (a.domain === focusDomain) return -1;
        if (b.domain === focusDomain) return 1;
      }
      return (
        new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime()
      );
    });
}

export function OutreachLogsView() {
  const { colors, fonts } = dashboardTokens;
  const searchParams = useSearchParams();
  const focusDomain = (searchParams.get('domain') || '').toLowerCase();

  const [companies, setCompanies] = useState<OutreachCompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>(() => ({
    ...EMPTY_FILTERS,
    domain: focusDomain || '',
  }));

  useEffect(() => {
    if (focusDomain) {
      setFilters((prev) =>
        prev.domain === focusDomain ? prev : { ...prev, domain: focusDomain }
      );
    }
  }, [focusDomain]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listOutreachCompaniesRequest();
        if (!cancelled) setCompanies(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Loglar alınamadı.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterCompanies(companies, filters, focusDomain),
    [companies, filters, focusDomain]
  );

  const activeFilterCount = useMemo(() => {
    return (Object.keys(EMPTY_FILTERS) as Array<keyof LogFilters>).filter((key) => {
      const v = filters[key];
      if (key === 'domain' && focusDomain && v === focusDomain) return false;
      return Boolean(String(v || '').trim());
    }).length;
  }, [filters, focusDomain]);

  const { pageItems: pagedCompanies, tablePaginationProps } = useListPagination(
    filtered,
    [filters, focusDomain]
  );

  const setFilter = <K extends keyof LogFilters>(key: K, value: LogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <HistoryIcon sx={{ color: colors.secondary }} />
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 600,
              color: colors.primary,
            }}
          >
            Mail Gönderim Logları
          </Typography>
        </Box>
        <Typography sx={{ color: colors.onSurfaceVariant, maxWidth: 720 }}>
          Şirket / domain bazlı geçmiş: hangi adres doğrulandı, hangisi gitti / gitmedi,
          MX ve doğrulama sonucu.
        </Typography>
      </Box>

      {focusDomain && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Odak domain: <strong>@{focusDomain}</strong> — bu firmaya daha önce mail
          gönderilmiş olabilir.
        </Alert>
      )}

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${colors.outlineVariant}`,
          bgcolor: colors.surfaceContainerLowest,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr 1fr',
          },
        }}
      >
        <TextField
          size="small"
          label="Domain"
          value={filters.domain}
          onChange={(e) => setFilter('domain', e.target.value)}
          placeholder="oakslab.com"
        />
        <TextField
          size="small"
          label="Firma adı"
          value={filters.companyName}
          onChange={(e) => setFilter('companyName', e.target.value)}
        />
        <FormControl size="small">
          <InputLabel>Gönderim durumu</InputLabel>
          <Select
            label="Gönderim durumu"
            value={filters.status}
            onChange={(e) => setFilter('status', String(e.target.value))}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="success">Başarılı</MenuItem>
            <MenuItem value="partial">Kısmi</MenuItem>
            <MenuItem value="failed">Başarısız</MenuItem>
            <MenuItem value="verify_failed">Doğrulama başarısız</MenuItem>
            <MenuItem value="ai_error">AI hatası</MenuItem>
            <MenuItem value="analysis_only">Sadece analiz</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Pozisyon"
          value={filters.targetPosition}
          onChange={(e) => setFilter('targetPosition', e.target.value)}
        />
        <TextField
          size="small"
          label="Alıcı e-posta"
          value={filters.recipient}
          onChange={(e) => setFilter('recipient', e.target.value)}
          placeholder="hello@"
        />
        <FormControl size="small">
          <InputLabel>Alıcı sonucu</InputLabel>
          <Select
            label="Alıcı sonucu"
            value={filters.recipientStatus}
            onChange={(e) => setFilter('recipientStatus', String(e.target.value))}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="sent">Gitti</MenuItem>
            <MenuItem value="logged">SMTP yok (loglandı)</MenuItem>
            <MenuItem value="failed">Gönderilemedi</MenuItem>
            <MenuItem value="invalid">Doğrulanamadı</MenuItem>
            <MenuItem value="skipped">Atlandı</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Konu"
          value={filters.subject}
          onChange={(e) => setFilter('subject', e.target.value)}
        />
        <TextField
          size="small"
          label="CV dosya / başlık"
          value={filters.cvFileName}
          onChange={(e) => setFilter('cvFileName', e.target.value)}
        />
        <FormControl size="small">
          <InputLabel>Şablon tipi</InputLabel>
          <Select
            label="Şablon tipi"
            value={filters.templateType}
            onChange={(e) => setFilter('templateType', String(e.target.value))}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="cold_email">Cold mail</MenuItem>
            <MenuItem value="cover_letter">Kapak mektubu</MenuItem>
            <MenuItem value="linkedin">LinkedIn</MenuItem>
            <MenuItem value="none">Şablon yok</MenuItem>
            <MenuItem value="ai_error">AI hata</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Başlangıç tarihi"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
        />
        <TextField
          size="small"
          label="Bitiş tarihi"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterAltOffIcon />}
            disabled={activeFilterCount === 0 && !filters.domain}
            onClick={() =>
              setFilters({
                ...EMPTY_FILTERS,
                domain: focusDomain || '',
              })
            }
          >
            Temizle{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {filtered.length} firma
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && companies.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Henüz kayıt yok. Company-based CV editöründen mail gönderdiğinizde burada
          listelenir.
        </Alert>
      )}

      {!loading && !error && companies.length > 0 && filtered.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Filtrelere uyan kayıt yok. Filtreleri temizleyip tekrar deneyin.
        </Alert>
      )}

      <Stack spacing={2}>
        {pagedCompanies.map((company) => (
          <Accordion
            key={company.domain}
            defaultExpanded={company.domain === focusDomain}
            sx={{
              borderRadius: 3,
              border: `1px solid ${
                company.domain === focusDomain
                  ? colors.secondary
                  : colors.outlineVariant
              }`,
              boxShadow: 'none',
              '&:before': { display: 'none' },
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                  width: '100%',
                  pr: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <Typography fontWeight={700}>
                    {company.companyName || company.domain}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{company.domain} · Son: {formatDateTime(company.lastSentAt)}
                  </Typography>
                </Box>
                <Chip size="small" label={`${company.totalAttempts} deneme`} />
                <Chip
                  size="small"
                  color="success"
                  label={`${company.successCount} başarılı`}
                />
                {company.partialCount > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`${company.partialCount} kısmi`}
                  />
                )}
                {company.failedCount > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`${company.failedCount} başarısız`}
                  />
                )}
                {company.aiErrorCount > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label={`${company.aiErrorCount} AI hata`}
                  />
                )}
                <Chip
                  size="small"
                  color={statusColor(company.lastStatus)}
                  label={`Son: ${statusLabel(company.lastStatus)}`}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {company.logs.map((log) => (
                  <Box
                    key={log.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${colors.outlineVariant}`,
                      bgcolor: colors.surfaceContainerLow,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Chip
                        size="small"
                        color={statusColor(log.status)}
                        label={statusLabel(log.status)}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        Gönderim saati: {formatDateTime(log.sentAt)}
                      </Typography>
                      {log.targetPosition && (
                        <Chip size="small" label={`Pozisyon: ${log.targetPosition}`} />
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          log.templateType === 'linkedin'
                            ? 'LinkedIn şablonu'
                            : log.templateType === 'cover_letter'
                              ? 'Kapak mektubu'
                              : log.templateType === 'ai_error' || log.templateType === 'none'
                                ? 'Şablon yok'
                                : log.templateType
                        }
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>CV:</strong>{' '}
                      {log.cvTitle || log.cvFileName || '—'}
                    </Typography>
                    {log.subject && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Konu:</strong> {log.subject}
                      </Typography>
                    )}
                    {log.errorMessage && (
                      <Alert
                        severity={log.status === 'verify_failed' ? 'warning' : 'error'}
                        sx={{ my: 1, borderRadius: 2 }}
                      >
                        {log.errorMessage}
                      </Alert>
                    )}

                    {log.verification?.enabled && (
                      <Box sx={{ my: 1.5 }}>
                        <Typography fontWeight={600} fontSize="0.875rem" sx={{ mb: 0.75 }}>
                          Doğrulama özeti · {formatDateTime(log.sentAt)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                          <Chip
                            size="small"
                            color={log.verification.mxOk ? 'success' : 'error'}
                            label={log.verification.mxOk ? 'MX: var' : 'MX: yok'}
                          />
                          {log.verification.provider && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Seçilen API: ${verifyProviderLabel(log.verification.provider)}`}
                            />
                          )}
                          {(log.verification.selectedEmails?.length
                            ? log.verification.selectedEmails
                            : log.verification.selectedEmail
                              ? [log.verification.selectedEmail]
                              : []
                          ).map((email) => (
                            <Chip
                              key={`sent-${log.id}-${email}`}
                              size="small"
                              color="success"
                              label={`Mail giden: ${email}`}
                              sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                            />
                          ))}
                          {log.verification.warning && (
                            <Chip
                              size="small"
                              color="warning"
                              label={log.verification.warning}
                            />
                          )}
                        </Box>

                        {(log.verification.checks?.length ?? 0) > 0 && (
                          <Table size="small" sx={{ mb: 1 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Aday e-posta</TableCell>
                                <TableCell>Doğrulama API</TableCell>
                                <TableCell>API sonucu</TableCell>
                                <TableCell>Geçerli mi?</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {log.verification.checks!.map((c) => (
                                <TableRow key={`${log.id}-check-${c.email}`}>
                                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    {c.email}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>
                                    {verifyProviderLabel(c.provider)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>
                                    {verifyResultLabel(c.result)}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      color={c.isValid ? 'success' : 'default'}
                                      label={c.isValid ? 'Evet' : 'Hayır'}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    )}

                    {log.recipients.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography fontWeight={600} fontSize="0.875rem" sx={{ mb: 0.75 }}>
                          Mail gönderim sonuçları · {formatDateTime(log.sentAt)}
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Alıcı</TableCell>
                              <TableCell>Mail durumu</TableCell>
                              <TableCell>Doğrulama API</TableCell>
                              <TableCell>API sonucu</TableCell>
                              <TableCell>Detay</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {log.recipients.map((r) => (
                              <TableRow key={`${log.id}-${r.email}`}>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                  {r.email}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={recipientStatusColor(r.status)}
                                    label={recipientStatusLabel(r.status)}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>
                                  {verifyProviderLabel(r.verifyProvider)}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>
                                  {verifyResultLabel(r.verifyResult)}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>
                                  {r.errorMessage || '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}

                    {log.bodyText && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 1.5,
                          whiteSpace: 'pre-wrap',
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {log.bodyText.slice(0, 600)}
                        {log.bodyText.length > 600 ? '…' : ''}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
        {filtered.length > 0 ? <ListTablePagination {...tablePaginationProps} /> : null}
      </Stack>
    </Box>
  );
}
