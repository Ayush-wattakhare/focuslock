// AI Configuration for Claude API
// This file contains configuration for the Anthropic Claude API used for AI coaching

export const AI_CONFIG = {
  // Claude API Configuration
  model: 'claude-sonnet-4-20250514',
  maxTokens: 500,
  temperature: 0.7,
  apiVersion: '2023-06-01',
  
  // Rate Limiting
  maxRequestsPerHour: 1, // Max 1 request per user per hour
  cacheExpiryHours: 24, // Cache insights for 24 hours
  
  // Coaching Prompt Configuration
  systemPrompt: 'You are a compassionate digital wellbeing coach. Analyze user app override patterns and provide guidance.',
  
  // Response Format
  responseFormat: {
    insight: 'One key observation about patterns (2 sentences max, warm and non-judgmental)',
    suggestion: 'One specific, actionable suggestion to improve (be concrete, not generic)',
  },
} as const;

// Check if AI features are enabled
export function isAIEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-placeholder-key';
}

// Validate that required environment variables are set
export function validateAIConfig() {
  if (!isAIEnabled()) {
    throw new Error('AI coaching is not available. ANTHROPIC_API_KEY is not configured. This is a paid service from Anthropic.');
  }
}

// Get API endpoint
export function getClaudeAPIEndpoint() {
  return 'https://api.anthropic.com/v1/messages';
}

// Get API headers
export function getClaudeAPIHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': AI_CONFIG.apiVersion,
  };
}
