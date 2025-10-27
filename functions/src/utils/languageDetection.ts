/**
 * Language detection utilities for RAG pipeline
 */

import { LanguageDetectionResult } from '../types/conversationSettings';

/**
 * Language detection patterns for common languages
 */
const LANGUAGE_PATTERNS = {
  'en': {
    commonWords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'],
    patterns: [/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi]
  },
  'es': {
    commonWords: ['el', 'la', 'los', 'las', 'y', 'o', 'pero', 'en', 'con', 'por', 'para', 'de', 'del', 'es', 'son', 'era', 'eran', 'ser', 'sido', 'tener', 'tiene', 'tenía', 'hacer', 'hace', 'hacía', 'poder', 'puede', 'podía', 'deber', 'debe', 'debía'],
    patterns: [/\b(el|la|los|las|y|o|pero|en|con|por|para|de|del)\b/gi]
  },
  'fr': {
    commonWords: ['le', 'la', 'les', 'et', 'ou', 'mais', 'dans', 'avec', 'pour', 'de', 'du', 'des', 'est', 'sont', 'était', 'étaient', 'être', 'été', 'avoir', 'a', 'avait', 'faire', 'fait', 'faisait', 'pouvoir', 'peut', 'pouvait', 'devoir', 'doit', 'devait'],
    patterns: [/\b(le|la|les|et|ou|mais|dans|avec|pour|de|du|des)\b/gi]
  },
  'de': {
    commonWords: ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'mit', 'für', 'von', 'zu', 'ist', 'sind', 'war', 'waren', 'sein', 'gewesen', 'haben', 'hat', 'hatte', 'machen', 'macht', 'machte', 'können', 'kann', 'konnte', 'sollen', 'soll', 'sollte'],
    patterns: [/\b(der|die|das|und|oder|aber|in|mit|für|von|zu)\b/gi]
  },
  'it': {
    commonWords: ['il', 'la', 'i', 'le', 'e', 'o', 'ma', 'in', 'con', 'per', 'di', 'da', 'è', 'sono', 'era', 'erano', 'essere', 'stato', 'avere', 'ha', 'aveva', 'fare', 'fa', 'faceva', 'potere', 'può', 'poteva', 'dovere', 'deve', 'doveva'],
    patterns: [/\b(il|la|i|le|e|o|ma|in|con|per|di|da)\b/gi]
  },
  'pt': {
    commonWords: ['o', 'a', 'os', 'as', 'e', 'ou', 'mas', 'em', 'com', 'para', 'de', 'do', 'da', 'é', 'são', 'era', 'eram', 'ser', 'sido', 'ter', 'tem', 'tinha', 'fazer', 'faz', 'fazia', 'poder', 'pode', 'podia', 'dever', 'deve', 'devia'],
    patterns: [/\b(o|a|os|as|e|ou|mas|em|com|para|de|do|da)\b/gi]
  },
  'ru': {
    commonWords: ['и', 'или', 'но', 'в', 'на', 'с', 'для', 'от', 'до', 'по', 'за', 'о', 'об', 'при', 'без', 'через', 'между', 'среди', 'вокруг', 'около', 'возле', 'близ', 'далеко', 'близко'],
    patterns: [/[а-яё]/gi] // Cyrillic characters
  },
  'zh': {
    commonWords: ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'],
    patterns: [/[\u4e00-\u9fff]/g] // Chinese characters
  },
  'ja': {
    commonWords: ['の', 'に', 'は', 'を', 'が', 'で', 'と', 'から', 'まで', 'より', 'へ', 'も', 'や', 'か', 'ね', 'よ', 'だ', 'です', 'である', 'する', 'した', 'して', 'できる', 'ある', 'いる', 'なる', 'いく', 'くる', 'みる', 'きく'],
    patterns: [/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g] // Hiragana, Katakana, Kanji
  },
  'ko': {
    commonWords: ['의', '에', '는', '을', '를', '이', '가', '에서', '와', '과', '부터', '까지', '보다', '로', '도', '나', '또는', '그리고', '하지만', '그래서', '그런데', '그러나', '따라서', '그러므로', '그러면', '그래도', '그러니까'],
    patterns: [/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g] // Hangul
  }
};

/**
 * Detects language from text using pattern matching
 */
export function detectLanguage(text: string, userId?: string): string {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  const results: Array<{ language: string; score: number; confidence: number }> = [];
  
  Object.entries(LANGUAGE_PATTERNS).forEach(([language, config]) => {
    let score = 0;
    let totalWords = 0;
    
    // Count common words
    config.commonWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    
    // Count pattern matches
    config.patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 0.5; // Patterns are less reliable
      }
    });
    
    // Count total words for normalization
    const words = text.split(/\s+/).filter(word => word.length > 0);
    totalWords = words.length;
    
    if (totalWords > 0) {
      const confidence = Math.min(score / totalWords, 1);
      results.push({ language, score, confidence });
    }
  });

  // Sort by confidence and return best match
  results.sort((a, b) => b.confidence - a.confidence);
  
  const bestMatch = results[0];
  
  return bestMatch?.language || 'en';
}

/**
 * Detects language from user's recent messages with fallback to other participants
 */
export function detectLanguageFromMessages(
  userMessages: string[],
  otherMessages: string[],
  maxMessages: number = 30
): LanguageDetectionResult {
  // Try user's messages first
  if (userMessages.length > 0) {
    const recentUserMessages = userMessages.slice(-maxMessages);
    const userText = recentUserMessages.join(' ');
    const userResult = detectLanguage(userText);
    
    if (userResult && userResult !== 'en') {
      return {
        detectedLanguage: userResult,
        confidence: 0.8, // High confidence for user messages
        fallbackUsed: false,
        source: 'user_message'
      };
    }
  }
  
  // Fallback to other participants' messages
  if (otherMessages.length > 0) {
    const recentOtherMessages = otherMessages.slice(-maxMessages);
    const otherText = recentOtherMessages.join(' ');
    const otherResult = detectLanguage(otherText);
    
    return {
      detectedLanguage: otherResult,
      confidence: 0.6, // Medium confidence for other participants
      fallbackUsed: true,
      source: 'other_participant'
    };
  }
  
  // Final fallback to English
  return {
    detectedLanguage: 'en',
    confidence: 0,
    fallbackUsed: true,
    source: 'default'
  };
}

/**
 * Gets language name from language code
 */
export function getLanguageName(code: string): string {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
  };
  
  return languageNames[code] || 'Unknown';
}

/**
 * Checks if a language code is supported
 */
export function isLanguageSupported(code: string): boolean {
  return Object.keys(LANGUAGE_PATTERNS).includes(code);
}

/**
 * Gets all supported language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_PATTERNS);
}

/**
 * Normalizes language code to standard format
 */
export function normalizeLanguageCode(code: string): string {
  const normalized = code.toLowerCase().trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'eng': 'en',
    'spa': 'es',
    'fra': 'fr',
    'ger': 'de',
    'ita': 'it',
    'por': 'pt',
    'rus': 'ru',
    'chi': 'zh',
    'jpn': 'ja',
    'kor': 'ko'
  };
  
  return variations[normalized] || normalized;
}

/**
 * Detects if text contains multiple languages
 */
export function detectMultipleLanguages(text: string): string[] {
  const languages: string[] = [];
  
  Object.entries(LANGUAGE_PATTERNS).forEach(([language, config]) => {
    const result = detectLanguage(text);
    if (result === language) {
      languages.push(language);
    }
  });
  
  return languages;
}

/**
 * Gets the primary language from a text that might contain multiple languages
 */
export function getPrimaryLanguage(text: string): LanguageDetectionResult {
  const result = detectLanguage(text);
  
  // If result is English (default), try to detect multiple languages
  if (result === 'en') {
    const multipleLanguages = detectMultipleLanguages(text);
    if (multipleLanguages.length > 0) {
      return {
        detectedLanguage: multipleLanguages[0],
        confidence: 0.5,
        fallbackUsed: false,
        source: 'user_message'
      };
    }
  }
  
  return {
    detectedLanguage: result,
    confidence: 0.8,
    fallbackUsed: false,
    source: 'user_message'
  };
}