'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  createOutreachProjectRequest,
  deleteOutreachProjectCompanyRequest,
  deleteOutreachProjectLogRequest,
  deleteOutreachProjectRequest,
  getOutreachProjectDashboardRequest,
  listOutreachProjectsRequest,
  selectOutreachProjectRequest,
  type OutreachProject,
  type ProjectDashboard,
  type ProjectDashboardRange,
} from '@/lib/projects/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { ListTablePagination, useListPagination } from '@/shared/list-pagination';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('tr-TR');
  } catch {
    return String(value);
  }
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'Mail başarılı';
    case 'partial':
      return 'Mail kısmi';
    case 'failed':
      return 'Mail başarısız';
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

function rangeLabel(
  preset: string,
  from?: string | null,
  to?: string | null
): string {
  switch (preset) {
    case 'today':
      return 'Bugün';
    case 'yesterday':
      return 'Dün';
    case 'custom':
      return from && to ? `${from} → ${to}` : 'Özel aralık';
    case 'all':
    default:
      return 'Tüm zamanlar';
  }
}

export function OutreachProjectsView() {
  const { colors, fonts } = dashboardTokens;
  const [projects, setProjects] = useState<OutreachProject[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [companyDeleteTarget, setCompanyDeleteTarget] = useState<{
    domain: string;
    companyName: string;
  } | null>(null);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [logDeleteTarget, setLogDeleteTarget] = useState<{
    logId: string;
    companyName: string;
    domain: string;
    status: string;
    sentAt?: string;
  } | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  const [rangePreset, setRangePreset] = useState<ProjectDashboardRange>('today');
  const todayYmd = useMemo(() => formatYmd(new Date()), []);
  const [customFrom, setCustomFrom] = useState(todayYmd);
  const [customTo, setCustomTo] = useState(todayYmd);
  const [companySearch, setCompanySearch] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listOutreachProjectsRequest();
      setProjects(result.projects);
      const nextId = result.lastSelectedId || result.projects[0]?.id || '';
      setSelectedId(nextId);
      return nextId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projeler yüklenemedi.');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(
    async (
      projectId: string,
      preset: ProjectDashboardRange = rangePreset,
      from = customFrom,
      to = customTo
    ) => {
      if (!projectId) {
        setDashboard(null);
        return;
      }
      if (preset === 'custom' && !from) {
        setError('Özel aralık için başlangıç tarihi seçin.');
        return;
      }
      setDashLoading(true);
      setError(null);
      try {
        const data = await getOutreachProjectDashboardRequest(projectId, {
          range: preset,
          from: preset === 'custom' ? from : undefined,
          to: preset === 'custom' ? to || from : undefined,
        });
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Proje özeti alınamadı.');
        setDashboard(null);
      } finally {
        setDashLoading(false);
      }
    },
    [rangePreset, customFrom, customTo]
  );

  useEffect(() => {
    void (async () => {
      const id = await loadProjects();
      if (id) await loadDashboard(id, 'today');
    })();
    // İlk yükleme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProjects]);

  const handleSelectProject = async (projectId: string) => {
    setSelectedId(projectId);
    setCompanySearch('');
    if (!projectId) {
      setDashboard(null);
      return;
    }
    try {
      await selectOutreachProjectRequest(projectId);
      const refreshed = await listOutreachProjectsRequest();
      setProjects(refreshed.projects);
    } catch {
      // seçim hatası — dashboard yine yüklensin
    }
    await loadDashboard(projectId);
  };

  const handleRangeChange = async (
    _e: React.MouseEvent<HTMLElement>,
    next: ProjectDashboardRange | null
  ) => {
    if (!next) return;
    setRangePreset(next);
    if (next !== 'custom' && selectedId) {
      await loadDashboard(selectedId, next);
    }
  };

  const handleApplyCustomRange = async () => {
    if (!selectedId) return;
    setRangePreset('custom');
    await loadDashboard(selectedId, 'custom', customFrom, customTo);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createOutreachProjectRequest(name);
      setCreateOpen(false);
      setNewName('');
      await loadProjects();
      await handleSelectProject(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteOutreachProjectRequest(selectedId);
      setDeleteOpen(false);
      setDashboard(null);
      const nextId = await loadProjects();
      if (nextId) {
        await handleSelectProject(nextId);
      } else {
        setSelectedId('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje silinemedi.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedId || !companyDeleteTarget?.domain) return;
    setDeletingCompany(true);
    setError(null);
    try {
      await deleteOutreachProjectCompanyRequest(selectedId, companyDeleteTarget.domain);
      setCompanyDeleteTarget(null);
      await loadDashboard(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firma silinemedi.');
    } finally {
      setDeletingCompany(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!selectedId || !logDeleteTarget?.logId) return;
    setDeletingLog(true);
    setError(null);
    try {
      await deleteOutreachProjectLogRequest(selectedId, logDeleteTarget.logId);
      setLogDeleteTarget(null);
      await loadDashboard(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt silinemedi.');
    } finally {
      setDeletingLog(false);
    }
  };

  const selectedProjectName =
    projects.find((p) => p.id === selectedId)?.name || dashboard?.project?.name || '';

  const totals = dashboard?.totals;
  const activeRange = dashboard?.dateRange;
  const periodText = rangeLabel(
    activeRange?.preset || rangePreset,
    activeRange?.from,
    activeRange?.to
  );

  const filteredCompanies = useMemo(() => {
    const list = dashboard?.companies || [];
    const q = companySearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const name = String(c.companyName || '').toLowerCase();
      const domain = String(c.domain || '').toLowerCase();
      return name.includes(q) || domain.includes(q);
    });
  }, [dashboard?.companies, companySearch]);

  const { pageItems: pagedCompanies, tablePaginationProps: companyPagination } =
    useListPagination(filteredCompanies, [companySearch, selectedId, rangePreset]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 0 }, py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <FolderSpecialIcon sx={{ color: colors.secondary }} />
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.5rem' }}>
          Outreach Projeleri
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Company-based analiz ve mail gönderimlerini proje bazında (ör. DUBAI) takip edin.
        Projesiz yapılan işlemler burada görünmez.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="project-select-label">Proje</InputLabel>
          <Select
            labelId="project-select-label"
            label="Proje"
            value={selectedId}
            disabled={loading}
            onChange={(e) => void handleSelectProject(String(e.target.value))}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none' }}>
          Yeni proje
        </Button>
        <Button
          color="error"
          variant="outlined"
          startIcon={deleting ? <CircularProgress size={14} /> : <DeleteOutlineIcon />}
          disabled={!selectedId || deleting || loading}
          onClick={() => setDeleteOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Projeyi sil
        </Button>
        <Button
          startIcon={dashLoading ? <CircularProgress size={14} /> : <RefreshIcon />}
          disabled={!selectedId || dashLoading}
          onClick={() => void loadDashboard(selectedId)}
          sx={{ textTransform: 'none' }}
        >
          Yenile
        </Button>
      </Stack>

      <Stack spacing={1.25} sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Zaman aralığı
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={rangePreset}
          onChange={handleRangeChange}
          disabled={!selectedId || dashLoading}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="today" sx={{ textTransform: 'none', px: 1.5 }}>
            Bugün
          </ToggleButton>
          <ToggleButton value="yesterday" sx={{ textTransform: 'none', px: 1.5 }}>
            Dün
          </ToggleButton>
          <ToggleButton value="custom" sx={{ textTransform: 'none', px: 1.5 }}>
            Özel aralık
          </ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none', px: 1.5 }}>
            Tümü
          </ToggleButton>
        </ToggleButtonGroup>

        {rangePreset === 'custom' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              size="small"
              type="date"
              label="Başlangıç"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={dashLoading}
            />
            <TextField
              size="small"
              type="date"
              label="Bitiş"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={dashLoading}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!selectedId || dashLoading || !customFrom}
              onClick={() => void handleApplyCustomRange()}
              sx={{ textTransform: 'none' }}
            >
              Uygula
            </Button>
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary">
          Seçili dönem: <strong>{periodText}</strong>
          {totals ? ` · ${totals.logCount} kayıt` : ''}
        </Typography>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && selectedId && totals && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {[
              {
                label: 'Toplam başvuru',
                value: totals.totalApplications ?? totals.mailAttemptCount,
              },
              { label: 'Gönderilen mail', value: totals.totalMailsSent },
              { label: 'Toplam firma', value: totals.companiesTotal },
              { label: 'Mail atılan firma', value: totals.companiesWithMail },
              { label: 'Sadece analiz (firma)', value: totals.companiesAnalysisOnly },
              { label: 'Analiz kaydı', value: totals.analysisOnlyCount },
              { label: 'Doğrulanan adres', value: totals.uniqueVerifiedEmails },
              { label: 'Doğrulanamayan', value: totals.uniqueInvalidEmails },
              { label: 'Benzersiz giden', value: totals.uniqueSentEmails },
              { label: 'Doğrulama fail', value: totals.verifyFailedCount },
              { label: 'Başarısız mail', value: totals.totalMailsFailed },
              { label: 'AI hata', value: totals.aiErrorCount },
            ].map((card) => (
              <Box
                key={card.label}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${colors.outlineVariant}`,
                  bgcolor: colors.surfaceContainerLow,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography fontWeight={700} fontSize="1.25rem">
                  {card.value}
                </Typography>
              </Box>
            ))}
          </Box>

          {dashLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : dashboard!.companies.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Seçili dönemde ({periodText}) bu projede kayıt yok.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                label="Şirket adına göre ara"
                placeholder="Örn. Quorum, buytech…"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                sx={{ mb: 0.5 }}
              />
              {companySearch.trim() && (
                <Typography variant="caption" color="text.secondary">
                  {filteredCompanies.length} / {dashboard!.companies.length} firma
                </Typography>
              )}
              {filteredCompanies.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  “{companySearch.trim()}” ile eşleşen şirket yok.
                </Alert>
              ) : (
                <>
                {pagedCompanies.map((company) => (
                <Accordion
                  key={company.domain}
                  disableGutters
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${colors.outlineVariant}`,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                        width: '100%',
                        pr: 1,
                      }}
                    >
                      <Typography fontWeight={700}>
                        {company.companyName || company.domain}
                      </Typography>
                      <Chip size="small" label={`@${company.domain}`} sx={{ fontFamily: 'monospace' }} />
                      {company.hasMailSent && (
                        <Chip size="small" color="success" label="Mail atıldı" />
                      )}
                      {company.hasAnalysisOnly && !company.hasMailSent && (
                        <Chip size="small" color="info" label="Sadece analiz" />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Son: {formatDateTime(company.lastActivityAt)}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Tooltip title="Firmayı projeden sil">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Firmayı sil"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompanyDeleteTarget({
                              domain: company.domain,
                              companyName: company.companyName || company.domain,
                            });
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(company.sentEmails.length > 0 || company.verifiedEmails.length > 0) && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                        {company.sentEmails.map((e) => (
                          <Chip
                            key={`sent-${e}`}
                            size="small"
                            color="success"
                            label={`Giden: ${e}`}
                            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                          />
                        ))}
                        {company.verifiedEmails
                          .filter((e) => !company.sentEmails.includes(e))
                          .map((e) => (
                            <Chip
                              key={`ver-${e}`}
                              size="small"
                              variant="outlined"
                              label={`Doğrulandı: ${e}`}
                              sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                            />
                          ))}
                      </Box>
                    )}

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Zaman</TableCell>
                          <TableCell>Durum</TableCell>
                          <TableCell>Gönderilen</TableCell>
                          <TableCell>Doğrulanan</TableCell>
                          <TableCell>Detay</TableCell>
                          <TableCell align="right" sx={{ width: 56 }}>
                            Sil
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {company.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                              {formatDateTime(log.sentAt)}
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={statusLabel(log.status)} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {log.sentEmails.length ? log.sentEmails.join(', ') : '—'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {log.verifiedEmails.length ? log.verifiedEmails.join(', ') : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>
                              {log.errorMessage || log.subject || log.targetPosition || '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Bu kaydı sil">
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label="Kaydı sil"
                                  onClick={() =>
                                    setLogDeleteTarget({
                                      logId: log.id,
                                      companyName: company.companyName || company.domain,
                                      domain: company.domain,
                                      status: log.status,
                                      sentAt: log.sentAt,
                                    })
                                  }
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
                ))}
                <ListTablePagination {...companyPagination} />
                </>
              )}
            </Stack>
          )}
        </>
      )}

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)}>
        <DialogTitle>Yeni proje</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Proje adı"
            placeholder="DUBAI"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={creating} onClick={() => setCreateOpen(false)}>
            İptal
          </Button>
          <Button
            variant="contained"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Projeyi sil</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {selectedProjectName
              ? `"${selectedProjectName}" projesini silmek istediğinize emin misiniz? Proje listeden kalkar; geçmiş mail logları saklanır. Aynı isimle sonra yeniden oluşturabilirsiniz.`
              : 'Seçili projeyi silmek istediğinize emin misiniz?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={() => setDeleteOpen(false)}>
            İptal
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting || !selectedId}
            onClick={() => void handleDeleteProject()}
          >
            {deleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(companyDeleteTarget)}
        onClose={() => !deletingCompany && setCompanyDeleteTarget(null)}
      >
        <DialogTitle>Firmayı sil</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {companyDeleteTarget
              ? `"${companyDeleteTarget.companyName}" (@${companyDeleteTarget.domain}) kaydını bu projeden silmek istediğinize emin misiniz? Mail ve analiz kayıtları kalıcı olarak silinir.`
              : 'Firmayı projeden silmek istediğinize emin misiniz?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={deletingCompany} onClick={() => setCompanyDeleteTarget(null)}>
            İptal
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingCompany || !companyDeleteTarget}
            onClick={() => void handleDeleteCompany()}
          >
            {deletingCompany ? 'Siliniyor...' : 'Firmayı sil'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(logDeleteTarget)}
        onClose={() => !deletingLog && setLogDeleteTarget(null)}
      >
        <DialogTitle>Kaydı sil</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {logDeleteTarget
              ? `"${logDeleteTarget.companyName}" (@${logDeleteTarget.domain}) için ${statusLabel(logDeleteTarget.status)} kaydını (${formatDateTime(logDeleteTarget.sentAt)}) silmek istediğinize emin misiniz? Sadece bu satır silinir; diğer tekrarlar kalır.`
              : 'Bu kaydı silmek istediğinize emin misiniz?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={deletingLog} onClick={() => setLogDeleteTarget(null)}>
            İptal
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingLog || !logDeleteTarget}
            onClick={() => void handleDeleteLog()}
          >
            {deletingLog ? 'Siliniyor...' : 'Kaydı sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
