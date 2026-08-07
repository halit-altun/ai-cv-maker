import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Stack,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ScoreBreakdownItem {
  signal: string;
  delta: number;
  detail: string;
}

interface CategoryScore {
  points: number;
  max: number;
  enabled?: boolean;
  totalSent?: number;
  trackingCount?: number;
  logSent?: number;
  minMailsRequired?: number;
  remainingForEngagement?: number;
  minMarksRequired?: number;
  inbox?: number;
  spam?: number;
  breakdown?: ScoreBreakdownItem[];
}

interface MessageRisk {
  enabled: boolean;
  health: number | null;
  riskLabel: string;
  linkCount?: number;
  breakdown?: ScoreBreakdownItem[];
}

interface MailInfraData {
  ok: boolean;
  domain: string;
  senderEmail?: string | null;
  managedByProvider?: boolean;
  checkType?: string;
  scoreTitle?: string;
  scoreScope?: string;
  note?: string;
  estimateDisclaimer?: string;
  scoringMode?: string;
  score: number;
  band?: string;
  label?: string;
  color: string;
  action: 'pass' | 'info' | 'warning' | 'fail';
  actionLabel: string;
  actionEmoji: string;
  cached?: boolean;
  cacheAgeHours?: number;
  categories?: {
    infrastructure?: CategoryScore;
    behavior?: CategoryScore;
    engagement?: CategoryScore;
    outcomes?: CategoryScore;
  };
  messageRisk?: MessageRisk;
  dkimMeta?: {
    selectorMode?: string;
    selectorSource?: string;
    selector?: string | null;
    note?: string;
  };
  realAuthGuidance?: {
    title: string;
    summary: string;
    steps: string[];
    mailTesterUrl?: string;
  };
  labels?: {
    spf?: string;
    dkim?: string;
    dmarc?: string;
    mx?: string;
  };
  summary?: {
    spf: string;
    dkim: string;
    dmarc: string;
    mx: string;
  };
}

interface Props {
  data: MailInfraData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

const statusConfig = {
  ok: { icon: CheckCircleIcon, color: '#4caf50', label: 'Tamam' },
  excellent: { icon: CheckCircleIcon, color: '#4caf50', label: 'Tamam' },
  good: { icon: CheckCircleIcon, color: '#8bc34a', label: 'İyi' },
  warning: { icon: WarningIcon, color: '#ff9800', label: 'Uyarı' },
  error: { icon: ErrorIcon, color: '#f44336', label: 'Eksik' },
};

function CategoryBlock({
  title,
  weightHint,
  category,
  inactiveNote,
}: {
  title: string;
  weightHint: string;
  category?: CategoryScore;
  inactiveNote?: string;
}) {
  if (!category) return null;
  const inactive = category.enabled === false;
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 1.5,
        bgcolor: 'action.hover',
        opacity: inactive ? 0.75 : 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {inactive ? '—' : `${category.points}/${category.max}`}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        {weightHint}
        {inactive && inactiveNote ? ` · ${inactiveNote}` : ''}
      </Typography>
      <Stack spacing={0.4}>
        {(category.breakdown || []).map((item, idx) => (
          <Typography key={idx} variant="caption" color="text.secondary" display="block">
            {item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? `${item.delta}` : '·'}{' '}
            {item.signal}: {item.detail}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function DeliverabilityScore({ data, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          Gönderen itibar tahmini
        </Typography>
        <LinearProgress sx={{ borderRadius: 1 }} />
      </Paper>
    );
  }

  if (!data || !data.ok) {
    return null;
  }

  const {
    score,
    summary,
    domain,
    actionLabel,
    actionEmoji,
    managedByProvider,
    estimateDisclaimer,
    scoreScope,
    scoreTitle,
    scoringMode,
    labels,
    senderEmail,
    cached,
    cacheAgeHours,
    dkimMeta,
    realAuthGuidance,
    categories,
    messageRisk,
    label,
  } = data;

  const progressColor = score >= 80 ? '#4caf50' : score >= 50 ? '#f9a825' : '#e53935';

  const eng = categories?.engagement;
  const engNote =
    eng && eng.enabled === false
      ? `İlk ${eng.minMailsRequired ?? 15} mail sonrası (tracking=${eng.trackingCount ?? 0}, log=${eng.logSent ?? 0})`
      : undefined;

  const out = categories?.outcomes;
  const outNote =
    out && out.enabled === false
      ? `Min ${out.minMarksRequired ?? 2} işaret (inbox=${out.inbox ?? 0}, spam=${out.spam ?? 0}) — Mail Takip’ten Gelen/Spam`
      : undefined;

  const msgHealth = messageRisk?.enabled ? messageRisk.health ?? 0 : null;
  const msgColor =
    msgHealth == null ? '#9e9e9e' : msgHealth >= 70 ? '#4caf50' : msgHealth >= 50 ? '#f9a825' : '#e53935';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {scoreTitle || 'Gönderen itibar tahmini'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip label={scoringMode || 'estimate'} size="small" />
          <Chip label={domain} size="small" variant="outlined" />
          {onRefresh && (
            <Button size="small" startIcon={<RefreshIcon />} onClick={onRefresh} sx={{ textTransform: 'none' }}>
              Yenile
            </Button>
          )}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }} icon={<InfoOutlinedIcon />}>
        <Typography variant="caption" display="block" sx={{ fontWeight: 600, mb: 0.5 }}>
          {scoreScope ||
            'Bu skor GÖNDEREN hesabın itibar tahminidir; belirli alıcının spam/inbox kararını tahmin etmez.'}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
          {estimateDisclaimer}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          Aynı gönderenden A ve B alıcıya giden maillerde bu 66 gibi ana skor aynı kalır. Fark için:{' '}
          <strong>Bu mesaj riski</strong> (konu/gövde) + Mail Takip’te her maili{' '}
          <strong>Gelen / Spam</strong> işaretleyin (2+ işaret sonrası skor ayrışır).
        </Typography>
      </Alert>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {score}
          <Typography component="span" variant="h6" color="text.secondary">
            /100
          </Typography>
        </Typography>
        <Typography variant="body1" sx={{ mt: 0.75, fontWeight: 600 }}>
          {actionEmoji} {label || actionLabel}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{
            mt: 1.5,
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: progressColor, borderRadius: 4 },
          }}
        />
      </Box>

      {senderEmail && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Gönderen: {senderEmail}
          {managedByProvider ? ' · paylaşımlı sağlayıcı' : ''}
          {cached ? ` · DNS cache ${cacheAgeHours ?? '?'}s` : ''}
        </Typography>
      )}

      <Stack spacing={1.25} sx={{ mb: 2 }}>
        <CategoryBlock
          title="1) Statik altyapı"
          weightHint={`Max ${categories?.infrastructure?.max ?? 40}`}
          category={categories?.infrastructure}
        />
        <CategoryBlock
          title="2) Gönderim davranışı"
          weightHint={`Max ${categories?.behavior?.max ?? 30}`}
          category={categories?.behavior}
        />
        <CategoryBlock
          title="3) Engagement"
          weightHint={`Max ${categories?.engagement?.max ?? 15}`}
          category={categories?.engagement}
          inactiveNote={engNote}
        />
        <CategoryBlock
          title="4) Outcome feedback (Gelen kutusu / Spam)"
          weightHint={`Max ${categories?.outcomes?.max ?? 15} · en güçlü yerel sinyal`}
          category={categories?.outcomes}
          inactiveNote={outNote}
        />
      </Stack>

      {messageRisk && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1.5,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Bu mesaj riski (ayrı)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: msgColor }}>
              {messageRisk.enabled ? `${messageRisk.health}/100` : '—'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            {messageRisk.riskLabel} — gönderen skorundan bağımsız; konu/gövde/link/ek
          </Typography>
          {(messageRisk.breakdown || []).map((item, idx) => (
            <Typography key={idx} variant="caption" color="text.secondary" display="block">
              {item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? `${item.delta}` : '·'}{' '}
              {item.signal}: {item.detail}
            </Typography>
          ))}
        </Box>
      )}

      {summary && (
        <Accordion disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              DNS detayı (SPF / DKIM / DMARC / MX)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {(
                [
                  ['spf', 'SPF'],
                  ['dkim', 'DKIM'],
                  ['dmarc', 'DMARC'],
                  ['mx', 'MX'],
                ] as const
              ).map(([key, title]) => {
                const status = summary[key];
                const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.warning;
                const Icon = config.icon;
                return (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {labels?.[key] || config.label}
                      </Typography>
                      {key === 'dkim' && dkimMeta?.note && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {dkimMeta.note}
                        </Typography>
                      )}
                    </Box>
                    <Icon sx={{ color: config.color, fontSize: 20 }} />
                  </Box>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {realAuthGuidance && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }} icon={<InfoOutlinedIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {realAuthGuidance.title}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            {realAuthGuidance.summary}
          </Typography>
          {realAuthGuidance.mailTesterUrl && (
            <Button
              size="small"
              href={realAuthGuidance.mailTesterUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              mail-tester.com aç
            </Button>
          )}
        </Alert>
      )}
    </Paper>
  );
}
