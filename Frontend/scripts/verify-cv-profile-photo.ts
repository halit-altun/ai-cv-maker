/**
 * CV edit/new: profil fotoğrafı varken switch kilitlenmesin.
 * Çalıştır: npx tsx scripts/verify-cv-profile-photo.ts
 */
import assert from 'assert';
import { resolveCvProfilePhotoUrl } from '../src/features/ai-cv-builder/utils/cvFormUtils';

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
