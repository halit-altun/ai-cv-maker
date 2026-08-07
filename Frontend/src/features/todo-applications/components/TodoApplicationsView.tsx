'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  createOutreachProjectRequest,
  listOutreachProjectsRequest,
  selectOutreachProjectRequest,
  type OutreachProject,
} from '@/lib/projects/api';
import { getTodoProjectSummaryRequest } from '@/lib/todo-applications/api';
import { GlassCard } from '@/features/company-cv-optimizer/components/shell/GlassCard';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes, getTodoProjectPath } from '@/features/dashboard/constants/routes';
import { todoApplicationsCopy } from '../constants/copy';

type ProjectCardInfo = OutreachProject & { itemCount?: number };

export function TodoApplicationsView() {
  const { colors, fonts } = dashboardTokens;
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listOutreachProjectsRequest();
      const withCounts = await Promise.all(
        result.projects.map(async (p) => {
          try {
            const summary = await getTodoProjectSummaryRequest(p.id);
            return { ...p, itemCount: summary.itemCount };
          } catch {
            return { ...p, itemCount: undefined };
          }
        })
      );
      setProjects(withCounts);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projeler yüklenemedi.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openProject = async (projectId: string) => {
    try {
      await selectOutreachProjectRequest(projectId);
    } catch {
      // seçim hatası — yine de detaya git
    }
    router.push(getTodoProjectPath(projectId));
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createOutreachProjectRequest(name);
      setCreateOpen(false);
      setNewName('');
      await loadProjects();
      router.push(getTodoProjectPath(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <ChecklistIcon sx={{ color: colors.secondary }} />
        <Typography sx={{ fontFamily: fonts.display, fontSize: '1.75rem', fontWeight: 700 }}>
          {todoApplicationsCopy.title}
        </Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        {todoApplicationsCopy.subtitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
          Projeleriniz
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Yeni proje
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : !projects.length ? (
        <GlassCard sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>Henüz proje yok. İlk projenizi oluşturun.</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Proje oluştur
          </Button>
        </GlassCard>
      ) : (
        <Stack spacing={1.5}>
          {projects.map((project) => (
            <GlassCard
              key={project.id}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                '&:hover': {
                  borderColor: colors.secondary,
                  boxShadow: '0 4px 16px rgba(70, 72, 212, 0.12)',
                },
              }}
            >
              <Box
                onClick={() => void openProject(project.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={16}>
                    {project.name}
                  </Typography>
                  <Box sx={{ mt: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={
                        typeof project.itemCount === 'number'
                          ? `${project.itemCount} firma`
                          : 'Firma listesi'
                      }
                    />
                  </Box>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void openProject(project.id);
                  }}
                >
                  Detaya gir
                </Button>
              </Box>
            </GlassCard>
          ))}
        </Stack>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Analiz için{' '}
        <Link href={appRoutes.aiOptimizerBulk} style={{ color: colors.secondary }}>
          Toplu başvuru
        </Link>{' '}
        sayfasını kullanın.
      </Typography>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Yeni proje</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Proje adı"
            placeholder="ör. DUBAI, Berlin Q2"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none' }}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={creating || !newName.trim()}
            sx={{ textTransform: 'none' }}
          >
            {creating ? 'Oluşturuluyor…' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
