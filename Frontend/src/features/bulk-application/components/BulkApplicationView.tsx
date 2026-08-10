'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { GlassCard } from '@/features/company-cv-optimizer/components/shell/GlassCard';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes, getTodoProjectPath } from '@/features/dashboard/constants/routes';
import {
  EMAIL_PREFIX_CATEGORIES,
  isExclusiveEmailCategory,
  type EmailPrefixCategoryId,
} from '@/features/company-cv-optimizer/constants/outreachConstants';
import {
  listOutreachProjectsRequest,
  selectOutreachProjectRequest,
  type OutreachProject,
} from '@/lib/projects/api';
import {
  cancelTodoJobRequest,
  getTodoJobRequest,
  getTodoProjectCompanyResultsRequest,
  getTodoProjectSummaryRequest,
  listTodoItemsRequest,
  pauseTodoJobRequest,
  resumeTodoJobRequest,
  startTodoJobRequest,
  updateTodoProjectSettingsRequest,
  type TodoApplicationItem,
  type TodoApplicationJob,
  type TodoProjectCvMeta,
  type TodoSendHistoryFilter,
} from '@/lib/todo-applications/api';
import {
  getClientUiPreferencesRequest,
  updateClientUiPreferencesRequest,
  type ClientUiPreferencesPatch,
} from '@/lib/client-preferences/api';
import {
  readClientUiPreferencesLocalCache,
  writeClientUiPreferencesLocalCache,
} from '@/lib/client-preferences/localCache';
import { authFetch } from '@/lib/auth/authFetch';
import { TodoJobStatusPanel } from '@/features/todo-applications';
import Link from 'next/link';
import { bulkApplicationCopy } from '../constants/copy';

type SendHistoryFilter = TodoSendHistoryFilter;

const EMAIL_CATEGORY_IDS = new Set(
  EMAIL_PREFIX_CATEGORIES.map((c) => c.id)
);

function buildPreviouslySentKeys(
  companies: Array<{
    sourceItemId?: string | null;
    emailDomainInput?: string;
    companyUrl?: string;
    sentCount?: number;
    queuedCount?: number;
  }>
): { itemIds: Set<string>; domains: Set<string> } {
  const itemIds = new Set<string>();
  const domains = new Set<string>();
  for (const c of companies) {
    const mailed = (c.sentCount || 0) > 0 || (c.queuedCount || 0) > 0;
    if (!mailed) continue;
    if (c.sourceItemId) itemIds.add(String(c.sourceItemId));
    const domain = String(c.emailDomainInput || '')
      .trim()
      .toLowerCase();
    if (domain) domains.add(domain);
  }
  return { itemIds, domains };
}

function wasPreviouslySent(
  item: TodoApplicationItem,
  sentKeys: { itemIds: Set<string>; domains: Set<string> }
): boolean {
  if (sentKeys.itemIds.has(item.id)) return true;
  const domain = String(item.emailDomainInput || '')
    .trim()
    .toLowerCase();
  return Boolean(domain && sentKeys.domains.has(domain));
}

export function BulkApplicationView() {
  const { colors, fonts } = dashboardTokens;

  const [projects, setProjects] = useState<OutreachProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [items, setItems] = useState<TodoApplicationItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cvMeta, setCvMeta] = useState<TodoProjectCvMeta | null>(null);
  const [sendFilter, setSendFilter] = useState<SendHistoryFilter>('all');
  const [sentKeys, setSentKeys] = useState<{ itemIds: Set<string>; domains: Set<string> }>({
    itemIds: new Set(),
    domains: new Set(),
  });

  const [cvLanguage, setCvLanguage] = useState<'turkish' | 'english'>('turkish');
  const [emailLangMode, setEmailLangMode] = useState<'auto' | 'turkish' | 'english'>('auto');
  const [aiAbout, setAiAbout] = useState(true);
  const [aiExperience, setAiExperience] = useState(true);
  const [aiSkills, setAiSkills] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<EmailPrefixCategoryId[]>([
    'turkey-hiring',
  ]);
  const [customLocals, setCustomLocals] = useState('');
  const [includePrimary, setIncludePrimary] = useState(true);
  const [forceResend, setForceResend] = useState(false);
  const [generateLinkedIn, setGenerateLinkedIn] = useState(false);
  const [includeCvPhoto, setIncludeCvPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  const [activeJob, setActiveJob] = useState<TodoApplicationJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsSkipNextSaveRef = useRef(true);
  const prefsBaselineRef = useRef<string>('');
  const prefsPendingPatchRef = useRef<ClientUiPreferencesPatch | null>(null);
  const prefsDirtyRef = useRef(false);
  const clientFilterRef = useRef<SendHistoryFilter | null>(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const result = await listOutreachProjectsRequest();
      setProjects(result.projects);
      setProjectId(result.lastSelectedId || result.projects[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projeler alınamadı.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (pid: string) => {
    if (!pid) {
      setItems([]);
      setSelectedItemIds([]);
      setActiveJob(null);
      setCvMeta(null);
      setSentKeys({ itemIds: new Set(), domains: new Set() });
      return;
    }
    setItemsLoading(true);
    try {
      const [list, summary, results] = await Promise.all([
        listTodoItemsRequest(pid),
        getTodoProjectSummaryRequest(pid),
        getTodoProjectCompanyResultsRequest(pid, { limit: 30 }),
      ]);
      const keys = buildPreviouslySentKeys(results.companies || []);
      const projectFilter = (summary.cv?.bulkSendHistoryFilter ||
        'all') as SendHistoryFilter;
      const preferred = clientFilterRef.current || projectFilter;
      const filter: SendHistoryFilter = ['all', 'sent', 'unsent'].includes(preferred)
        ? preferred
        : 'all';
      setItems(list);
      setSentKeys(keys);
      setCvMeta(summary.cv || null);
      setActiveJob(summary.activeJob || summary.recentJobs[0] || null);
      setSendFilter(filter);
      const visible =
        filter === 'all'
          ? list
          : list.filter((item) => {
              const sent = wasPreviouslySent(item, keys);
              return filter === 'sent' ? sent : !sent;
            });
      setSelectedItemIds(visible.map((i) => i.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'To Do listesi alınamadı.');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    if (sendFilter === 'all') return items;
    return items.filter((item) => {
      const sent = wasPreviouslySent(item, sentKeys);
      return sendFilter === 'sent' ? sent : !sent;
    });
  }, [items, sendFilter, sentKeys]);

  const sentCount = useMemo(
    () => items.filter((item) => wasPreviouslySent(item, sentKeys)).length,
    [items, sentKeys]
  );
  const unsentCount = items.length - sentCount;

  const applyFilterSelection = useCallback(
    (filter: SendHistoryFilter, list: TodoApplicationItem[], keys: typeof sentKeys) => {
      const visible =
        filter === 'all'
          ? list
          : list.filter((item) => {
              const sent = wasPreviouslySent(item, keys);
              return filter === 'sent' ? sent : !sent;
            });
      setSelectedItemIds(visible.map((i) => i.id));
    },
    []
  );

  const handleSendFilterChange = async (next: SendHistoryFilter) => {
    setSendFilter(next);
    clientFilterRef.current = next;
    applyFilterSelection(next, items, sentKeys);
    if (!projectId) return;
    try {
      const [cv] = await Promise.all([
        updateTodoProjectSettingsRequest(projectId, {
          bulkSendHistoryFilter: next,
        }),
        updateClientUiPreferencesRequest({ bulkSendHistoryFilter: next }),
      ]);
      setCvMeta((prev) => ({
        ...(prev || {
          hasCv: false,
          cvFileName: '',
          cvTitle: '',
        }),
        ...cv,
        bulkSendHistoryFilter: next,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filtre tercihi kaydedilemedi.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const applyPrefs = (prefs: ClientUiPreferencesPatch) => {
      if (prefs.cvLanguage === 'english' || prefs.cvLanguage === 'turkish') {
        setCvLanguage(prefs.cvLanguage);
      }
      if (prefs.outreachEmailLanguageMode !== undefined) {
        setEmailLangMode(
          prefs.outreachEmailLanguageMode === 'turkish' ||
            prefs.outreachEmailLanguageMode === 'english'
            ? prefs.outreachEmailLanguageMode
            : 'auto'
        );
      }
      if (prefs.aiSettings) {
        setAiAbout(prefs.aiSettings.about !== false);
        setAiExperience(Boolean(prefs.aiSettings.workExperience));
        setAiSkills(Boolean(prefs.aiSettings.skills));
      }
      if (prefs.selectedEmailPrefixCategories) {
        const cats = prefs.selectedEmailPrefixCategories.filter(
          (id): id is EmailPrefixCategoryId =>
            EMAIL_CATEGORY_IDS.has(id as EmailPrefixCategoryId)
        );
        setSelectedCategories(cats.length ? cats : ['turkey-hiring']);
      }
      if (prefs.customEmailLocalPartsText !== undefined) {
        setCustomLocals(prefs.customEmailLocalPartsText || '');
      }
      if (prefs.includePrimaryEmailInSend !== undefined) {
        setIncludePrimary(prefs.includePrimaryEmailInSend !== false);
      }
      if (prefs.forceResend !== undefined) {
        setForceResend(Boolean(prefs.forceResend));
      }
      if (prefs.shouldGenerateLinkedInMessage !== undefined) {
        setGenerateLinkedIn(Boolean(prefs.shouldGenerateLinkedInMessage));
      }
      if (prefs.includeCvPhoto !== undefined) {
        setIncludeCvPhoto(Boolean(prefs.includeCvPhoto));
      }
      if (prefs.bulkSendHistoryFilter !== undefined) {
        const filter = prefs.bulkSendHistoryFilter;
        if (filter === 'all' || filter === 'sent' || filter === 'unsent') {
          clientFilterRef.current = filter;
          setSendFilter(filter);
        }
      }
    };

    void (async () => {
      try {
        const prefs = await getClientUiPreferencesRequest();
        if (cancelled) return;
        applyPrefs(prefs);
        writeClientUiPreferencesLocalCache(prefs);
      } catch (err) {
        console.warn('Client tercihleri yüklenemedi:', err);
        const local = readClientUiPreferencesLocalCache();
        if (local && !cancelled) applyPrefs(local);
      } finally {
        if (!cancelled) {
          prefsSkipNextSaveRef.current = true;
          setPrefsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: { profileImageUrl?: string };
        };
        if (cancelled || !res.ok || !data.user) return;
        setProfilePhotoUrl(String(data.user.profileImageUrl || '').trim());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsReady) return;

    const flushPrefs = (patch: ClientUiPreferencesPatch, serialized: string) => {
      prefsBaselineRef.current = serialized;
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      writeClientUiPreferencesLocalCache(patch);
      void updateClientUiPreferencesRequest(patch).catch((err) => {
        console.warn('Client tercihleri kaydedilemedi:', err);
      });
    };

    const patch: ClientUiPreferencesPatch = {
      cvLanguage,
      outreachEmailLanguageMode: emailLangMode,
      aiSettings: {
        about: aiAbout,
        workExperience: aiExperience,
        skills: aiSkills,
      },
      selectedEmailPrefixCategories: selectedCategories,
      customEmailLocalPartsText: customLocals,
      includePrimaryEmailInSend: includePrimary,
      forceResend,
      shouldGenerateLinkedInMessage: generateLinkedIn,
      includeCvPhoto,
      bulkSendHistoryFilter: sendFilter,
    };
    const serialized = JSON.stringify(patch);
    if (prefsSkipNextSaveRef.current) {
      prefsSkipNextSaveRef.current = false;
      prefsBaselineRef.current = serialized;
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      return;
    }
    if (serialized === prefsBaselineRef.current) return;

    prefsPendingPatchRef.current = patch;
    prefsDirtyRef.current = true;
    if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    prefsSaveTimerRef.current = setTimeout(() => {
      flushPrefs(patch, serialized);
    }, 250);

    return () => {
      if (prefsSaveTimerRef.current) {
        clearTimeout(prefsSaveTimerRef.current);
        prefsSaveTimerRef.current = null;
      }
    };
  }, [
    prefsReady,
    cvLanguage,
    emailLangMode,
    aiAbout,
    aiExperience,
    aiSkills,
    selectedCategories,
    customLocals,
    includePrimary,
    forceResend,
    generateLinkedIn,
    includeCvPhoto,
    sendFilter,
  ]);

  useEffect(() => {
    const flushPending = () => {
      if (!prefsDirtyRef.current || !prefsPendingPatchRef.current) return;
      const patch = prefsPendingPatchRef.current;
      prefsBaselineRef.current = JSON.stringify(patch);
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      writeClientUiPreferencesLocalCache(patch);
      void updateClientUiPreferencesRequest(patch).catch(() => undefined);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', onHide);
      flushPending();
    };
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId || !prefsReady) return;
    void loadItems(projectId);
  }, [projectId, prefsReady, loadItems]);

  const refreshJob = useCallback(
    async (jobId?: string) => {
      const id = jobId || activeJob?.id;
      if (!id) return;
      setJobLoading(true);
      try {
        setActiveJob(await getTodoJobRequest(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'İş detayı alınamadı.');
      } finally {
        setJobLoading(false);
      }
    },
    [activeJob?.id]
  );

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const shouldPoll =
      activeJob &&
      (activeJob.status === 'pending' ||
        activeJob.status === 'running' ||
        activeJob.status === 'paused');
    if (!shouldPoll || !activeJob?.id) return;

    pollRef.current = setInterval(() => {
      void refreshJob(activeJob.id);
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeJob?.id, activeJob?.status, refreshJob]);

  const toggleCategory = (id: EmailPrefixCategoryId) => {
    setSelectedCategories((prev) => {
      if (isExclusiveEmailCategory(id)) {
        return prev.includes(id) ? [] : [id];
      }
      const withoutExclusive = prev.filter((x) => !isExclusiveEmailCategory(x));
      return withoutExclusive.includes(id)
        ? withoutExclusive.filter((x) => x !== id)
        : [...withoutExclusive, id];
    });
  };

  const handleStart = async () => {
    if (!projectId) {
      setError('Proje seçimi zorunlu.');
      return;
    }
    if (!cvMeta?.hasCv) {
      setError('Önce To Do proje detayında CV yükleyin.');
      return;
    }
    if (!selectedItemIds.length) {
      setError('En az bir firma seçin.');
      return;
    }
    if (!selectedCategories.length && !customLocals.trim()) {
      setError('En az bir e-posta kategori seçin.');
      return;
    }

    setStarting(true);
    setError(null);
    setInfo(null);
    try {
      const job = await startTodoJobRequest({
        projectId,
        mode: 'analyze_and_send',
        itemIds: selectedItemIds,
        cvLanguage,
        outreachEmailLanguageMode: emailLangMode,
        aiSettings: {
          about: aiAbout,
          workExperience: aiExperience,
          skills: aiSkills,
        },
        selectedEmailPrefixCategories: selectedCategories,
        customEmailLocalPartsText: customLocals,
        includePrimaryEmailInSend: includePrimary,
        forceResend,
        shouldGenerateLinkedInMessage: generateLinkedIn,
        includeCvPhoto: includeCvPhoto && Boolean(profilePhotoUrl),
        profileImageUrl: profilePhotoUrl || undefined,
        sendMail: true,
      });
      setActiveJob(job);
      setInfo(
        'Toplu başvuru başladı. Proje CV’si ile sırayla uyarlanıp gönderilecek. Sayfa kapansa da devam eder.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İş başlatılamadı.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <DynamicFeedIcon sx={{ color: colors.secondary }} />
        <Typography sx={{ fontFamily: fonts.display, fontSize: '1.75rem', fontWeight: 700 }}>
          {bulkApplicationCopy.title}
        </Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 1, maxWidth: 760 }}>
        {bulkApplicationCopy.subtitle}
      </Typography>
      <Button
        component={Link}
        href={projectId ? getTodoProjectPath(projectId) : appRoutes.todoApplications}
        size="small"
        sx={{ textTransform: 'none', mb: 3 }}
      >
        To Do proje detayına git →
      </Button>

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

      <Stack spacing={3}>
        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 2 }}>
            Proje
          </Typography>
          <FormControl fullWidth size="small" disabled={projectsLoading}>
            <InputLabel>Outreach projesi</InputLabel>
            <Select
              label="Outreach projesi"
              value={projectId}
              onChange={(e) => {
                const id = String(e.target.value);
                setProjectId(id);
                if (id) void selectOutreachProjectRequest(id).catch(() => undefined);
              }}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Proje CV’si
          </Typography>
          {cvMeta?.hasCv ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Kullanılacak CV: <strong>{cvMeta.cvFileName}</strong>
              {cvMeta.uploadedAt
                ? ` · ${new Date(cvMeta.uploadedAt).toLocaleString('tr-TR')}`
                : ''}
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Bu projede CV yok.{' '}
              <Link
                href={projectId ? getTodoProjectPath(projectId) : appRoutes.todoApplications}
                style={{ color: colors.secondary }}
              >
                To Do detayından CV yükleyin
              </Link>
              .
            </Alert>
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            To Do firma listesi
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {itemsLoading
              ? 'Yükleniyor…'
              : `${filteredItems.length} görünür · ${selectedItemIds.length} seçili · toplam ${items.length}`}
          </Typography>

          {!items.length ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Bu projede To Do kaydı yok. Önce{' '}
              <Link
                href={projectId ? getTodoProjectPath(projectId) : appRoutes.todoApplications}
              >
                proje detayına
              </Link>{' '}
              firma ekleyin.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Gönderim filtresi</InputLabel>
                <Select
                  label="Gönderim filtresi"
                  value={sendFilter}
                  onChange={(e) =>
                    void handleSendFilterChange(e.target.value as SendHistoryFilter)
                  }
                >
                  <MenuItem value="all">Hepsi ({items.length})</MenuItem>
                  <MenuItem value="sent">
                    Daha önce gönderilenler ({sentCount})
                  </MenuItem>
                  <MenuItem value="unsent">
                    Daha önce gönderilmeyenler ({unsentCount})
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Firmalar</InputLabel>
                <Select
                  multiple
                  label="Firmalar"
                  value={selectedItemIds}
                  onChange={(e) =>
                    setSelectedItemIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                  input={<OutlinedInput label="Firmalar" />}
                  renderValue={(selected) =>
                    `${selected.length} / ${filteredItems.length} seçili`
                  }
                >
                  {filteredItems.map((item) => {
                    const previouslySent = wasPreviouslySent(item, sentKeys);
                    return (
                      <MenuItem key={item.id} value={item.id}>
                        <Checkbox checked={selectedItemIds.includes(item.id)} />
                        <ListItemText
                          primary={item.companyName || item.emailDomainInput}
                          secondary={
                            previouslySent
                              ? `${item.companyUrl} · daha önce gönderildi`
                              : item.companyUrl
                          }
                        />
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {sendFilter === 'sent' && selectedItemIds.length > 0 && !forceResend && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Daha önce gönderilen firmalara tekrar mail için aşağıda “Bu domain’e daha
                  önce mail atıldıysa yine de gönder (force)” seçeneğini açmanız gerekebilir.
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => setSelectedItemIds(filteredItems.map((i) => i.id))}
                >
                  Görünenleri seç
                </Button>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => setSelectedItemIds([])}
                >
                  Temizle
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {filteredItems
                  .filter((i) => selectedItemIds.includes(i.id))
                  .slice(0, 20)
                  .map((item) => (
                    <Chip
                      key={item.id}
                      size="small"
                      color={wasPreviouslySent(item, sentKeys) ? 'warning' : 'default'}
                      label={item.companyName || item.emailDomainInput}
                      onDelete={() =>
                        setSelectedItemIds((prev) => prev.filter((id) => id !== item.id))
                      }
                    />
                  ))}
              </Box>
            </>
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 2 }}>
            Analiz ve gönderim ayarları
          </Typography>

          <Typography fontWeight={600} fontSize={14} sx={{ mb: 0.5 }}>
            CV / içerik dili
          </Typography>
          <RadioGroup
            row
            value={cvLanguage}
            onChange={(e) => setCvLanguage(e.target.value as 'turkish' | 'english')}
            sx={{ mb: 1 }}
          >
            <FormControlLabel value="turkish" control={<Radio size="small" />} label="Türkçe" />
            <FormControlLabel value="english" control={<Radio size="small" />} label="English" />
          </RadioGroup>

          <FormControlLabel
            control={
              <Switch
                checked={includeCvPhoto && Boolean(profilePhotoUrl)}
                disabled={!profilePhotoUrl}
                onChange={(_, on) => setIncludeCvPhoto(on)}
                color="primary"
                size="small"
              />
            }
            label={
              <Box>
                <Typography fontWeight={600} fontSize={14}>
                  CV&apos;ye profil fotoğrafı ekle
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {profilePhotoUrl
                    ? 'Optimize PDF’de Profilim fotoğrafı sol üste eklenir (3.5 cm).'
                    : 'Önce Profilim sayfasından profil fotoğrafı yükleyin.'}
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', ml: 0, mb: 2 }}
          />

          <Typography fontWeight={600} fontSize={14} sx={{ mb: 0.5 }}>
            Cold mail dili
          </Typography>
          <RadioGroup
            row
            value={emailLangMode}
            onChange={(e) =>
              setEmailLangMode(e.target.value as 'auto' | 'turkish' | 'english')
            }
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="auto" control={<Radio size="small" />} label="Otomatik" />
            <FormControlLabel value="turkish" control={<Radio size="small" />} label="Türkçe" />
            <FormControlLabel value="english" control={<Radio size="small" />} label="English" />
          </RadioGroup>

          <Typography fontWeight={600} fontSize={14} sx={{ mb: 0.5 }}>
            AI uyarlama alanları
          </Typography>
          <FormControlLabel
            control={
              <Checkbox checked={aiAbout} onChange={(e) => setAiAbout(e.target.checked)} />
            }
            label="Hakkımda"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={aiExperience}
                onChange={(e) => setAiExperience(e.target.checked)}
              />
            }
            label="İş deneyimi"
          />
          <FormControlLabel
            control={
              <Checkbox checked={aiSkills} onChange={(e) => setAiSkills(e.target.checked)} />
            }
            label="Beceriler"
            sx={{ mb: 2 }}
          />

          <Typography fontWeight={600} fontSize={14} sx={{ mb: 1 }}>
            Hedef e-posta kategorileri
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {EMAIL_PREFIX_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <Box
                  key={cat.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${
                      selected ? colors.secondary : colors.outlineVariant
                    }`,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleCategory(cat.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>
                          {cat.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cat.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              );
            })}
          </Stack>

          <TextField
            size="small"
            label="Özel local-part’lar"
            value={customLocals}
            onChange={(e) => setCustomLocals(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includePrimary}
                onChange={(e) => setIncludePrimary(e.target.checked)}
              />
            }
            label="Girilen ana adresi alıcı listesine ekle"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={forceResend}
                onChange={(e) => setForceResend(e.target.checked)}
              />
            }
            label="Bu domain’e daha önce mail atıldıysa yine de gönder (force)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={generateLinkedIn}
                onChange={(e) => setGenerateLinkedIn(e.target.checked)}
              />
            }
            label="LinkedIn soğuk mesaj üret"
            sx={{ mb: 0.5 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ pl: 4, mb: 2 }}
          >
            Açıkken şirket araştırması (AI son adım) her firma için 60–90 kelimelik LinkedIn
            cold outreach mesajı da üretir; sonuçlarda cold mail ile birlikte görünür.
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => void handleStart()}
            disabled={
              starting || !projectId || !selectedItemIds.length || !cvMeta?.hasCv
            }
            sx={{ textTransform: 'none' }}
          >
            {starting ? 'Başlatılıyor…' : 'Toplu analiz et ve gönder'}
          </Button>
        </GlassCard>

        <TodoJobStatusPanel
          title="Toplu başvuru durumu"
          job={activeJob}
          loading={jobLoading}
          onRefresh={() => void refreshJob()}
          onPause={async () => {
            if (!activeJob) return;
            setActiveJob(await pauseTodoJobRequest(activeJob.id));
          }}
          onResume={async () => {
            if (!activeJob) return;
            setActiveJob(await resumeTodoJobRequest(activeJob.id));
          }}
          onCancel={async () => {
            if (!activeJob) return;
            setActiveJob(await cancelTodoJobRequest(activeJob.id));
          }}
        />
      </Stack>
    </Box>
  );
}
