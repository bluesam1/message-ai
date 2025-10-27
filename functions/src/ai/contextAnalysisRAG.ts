/**
 * AI-powered context analysis service for RAG pipeline
 * Uses a single AI call to perform all analysis tasks
 */

import { 
  MessageContext, 
  ContextExtractionResult, 
  RelevanceScore,
  EntityRecognitionResult,
  RAGPipelineStep
} from '../types/rag';
import { ConversationSettings } from '../types/conversationSettings';
import { 
  createPipelineStep, 
  completePipelineStep
} from '../utils/ragUtils';
import { getFirestore } from 'firebase-admin/firestore';

interface AIAnalysisResult {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  entities: string[];
  language: string;
  tone: 'formal' | 'casual' | 'auto';
  relevanceScores: Array<{
    messageId: string;
    score: number;
    reason: string;
  }>;
}

/**
 * AI-powered context analysis service
 */
export class ContextAnalysisRAG {
  
  /**
   * Performs comprehensive context analysis using AI
   */
  async analyzeContext(
    messages: MessageContext[],
    conversationSettings: ConversationSettings
  ): Promise<{
    contextAnalysis: ContextExtractionResult;
    relevanceScores: RelevanceScore[];
    entityRecognition: EntityRecognitionResult;
    languageDetection: string;
    toneDetection: string;
  }> {
    const steps: RAGPipelineStep[] = [];
    
    try {
      // Single AI-powered analysis step
      const analysisStep = createPipelineStep('AI Context Analysis');
      const aiResult = await this.performAIAnalysis(messages, conversationSettings);
      const completedAnalysisStep = completePipelineStep(analysisStep, true);
      steps.push(completedAnalysisStep);

      // Convert AI result to expected format
      const contextAnalysis: ContextExtractionResult = {
        topics: aiResult.topics,
        sentiment: aiResult.sentiment,
        keyEntities: aiResult.entities,
        conversationTone: aiResult.tone === 'auto' ? 'neutral' : aiResult.tone,
        language: aiResult.language,
        messageCount: messages.length
      };

      const relevanceScores: RelevanceScore[] = aiResult.relevanceScores.map(score => ({
        messageId: score.messageId,
        score: score.score,
        factors: {
          recency: score.score * 0.4, // Estimate based on AI score
          engagement: score.score * 0.3,
          importance: score.score * 0.3
        }
      }));

      const entityRecognition: EntityRecognitionResult = {
        entities: aiResult.entities,
        categories: this.categorizeEntities(aiResult.entities)
      };

      return {
        contextAnalysis,
        relevanceScores,
        entityRecognition,
        languageDetection: aiResult.language,
        toneDetection: aiResult.tone
      };
    } catch (error) {
      console.error('[ContextAnalysisRAG] Error in AI context analysis:', error);
      throw error;
    }
  }

  /**
   * Performs comprehensive analysis using AI
   */
  private async performAIAnalysis(
    messages: MessageContext[],
    conversationSettings: ConversationSettings
  ): Promise<AIAnalysisResult> {
    try {
      console.log('[ContextAnalysisRAG] Starting AI analysis for', messages.length, 'messages');
      
      const { getOpenAIClient, getOpenAIModel } = await import('../utils/openai');
      const client = getOpenAIClient();
      const model = getOpenAIModel();

      // Get user's preferred language if auto-translate is enabled
      let userPreferredLanguage = 'en';
      if (conversationSettings.autoTranslate) {
        try {
          const db = getFirestore();
          const conversationDoc = await db.collection('conversations').doc(conversationSettings.conversationId).get();
          
          if (conversationDoc.exists) {
            const conversationData = conversationDoc.data();
            const userPrefs = conversationData?.aiPrefs?.[conversationSettings.userId];
            userPreferredLanguage = userPrefs?.targetLang || 'en';
          }
        } catch (error) {
          console.warn('[ContextAnalysisRAG] Could not get user preferred language:', error);
        }
      }

      // Build conversation context
      const conversationText = messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(msg => `${msg.senderId === conversationSettings.userId ? 'User' : 'Other'}: ${msg.text}`)
        .join('\n');

      const systemPrompt = `You are an advanced conversation analysis AI. Analyze the following conversation and provide comprehensive insights.

CONVERSATION:
${conversationText}

USER PREFERENCES:
- Preferred Language: ${userPreferredLanguage}
- Tone Preference: ${conversationSettings.tonePreference}
- Auto-translate: ${conversationSettings.autoTranslate}

ANALYSIS REQUIREMENTS:
1. Extract main topics being discussed
2. Determine overall sentiment (positive/neutral/negative)
3. Identify key entities (people, places, things, concepts)
4. Detect the primary language used
5. Assess conversation tone (formal/casual/auto)
6. Score relevance of each message (0-1 scale)

Return your analysis as a JSON object with this exact structure:
{
  "topics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive|neutral|negative",
  "entities": ["entity1", "entity2", "entity3"],
  "language": "language_code",
  "tone": "formal|casual|auto",
  "relevanceScores": [
    {
      "messageId": "message_id",
      "score": 0.85,
      "reason": "explanation"
    }
  ]
}`;

      console.log('[ContextAnalysisRAG] Starting AI analysis with prompt length:', systemPrompt.length);
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this conversation and provide the requested JSON analysis.`
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
      });

      console.log('[ContextAnalysisRAG] OpenAI response received, processing...');

      const content = response.choices[0]?.message?.content?.trim() || '';
      console.log('[ContextAnalysisRAG] AI analysis result:', content);

      // Parse AI response
      try {
        const parsed = JSON.parse(content);
        return {
          topics: parsed.topics || [],
          sentiment: parsed.sentiment || 'neutral',
          entities: parsed.entities || [],
          language: parsed.language || userPreferredLanguage,
          tone: parsed.tone || conversationSettings.tonePreference,
          relevanceScores: parsed.relevanceScores || []
        };
      } catch (parseError) {
        console.error('[ContextAnalysisRAG] Failed to parse AI response:', parseError);
        throw new Error('Failed to parse AI analysis result');
      }
    } catch (error) {
      console.error('[ContextAnalysisRAG] Error in AI analysis:', error);
      
      // Fallback analysis
      return {
        topics: ['general conversation'],
        sentiment: 'neutral',
        entities: [],
        language: 'en',
        tone: conversationSettings.tonePreference,
        relevanceScores: messages.map(msg => ({
          messageId: msg.id,
          score: 0.5,
          reason: 'fallback analysis'
        }))
      };
    }
  }

  /**
   * Categorizes entities into types
   */
  private categorizeEntities(entities: string[]): {
    people: string[];
    places: string[];
    organizations: string[];
    topics: string[];
    dates: string[];
  } {
    const categories = {
      people: [] as string[],
      places: [] as string[],
      organizations: [] as string[],
      topics: [] as string[],
      dates: [] as string[]
    };

    entities.forEach(entity => {
      // Simple categorization logic - in a real implementation, this could be more sophisticated
      if (entity.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) {
        categories.people.push(entity);
      } else if (entity.match(/\b(city|country|state|place|location)\b/i)) {
        categories.places.push(entity);
      } else if (entity.match(/\b(company|organization|business|group)\b/i)) {
        categories.organizations.push(entity);
      } else if (entity.match(/\b\d{4}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i)) {
        categories.dates.push(entity);
      } else {
        categories.topics.push(entity);
      }
    });

    return categories;
  }
}