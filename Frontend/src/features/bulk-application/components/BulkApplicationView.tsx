'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  getTodoProjectSummaryRequest,
  listTodoItemsRequest,
  pauseTodoJobRequest,
  resumeTodoJobRequest,
  startTodoJobRequest,
  type TodoApplicationItem,
  type TodoApplicationJob,
  type TodoProjectCvMeta,
} from '@/lib/todo-applications/api';
import { TodoJobStatusPanel } from '@/features/todo-applications';
import Link from 'next/link';
import { bulkApplicationCopy } from '../constants/copy';

export function BulkApplicationView() {
  const { colors, fonts } = dashboardTokens;

  const [projects, setProjects] = useState<OutreachProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [items, setItems] = useState<TodoApplicationItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cvMeta, setCvMeta] = useState<TodoProjectCvMeta | null>(null);

  const [targetPosition, setTargetPosition] = useState('');
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

  const [activeJob, setActiveJob] = useState<TodoApplicationJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      return;
    }
    setItemsLoading(true);
    try {
      const [list, summary] = await Promise.all([
        listTodoItemsRequest(pid),
        getTodoProjectSummaryRequest(pid),
      ]);
      setItems(list);
      setSelectedItemIds(list.map((i) => i.id));
      setCvMeta(summary.cv || null);
      setActiveJob(summary.activeJob || summary.recentJobs[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'To Do listesi alınamadı.');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) return;
    void loadItems(projectId);
  }, [projectId, loadItems]);

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
        targetPosition: targetPosition.trim(),
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
            {itemsLoading ? 'Yükleniyor…' : `${items.length} kayıt · ${selectedItemIds.length} seçili`}
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
                    `${selected.length} / ${items.length} seçili`
                  }
                >
                  {items.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      <Checkbox checked={selectedItemIds.includes(item.id)} />
                      <ListItemText
                        primary={item.companyName || item.emailDomainInput}
                        secondary={item.companyUrl}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => setSelectedItemIds(items.map((i) => i.id))}
                >
                  Tümünü seç
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
                {items
                  .filter((i) => selectedItemIds.includes(i.id))
                  .slice(0, 20)
                  .map((item) => (
                    <Chip
                      key={item.id}
                      size="small"
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

          <TextField
            size="small"
            label="Hedef pozisyon"
            value={targetPosition}
            onChange={(e) => setTargetPosition(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

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
            label="Daha önce mail atılan domain’e tekrar izin ver"
            sx={{ mb: 2 }}
          />

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
