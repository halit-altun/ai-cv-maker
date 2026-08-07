import { authFetch } from '@/lib/auth/authFetch';
import type { EmailPrefixCategoryId } from '@/features/company-cv-optimizer/constants/outreachConstants';
import type {
  OutreachCvAttachmentSource,
  OutreachEmailLanguageMode,
} from '@/features/company-cv-optimizer/types';

export type ClientUiPreferences = {
  targetPosition: string;
  cvLanguage: 'turkish' | 'english';
  outreachEmailLanguageMode: OutreachEmailLanguageMode;
  aiSettings: {
    about: boolean;
    workExperience: boolean;
    skills: boolean;
  };
  selectedEmailPrefixCategories: EmailPrefixCategoryId[];
  customEmailLocalPartsText: string;
  includePrimaryEmailInSend: boolean;
  skipPrimaryEmailVerification: boolean;
  forceResend: boolean;
  bulkSendHistoryFilter: 'all' | 'sent' | 'unsent';
  shouldGenerateCoverLetter: boolean;
  coverLetterSource: 'company' | 'text';
  shouldGenerateLinkedInMessage: boolean;
  linkedinMessageSource: 'company' | 'text';
  cvAdaptationSource: 'company' | 'text';
  includeCvPhoto: boolean;
  shouldSendCompanyEmail: boolean;
  outreachCvAttachmentSource: OutreachCvAttachmentSource;
  manualMustMentionTopicsText: string;
  manualMustNotMentionTopicsText: string;
  coverLetterRecipientName: string;
  coverLetterCompanyName: string;
  updatedAt?: string | null;
};

export type ClientUiPreferencesPatch = Partial<
  Omit<ClientUiPreferences, 'updatedAt'>
>;

async function parseJson(res: Response) {
  return (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    preferences?: ClientUiPreferences;
  };
}

export async function getClientUiPreferencesRequest(): Promise<ClientUiPreferences> {
  const res = await authFetch('/api/client-preferences');
  const data = await parseJson(res);
  if (!res.ok || !data.ok || !data.preferences) {
    throw new Error(data.message || 'Tercihler alınamadı.');
  }
  return data.preferences;
}

export async function updateClientUiPreferencesRequest(
  patch: ClientUiPreferencesPatch
): Promise<ClientUiPreferences> {
  const res = await authFetch('/api/client-preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson(res);
  if (!res.ok || !data.ok || !data.preferences) {
    throw new Error(data.message || 'Tercihler kaydedilemedi.');
  }
  return data.preferences;
}
