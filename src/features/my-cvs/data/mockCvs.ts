import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';
import type { AiRecommendation, SavedCvRecord, VisibilityInsightBar } from '../types';
import { appRoutes, getEditCvPath } from '@/features/dashboard/constants/routes';

/**
 * Dummy CV payload — mevcut form parametreleriyle aynı şema.
 * İleride DB / API ile değiştirilecek.
 */
function buildCvData(partial: {
  firstName: string;
  lastName: string;
  title: string;
  about: string;
  company: string;
  position: string;
  skills: string[];
}): CompanyBasedCVData {
  return {
    personalInfo: {
      firstName: partial.firstName,
      lastName: partial.lastName,
      title: partial.title,
      country: 'United States',
      city: 'San Francisco',
      phone: '+1 415 555 0142',
      email: `${partial.firstName.toLowerCase()}.${partial.lastName.toLowerCase()}@email.com`,
      portfolio: `https://${partial.firstName.toLowerCase()}.design`,
      github: `https://github.com/${partial.firstName.toLowerCase()}`,
      linkedin: `https://linkedin.com/in/${partial.firstName.toLowerCase()}${partial.lastName.toLowerCase()}`,
    },
    about: partial.about,
    workExperience: [
      {
        id: 'we-1',
        position: partial.position,
        company: partial.company,
        city: 'San Francisco',
        country: 'USA',
        startDate: '2021-03',
        endDate: 'Present',
        bulletPoints: [
          `Led product and design initiatives for ${partial.company}`,
          'Improved conversion and engagement through research-backed UX',
          'Collaborated with engineering and GTM across multiple squads',
        ],
      },
      {
        id: 'we-2',
        position: 'Product Designer',
        company: 'Stripe',
        city: 'San Francisco',
        country: 'USA',
        startDate: '2018-06',
        endDate: '2021-02',
        bulletPoints: [
          'Designed onboarding flows used by millions of merchants',
          'Partnered with PM and research on activation experiments',
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        university: 'Rhode Island School of Design',
        department: 'Graphic Design, B.F.A.',
        startDate: '2012-09',
        endDate: '2016-05',
      },
    ],
    skills: partial.skills,
    languages: [
      { id: 'lang-1', language: 'English', level: 'Ana Dil' },
      { id: 'lang-2', language: 'Spanish', level: 'B2' },
    ],
  };
}

export function getSavedCvs(): SavedCvRecord[] {
  return [
    {
      id: 'cv-senior-product-designer',
      displayTitle: 'Senior Product Designer',
      lastModifiedLabel: 'Last modified 2 hours ago',
      strengthPercent: 92,
      badge: 'recently-edited',
      previewImageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAOpCD0Xl6Y_PnmY5cfn7rn6qPeA-XqhYTDseq4hiUf2iKBJjeNGLg_1tMaJVbqov0us9nTYqfgP154ahhfxuJNdskSTISsqy3OcQ5n2bIrqb-Zp_n_7DG0lI3YCj6vO5S9Ntz38sx-V6GyOAzy6Ytmml0q-XWSAkZVoUDkNZw24Da_qKnm0NgO6M00Cwbzlt55PAc27zCeOmHaze2Mb5o3M2sI_cxrURtlaNk-k2haZsoZqQ215bIZEg',
      editHref: getEditCvPath('cv-senior-product-designer'),
      optimizeHref: `${appRoutes.aiOptimizer}?cvId=cv-senior-product-designer`,
      data: buildCvData({
        firstName: 'Alex',
        lastName: 'Rivera',
        title: 'Senior Product Designer',
        position: 'Senior Product Designer',
        company: 'Meta',
        about:
          'Senior Product Designer with 8+ years crafting SaaS and consumer experiences. Specializes in design systems, accessibility, and measurable product outcomes.',
        skills: [
          'Product Design',
          'Figma',
          'Design Systems',
          'User Research',
          'Prototyping',
          'A/B Testing',
        ],
      }),
    },
    {
      id: 'cv-creative-lead-google',
      displayTitle: 'Creative Lead @ Google',
      lastModifiedLabel: 'Last modified 3 days ago',
      strengthPercent: 78,
      badge: null,
      previewImageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAFcx8Uvgnh_O4BsYv3tXqNAp6QapAWOaST-X0w1drUiDjKw66udICIaCzy6wQS20RYo0M7LNEcLSkvGSfJDuETJJH96yBISedA1K2ZJOGBKXz6_qicD740slwvawsOeXRbrjXAQW8I1a165V5Dadg14QxsjttlIw7mKFcwgpF8fFFD8J9L8L3dCJnyDbfdphJ-o0OJ4h77VZV-eUYfOotygPndKbfXFTrJpzeE4D-2J5iqPJT4qrzFVQ',
      editHref: getEditCvPath('cv-creative-lead-google'),
      optimizeHref: `${appRoutes.aiOptimizer}?cvId=cv-creative-lead-google`,
      data: buildCvData({
        firstName: 'Alex',
        lastName: 'Rivera',
        title: 'Creative Lead',
        position: 'Creative Lead',
        company: 'Google',
        about:
          'Creative Lead focused on brand storytelling and multi-channel campaigns for global products. Bridges design craft with marketing and growth goals.',
        skills: [
          'Brand Strategy',
          'Art Direction',
          'Motion Design',
          'Storytelling',
          'Workshop Facilitation',
        ],
      }),
    },
  ];
}

export function getVisibilityInsights(): VisibilityInsightBar[] {
  return [
    { id: 'mon', dayLabel: 'Mon', heightPercent: 40 },
    { id: 'tue', dayLabel: 'Tue', heightPercent: 65 },
    { id: 'wed', dayLabel: 'Wed', heightPercent: 50 },
    { id: 'thu', dayLabel: 'Thu', heightPercent: 90, highlighted: true },
    { id: 'fri', dayLabel: 'Fri', heightPercent: 75 },
    { id: 'sat', dayLabel: 'Sat', heightPercent: 60 },
    { id: 'sun', dayLabel: 'Sun', heightPercent: 85 },
  ];
}

export function getAiRecommendation(): AiRecommendation {
  return {
    title: 'AI Recommendation',
    body: "Your 'Senior Product Designer' CV is missing 3 key keywords found in current Meta job postings.",
    ctaLabel: 'Fix Now',
    ctaHref: `${appRoutes.aiOptimizer}?cvId=cv-senior-product-designer`,
    relatedCvId: 'cv-senior-product-designer',
  };
}
