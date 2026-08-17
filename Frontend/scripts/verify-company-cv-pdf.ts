/**
 * Company-based analiz sonrası PDF indirme regresyonu.
 * Çalıştır: npx tsx scripts/verify-company-cv-pdf.ts
 */
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { Font, pdf } from '@react-pdf/renderer';
import PDFDocument from '../src/components/cv-maker/PDFDocument';
import { sanitizeCvDataForPdf } from '../src/components/cv-maker/sanitizeCvDataForPdf';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'public', 'fonts');

Font.register({
  family: 'Calibri',
  fonts: [
    { src: path.join(FONT_DIR, 'Carlito-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Carlito-Bold.ttf'), fontWeight: 700 },
    { src: path.join(FONT_DIR, 'Carlito-Italic.ttf'), fontStyle: 'italic' },
    {
      src: path.join(FONT_DIR, 'Carlito-BoldItalic.ttf'),
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
});

function testSanitize() {
  const dirty = {
    personalInfo: {
      firstName: 'Halit',
      lastName: 'Khalil',
      title: { role: 'dev' } as unknown as string,
      country: 'Türkiye',
      city: 'İstanbul',
      phone: null as unknown as string,
      email: 'a@b.com',
      portfolio: undefined as unknown as string,
      github: '',
      linkedin: '',
      includePhoto: true,
      photoUrl: 'https://example.com/cors-blocked.jpg',
    },
    about: { text: 'should not crash' } as unknown as string,
    workExperience: [
      {
        id: '1',
        position: 'Full Stack',
        company: 'Acme',
        city: 'İstanbul',
        country: 'Türkiye',
        startDate: '2024-01',
        endDate: 'Present',
        bulletPoints: [{ text: 'obj' } as unknown as string, 'React ile arayüz geliştirdim'],
      },
    ],
    education: null as unknown as [],
    skills: ['React', { name: 'bad' } as unknown as string, 'TypeScript'],
    languages: [{ id: '1', language: 'Türkçe', level: 'Ana dil' }],
  };

  const clean = sanitizeCvDataForPdf(dirty);
  assert.strictEqual(clean.about, '');
  assert.strictEqual(clean.personalInfo.title, '');
  assert.deepStrictEqual(clean.workExperience[0].bulletPoints, [
    'React ile arayüz geliştirdim',
  ]);
  assert.deepStrictEqual(clean.skills, ['React', 'TypeScript']);
  assert.strictEqual(clean.education.length, 0);
  console.log("✓ sanitize: analiz sonrası kirli veri PDF için string'e iner");
}

async function testPdfRender() {
  const data = sanitizeCvDataForPdf({
    personalInfo: {
      firstName: 'Halit',
      lastName: 'Khalil',
      title: 'Full Stack Web Developer',
      country: 'Türkiye',
      city: 'İstanbul',
      phone: '+90 555 000 00 00',
      email: 'halit@example.com',
      portfolio: 'https://example.com',
      github: 'https://github.com/example',
      linkedin: 'https://linkedin.com/in/example',
      includePhoto: true,
      photoUrl: 'https://example.invalid/blocked.jpg',
    },
    about:
      'Yazılım geliştirici olarak React, Next.js ve .NET ile ölçeklenebilir ürünler geliştiriyorum.',
    workExperience: [
      {
        id: '1',
        position: 'Full Stack Developer',
        company: 'Örnek Yazılım',
        city: 'İstanbul',
        country: 'Türkiye',
        startDate: '2023-01',
        endDate: 'Present',
        bulletPoints: [
          'Next.js ve TypeScript ile kurumsal paneller geliştirdim.',
          'SQL Server üzerinde raporlama servisleri yazdım.',
        ],
      },
    ],
    education: [
      {
        id: '1',
        university: 'Örnek Üniversitesi',
        department: 'Bilgisayar Mühendisliği',
        startDate: '2018-09',
        endDate: '2022-06',
      },
    ],
    skills: ['React', 'TypeScript', 'Next.js', '.NET'],
    languages: [{ id: '1', language: 'Türkçe', level: 'Ana dil' }],
  });

  const blob = await pdf(
    React.createElement(PDFDocument, { data, isEnglish: false })
  ).toBlob();
  assert.ok(blob && blob.size > 1000, `PDF çok küçük: ${blob && blob.size}`);
  console.log(`✓ pdf: Türkçe CV PDF üretildi (${blob.size} bytes)`);
}

async function main() {
  testSanitize();
  await testPdfRender();
  console.log('verify-company-cv-pdf: OK');
}

main().catch((err) => {
  console.error('verify-company-cv-pdf FAILED:', err);
  process.exit(1);
});
