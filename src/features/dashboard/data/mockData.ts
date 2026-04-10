import {
  AutoAwesome,
  Business,
  Description,
  Email,
  Send,
  Schedule,
} from '@mui/icons-material';
import type {
  DashboardActivityItem,
  DashboardMetric,
  DashboardQuickAction,
  DashboardTaskProgress,
  DashboardUsageBar,
} from '../types';
import { appRoutes } from '../constants/routes';

export function getDashboardMetrics(): DashboardMetric[] {
  return [
    {
      id: 'cv-drafts',
      label: 'CV taslakları',
      value: '12',
      hint: 'Son 30 gün',
      tone: 'primary',
      icon: Description,
    },
    {
      id: 'company-versions',
      label: 'Şirket uyumlu sürümler',
      value: '5',
      hint: 'Aktif projeler',
      tone: 'secondary',
      icon: Business,
    },
    {
      id: 'cover-letters',
      label: 'Hazırlanan başvuru mailleri',
      value: '8',
      hint: 'Bu ay',
      tone: 'success',
      icon: Email,
    },
    {
      id: 'time-saved',
      label: 'Tahmini süre tasarrufu',
      value: '6.5 saat',
      hint: 'AI ile otomasyon',
      tone: 'warning',
      icon: Schedule,
    },
  ];
}

export function getQuickActions(): DashboardQuickAction[] {
  return [
    {
      id: 'new-cv',
      title: 'Yeni CV (AI)',
      description: 'PDF yükle veya sıfırdan doldur',
      href: appRoutes.cvMakerAi,
      icon: AutoAwesome,
      tone: 'primary',
    },
    {
      id: 'company',
      title: 'Şirket bazlı düzenle',
      description: 'İlana göre CV uyarla',
      href: appRoutes.companyCvEditor,
      icon: Business,
      tone: 'secondary',
    },
    {
      id: 'cover',
      title: 'Başvuru maili',
      description: 'AI ile ön yazı oluştur',
      href: appRoutes.aiCoverLetter,
      icon: Email,
      tone: 'success',
    },
    {
      id: 'bulk',
      title: 'Toplu mail',
      description: 'Çoklu başvuru gönderimi',
      href: appRoutes.bulkEmail,
      icon: Send,
      tone: 'warning',
    },
  ];
}

export function getRecentActivity(): DashboardActivityItem[] {
  return [
    {
      id: 'a1',
      title: 'CV güncellendi',
      detail: 'Full Stack profili — CV Maker AI',
      timeLabel: '2 saat önce',
    },
    {
      id: 'a2',
      title: 'Şirket şablonu uygulandı',
      detail: 'Finans sektörü anahtar kelimeleri',
      timeLabel: 'Dün',
    },
    {
      id: 'a3',
      title: 'PDF dışa aktarıldı',
      detail: 'Halit_Altun_CV.pdf',
      timeLabel: '3 gün önce',
    },
    {
      id: 'a4',
      title: 'Başvuru maili kaydedildi',
      detail: 'Yazılım mühendisi pozisyonu',
      timeLabel: '5 gün önce',
    },
  ];
}

export function getTaskProgress(): DashboardTaskProgress[] {
  return [
    { id: 't1', label: 'Profil doluluk', percent: 88 },
    { id: 't2', label: 'İş deneyimi detayı', percent: 72 },
    { id: 't3', label: 'Beceri etiketleri', percent: 65 },
  ];
}

export function getUsageBars(): DashboardUsageBar[] {
  return [
    { id: 'u1', label: 'Pzt', percent: 45 },
    { id: 'u2', label: 'Sal', percent: 62 },
    { id: 'u3', label: 'Çar', percent: 38 },
    { id: 'u4', label: 'Per', percent: 80 },
    { id: 'u5', label: 'Cum', percent: 55 },
    { id: 'u6', label: 'Cmt', percent: 25 },
    { id: 'u7', label: 'Paz', percent: 15 },
  ];
}
