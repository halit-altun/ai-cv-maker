import type { RecentUploadItem } from '../types';

/** Tasarımdaki “Son Yüklemeler” bölümü için örnek veri */
export const mockRecentUploads: RecentUploadItem[] = [
  {
    id: '1',
    name: 'Mehmet_Yilmaz_CV_2023.pdf',
    type: 'pdf',
    uploadedAt: '2 saat önce',
    sizeLabel: '1.2 MB',
  },
  {
    id: '2',
    name: 'Tech_Lead_Draft_V2.docx',
    type: 'docx',
    uploadedAt: '1 gün önce',
    sizeLabel: '850 KB',
  },
];
