export type IceChatProvider = 'local' | 'gemini' | 'claude' | 'openai' | 'openrouter';

export type IceExternalChatProvider = Exclude<IceChatProvider, 'local'>;

export type IceEmbeddingProvider = 'local' | 'openai' | 'gemini' | 'openrouter';

export const ICE_CHAT_PROVIDERS: Record<
  IceChatProvider,
  {
    label: string;
    description: string;
  }
> = {
  local: {
    label: 'Private local',
    description: 'Answers are assembled locally without sending context to an AI provider.',
  },
  gemini: {
    label: 'Google Gemini',
    description: 'Uses your Google AI API key for grounded answer generation.',
  },
  claude: {
    label: 'Anthropic Claude',
    description: 'Uses your Anthropic API key for grounded answer generation.',
  },
  openai: {
    label: 'OpenAI',
    description: 'Uses your OpenAI API key for grounded answer generation.',
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Uses your OpenRouter API key and available model catalog.',
  },
};

export const ICE_EMBEDDING_PROVIDERS: Record<
  IceEmbeddingProvider,
  { label: string; description: string }
> = {
  local: {
    label: 'Private local',
    description: 'Workspace content is embedded on this TaskLabs server and never sent to a provider.',
  },
  openai: { label: 'OpenAI', description: 'Embeds your accessible workspace content using your saved OpenAI key.' },
  gemini: { label: 'Google Gemini', description: 'Embeds your accessible workspace content using your saved Gemini key.' },
  openrouter: { label: 'OpenRouter', description: 'Embeds your accessible workspace content using your saved OpenRouter key.' },
};

export const ICE_LOCAL_CHAT_MODEL = 'local-grounded';
