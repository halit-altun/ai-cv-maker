/**
 * CV edit/new: profil fotoğrafı varken switch kilitlenmesin.
 * Çalıştır: npx tsx scripts/verify-cv-profile-photo.ts
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCvProfilePhotoUrl } from '../src/features/ai-cv-builder/utils/cvFormUtils';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const profile = 'https://res.cloudinary.com/demo/image/upload/v1/profile.jpg';

assert.strictEqual(resolveCvProfilePhotoUrl(profile, ''), profile);
assert.strictEqual(resolveCvProfilePhotoUrl('', 'https://saved/cv.jpg'), 'https://saved/cv.jpg');
assert.strictEqual(resolveCvProfilePhotoUrl('', ''), '');
assert.strictEqual(
  resolveCvProfilePhotoUrl(profile, ''),
  profile,
  'kapatınca CV photoUrl silinse de Profilim URL’si ile tekrar açılabilmeli'
);
assert.ok(Boolean(resolveCvProfilePhotoUrl(profile, '')));
assert.ok(!Boolean(resolveCvProfilePhotoUrl('', '')));

console.log('✓ cv profile photo: Profilim URL’si kapat/aç sonrası kullanılabilir');

const previewSource = fs.readFileSync(
  path.join(ROOT, 'src/features/ai-cv-builder/components/preview/PreviewPanel.tsx'),
  'utf8'
);
assert.match(
  previewSource,
  /prepareCvDataForPdf/,
  'PDF export Cloudinary URL’yi data:image’e çevirmeden PDFDocument’e vermemeli'
);
console.log('✓ cv profile photo: export prepareCvDataForPdf kullanıyor');
