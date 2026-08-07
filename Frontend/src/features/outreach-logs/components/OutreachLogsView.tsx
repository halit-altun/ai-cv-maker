'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import { useSearchParams } from 'next/navigation';
import {
  listOutreachCompaniesRequest,
  type OutreachCompanyGroup,
} from '@/lib/outreach/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

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
    second: '2-digit',
  });
}

function verifyProviderLabel(provider?: string): string {
  const p = String(provider || '').toLowerCase();
  switch (p) {
    case 'reacher':
      return 'Reacher API';
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

export function OutreachLogsView() {
  const { colors, fonts } = dashboardTokens;
  const searchParams = useSearchParams();
  const focusDomain = (searchParams.get('domain') || '').toLowerCase();

  const [companies, setCompanies] = useState<OutreachCompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sorted = useMemo(() => {
    if (!focusDomain) return companies;
    return [...companies].sort((a, b) => {
      if (a.domain === focusDomain) return -1;
      if (b.domain === focusDomain) return 1;
      return 0;
    });
  }, [companies, focusDomain]);

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

      {!loading && !error && sorted.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Henüz kayıt yok. Company-based CV editöründen mail gönderdiğinizde burada
          listelenir.
        </Alert>
      )}

      <Stack spacing={2}>
        {sorted.map((company) => (
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
      </Stack>
    </Box>
  );
}
