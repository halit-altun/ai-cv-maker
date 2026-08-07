'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  COMPANY_PAGE_TYPE_OPTIONS,
  type CompanyPageType,
} from '@/features/company-cv-optimizer/constants/outreachConstants';
import { GlassCard } from '@/features/company-cv-optimizer/components/shell/GlassCard';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import {
  listOutreachProjectsRequest,
  selectOutreachProjectRequest,
  type OutreachProject,
} from '@/lib/projects/api';
import {
  createTodoItemsRequest,
  deleteTodoItemRequest,
  deleteTodoProjectCvRequest,
  getTodoProjectCvRequest,
  listTodoItemsRequest,
  uploadTodoProjectCvRequest,
  type TodoApplicationItem,
  type TodoProjectCvMeta,
} from '@/lib/todo-applications/api';
import { fileToBase64 } from '@/lib/outreach/api';
import { todoApplicationsCopy } from '../constants/copy';
import { TodoCompanyResultsPanel } from './TodoCompanyResultsPanel';

type DraftRow = {
  key: string;
  companyUrl: string;
  pageType: CompanyPageType;
  pageTypeOther: string;
  emailDomainInput: string;
  companyName: string;
};

function emptyDraft(): DraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    companyUrl: '',
    pageType: 'careers',
    pageTypeOther: '',
    emailDomainInput: '',
    companyName: '',
  };
}

export function TodoProjectDetailView() {
  const { colors, fonts } = dashboardTokens;
  const params = useParams();
  const router = useRouter();
  const projectId = String(params?.projectId || '');

  const [project, setProject] = useState<OutreachProject | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [items, setItems] = useState<TodoApplicationItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [cvMeta, setCvMeta] = useState<TodoProjectCvMeta | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const loadMeta = useCallback(async () => {
    if (!projectId) return;
    setLoadingMeta(true);
    setError(null);
    try {
      const result = await listOutreachProjectsRequest();
      const found = result.projects.find((p) => p.id === projectId) || null;
      if (!found) {
        setError('Proje bulunamadı.');
        setProject(null);
        return;
      }
      setProject(found);
      await selectOutreachProjectRequest(projectId).catch(() => undefined);
      const cv = await getTodoProjectCvRequest(projectId);
      setCvMeta(cv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje yüklenemedi.');
    } finally {
      setLoadingMeta(false);
    }
  }, [projectId]);

  const loadItems = useCallback(async () => {
    if (!projectId) return;
    setItemsLoading(true);
    try {
      setItems(await listTodoItemsRequest(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firma listesi alınamadı.');
    } finally {
      setItemsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (project) void loadItems();
  }, [project, loadItems]);

  const updateDraft = (key: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  const handleSaveDrafts = async () => {
    if (!projectId) return;
    const valid = drafts
      .map((d) => ({
        companyUrl: d.companyUrl.trim(),
        pageType: d.pageType,
        pageTypeOther: d.pageTypeOther.trim(),
        emailDomainInput: d.emailDomainInput.trim().toLowerCase(),
        companyName: d.companyName.trim(),
      }))
      .filter((d) => d.companyUrl && d.emailDomainInput);

    if (!valid.length) {
      setError('En az bir satırda şirket URL ve ana domain gerekli.');
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await createTodoItemsRequest(projectId, valid);
      setDrafts([emptyDraft()]);
      setInfo(`${valid.length} firma satırı kaydedildi.`);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteTodoItemRequest(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.');
    }
  };

  const handleCvUpload = async (file: File | null) => {
    if (!file || !projectId) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Yalnızca PDF CV yükleyebilirsiniz.');
      return;
    }
    setCvUploading(true);
    setError(null);
    setInfo(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const cv = await uploadTodoProjectCvRequest(projectId, {
        filename: file.name,
        contentBase64,
        contentType: 'application/pdf',
        cvTitle: file.name,
      });
      setCvMeta(cv);
      setInfo(`CV kaydedildi: ${cv.cvFileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CV yüklenemedi.');
    } finally {
      setCvUploading(false);
    }
  };

  const handleCvRemove = async () => {
    if (!projectId) return;
    setCvUploading(true);
    try {
      setCvMeta(await deleteTodoProjectCvRequest(projectId));
      setInfo('Proje CV’si kaldırıldı.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CV silinemedi.');
    } finally {
      setCvUploading(false);
    }
  };

  if (loadingMeta) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: 2 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error || 'Proje bulunamadı.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(appRoutes.todoApplications)}
          sx={{ textTransform: 'none' }}
        >
          Proje listesine dön
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(appRoutes.todoApplications)}
        sx={{ textTransform: 'none', mb: 2 }}
      >
        Projeler
      </Button>

      <Typography sx={{ fontFamily: fonts.display, fontSize: '1.75rem', fontWeight: 700 }}>
        {project.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        {todoApplicationsCopy.detailSubtitle}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Firmalar & CV" sx={{ textTransform: 'none' }} />
        <Tab label="Sonuçlar & detay" sx={{ textTransform: 'none' }} />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      {tab === 1 ? (
        <TodoCompanyResultsPanel projectId={projectId} />
      ) : (
      <Stack spacing={3}>
        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Proje CV’si
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bulk başvuru bu CV üzerinden firmaya göre uyarlama yapıp gönderir. Analiz burada
            başlatılmaz.
          </Typography>
          {cvMeta?.hasCv ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${colors.outlineVariant}`,
                bgcolor: colors.surfaceContainerLow,
              }}
            >
              <Box>
                <Typography fontWeight={600} fontSize={14}>
                  {cvMeta.cvFileName || 'CV.pdf'}
                </Typography>
                {cvMeta.uploadedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Yükleme: {new Date(cvMeta.uploadedAt).toLocaleString('tr-TR')}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button component="label" size="small" disabled={cvUploading} sx={{ textTransform: 'none' }}>
                  Değiştir
                  <input
                    type="file"
                    hidden
                    accept="application/pdf,.pdf"
                    onChange={(e) => void handleCvUpload(e.target.files?.[0] || null)}
                  />
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={cvUploading}
                  onClick={() => void handleCvRemove()}
                  sx={{ textTransform: 'none' }}
                >
                  Kaldır
                </Button>
              </Box>
            </Box>
          ) : (
            <Button
              variant="outlined"
              component="label"
              disabled={cvUploading}
              sx={{ textTransform: 'none' }}
            >
              {cvUploading ? 'Yükleniyor…' : 'CV PDF yükle'}
              <input
                type="file"
                hidden
                accept="application/pdf,.pdf"
                onChange={(e) => void handleCvUpload(e.target.files?.[0] || null)}
              />
            </Button>
          )}
        </GlassCard>

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
              Firma satırları
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
              sx={{ textTransform: 'none' }}
            >
              Satır ekle
            </Button>
          </Box>

          <Stack spacing={2}>
            {drafts.map((draft, index) => (
              <Box
                key={draft.key}
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                  }}
                >
                  <Typography fontWeight={600} fontSize={14}>
                    Yeni #{index + 1}
                  </Typography>
                  {drafts.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() =>
                        setDrafts((prev) => prev.filter((d) => d.key !== draft.key))
                      }
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    label="Şirket URL"
                    placeholder="https://firma.com/careers"
                    value={draft.companyUrl}
                    onChange={(e) => updateDraft(draft.key, { companyUrl: e.target.value })}
                    fullWidth
                  />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.5,
                    }}
                  >
                    <FormControl size="small" fullWidth>
                      <InputLabel>Sayfa tipi</InputLabel>
                      <Select
                        label="Sayfa tipi"
                        value={draft.pageType}
                        onChange={(e) =>
                          updateDraft(draft.key, {
                            pageType: e.target.value as CompanyPageType,
                          })
                        }
                      >
                        {COMPANY_PAGE_TYPE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Ana domain / e-posta"
                      placeholder="ik@firma.com veya firma.com"
                      value={draft.emailDomainInput}
                      onChange={(e) =>
                        updateDraft(draft.key, { emailDomainInput: e.target.value })
                      }
                      fullWidth
                    />
                  </Box>
                  {draft.pageType === 'other' && (
                    <TextField
                      size="small"
                      label="Diğer sayfa tipi"
                      value={draft.pageTypeOther}
                      onChange={(e) =>
                        updateDraft(draft.key, { pageTypeOther: e.target.value })
                      }
                      fullWidth
                    />
                  )}
                  <TextField
                    size="small"
                    label="Şirket adı (opsiyonel)"
                    value={draft.companyName}
                    onChange={(e) =>
                      updateDraft(draft.key, { companyName: e.target.value })
                    }
                    fullWidth
                  />
                </Stack>
              </Box>
            ))}
          </Stack>

          <Button
            variant="contained"
            onClick={() => void handleSaveDrafts()}
            disabled={saving}
            sx={{ mt: 2, textTransform: 'none' }}
          >
            {saving ? 'Kaydediliyor…' : 'Satırları kaydet'}
          </Button>
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 2 }}>
            Kayıtlı firmalar {itemsLoading ? '…' : `(${items.length})`}
          </Typography>
          {!items.length ? (
            <Typography variant="body2" color="text.secondary">
              Bu projede henüz firma yok.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${colors.outlineVariant}`,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize={14} noWrap>
                      {item.companyName || item.emailDomainInput}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {item.companyUrl}
                    </Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label={item.pageType} />
                      <Chip
                        size="small"
                        label={item.emailDomainInput}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => void handleDeleteItem(item.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </GlassCard>

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Analiz ve gönderim için{' '}
          <Link href={appRoutes.aiOptimizerBulk} style={{ color: colors.secondary }}>
            Toplu başvuru
          </Link>{' '}
          sayfasını kullanın. Bulk, buradaki proje CV’sini kullanır. Sonuçlar sekmesinde cold
          mail, uyarlama notları ve açılma detaylarını görebilirsiniz.
        </Alert>
      </Stack>
      )}
    </Box>
  );
}
