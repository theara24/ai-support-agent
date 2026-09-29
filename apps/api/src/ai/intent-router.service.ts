import { Injectable, Logger } from '@nestjs/common';
import { IntentCategory, IntentClassification } from '@ai-support/types';

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  classify(userMessage: string): IntentClassification {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // 1. Check for Human Handoff intent
    const humanHandoffPatterns = [
      /\b(?:talk|speak)\s+(?:to|with)\s+(?:a\s+)?(?:human|agent|person|representative|someone|operator)\b/i,
      /\b(?:connect|transfer)\s+(?:me\s+)?(?:to\s+)?(?:a\s+)?(?:human|agent|person|representative|operator)\b/i,
      /\b(?:need|want)\s+(?:a\s+)?(?:human|live)\s+(?:agent|support|help|person|representative)\b/i,
      /\b(?:human\s+support|human\s+representative|real\s+person|escalat(?:e|ion))\b/i,
      /\bspeak\s+to\s+agent\b/i,
    ];
    const isHumanHandoff = humanHandoffPatterns.some((pattern) => pattern.test(lower));

    // Pure human handoff request
    if (isHumanHandoff && !lower.includes('acme-') && !lower.includes('return policy') && !lower.includes('refund policy')) {
      return {
        category: IntentCategory.HUMAN_HANDOFF,
        requiresRag: false,
        suggestedTools: ['escalateToHuman'],
        confidence: 0.95,
        reasoning: 'User explicitly requested live human support',
      };
    }

    // 2. Check for Real-time Time / Date inquiry
    const timePatterns = [
      /\bwhat\s+time\s+is\s+it\b/i,
      /\bwhat\s+(?:is|'s)\s+the\s+time\b/i,
      /\bcurrent\s+time\b/i,
      /\btell\s+me\s+the\s+time\b/i,
      /\bwhat\s+(?:is|'s)\s+today'?s\s+date\b/i,
      /\bwhat\s+date\s+is\s+(?:it|today)\b/i,
      /\bwhat\s+day\s+is\s+(?:it|today)\b/i,
      /\bcurrent\s+date\b/i,
      /\bserver\s+time\b/i,
      /\btime\s+in\s+[a-z_\/\s]+/i,
    ];
    const isTimeInquiry = timePatterns.some((pattern) => pattern.test(lower));

    // 3. Check for Order Lookup tool action
    const orderMatch = text.match(/ACME-\d{4}/i);
    const orderPatterns = [
      /\b(?:where\s+is|track|status\s+of|check)\s+(?:my\s+)?order\b/i,
      /\border\s+status\b/i,
      /\btracking\s+number\b/i,
    ];
    const isOrderInquiry = Boolean(orderMatch) || orderPatterns.some((pattern) => pattern.test(lower));

    // 4. Check for Support Ticket tool action
    const ticketPatterns = [
      /\b(?:open|create|log|submit|file)\s+(?:a\s+)?(?:support\s+)?ticket\b/i,
      /\b(?:damaged|broken|defective)\s+(?:package|product|item)\b/i,
      /\bfile\s+a\s+complaint\b/i,
    ];
    const isTicketInquiry = ticketPatterns.some((pattern) => pattern.test(lower));

    // 5. Check for Business / Company Knowledge (RAG)
    const businessKnowledgePatterns = [
      /\b(?:return|refund)\s+policy\b/i,
      /\b(?:returns|refunds|money\s+back)\b/i,
      /\b(?:shipping|delivery)\s+(?:policy|times?|duration|options?)\b/i,
      /\bhow\s+long\s+does\s+shipping\s+take\b/i,
      /\bpayment\s+(?:methods?|options?|types?)\b/i,
      /\b(?:how\s+do\s+i\s+pay|accepted\s+payments?|khqr)\b/i,
      /\b(?:warranty|guarantee)\s+policy\b/i,
      /\b(?:store\s+hours|business\s+hours|company\s+address)\b/i,
      /\bacme(?:'s)?\s+(?:policy|service|terms|products?)\b/i,
      /\bcancellation\s+policy\b/i,
    ];
    const isBusinessKnowledge = businessKnowledgePatterns.some((pattern) => pattern.test(lower));

    // 6. Check for General Knowledge / Explanation patterns
    const generalExplanationPatterns = [
      /\bwhat\s+is\s+(?:docker|kubernetes|python|javascript|typescript|ai|an?\s+api|git|react|html|css|linux|http|sql)\b/i,
      /\bexplain\s+(?:what|how|why|recursion|oop|cloud|microservices|quantum|docker)\b/i,
      /\bexplain\s+what\s+[a-z\s]+\s+means\b/i,
      /\bwhat\s+is\s+a\s+(?:refund|return|container|proxy|webhook)\b/i,
      /\b(?:calculate|how\s+to\s+code|write\s+a\s+function|math|joke)\b/i,
    ];
    const isGeneralExplanation = generalExplanationPatterns.some((pattern) => pattern.test(lower));

    // Check for Simple Greetings
    const greetingPatterns = [
      /^(?:hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|howdy|greetings)[!.? ]*$/i,
    ];
    const isGreeting = greetingPatterns.some((pattern) => pattern.test(lower));

    // --- DECISION LOGIC ---

    // A. MIXED requests:
    // 1) Business Knowledge + Order tool (e.g. "Explain our return policy and tell me whether order ACME-1001 has shipped.")
    if (isBusinessKnowledge && (isOrderInquiry || orderMatch)) {
      return {
        category: IntentCategory.MIXED,
        requiresRag: true,
        suggestedTools: ['searchKnowledgeBase', 'getOrderStatus'],
        confidence: 0.9,
        reasoning: 'Request combines business knowledge retrieval and order lookup tool',
      };
    }

    // 2) General explanation + Business knowledge (e.g. "What is a refund, and what is Acme's refund policy?")
    if (isGeneralExplanation && isBusinessKnowledge) {
      return {
        category: IntentCategory.MIXED,
        requiresRag: true,
        suggestedTools: ['searchKnowledgeBase'],
        confidence: 0.9,
        reasoning: 'Request combines general conceptual explanation with company-specific policy retrieval',
      };
    }

    // 3) General explanation + Tool action (e.g. "Explain what order tracking means and check ACME-1001.")
    if (isGeneralExplanation && (isOrderInquiry || orderMatch)) {
      return {
        category: IntentCategory.MIXED,
        requiresRag: false,
        suggestedTools: ['getOrderStatus'],
        confidence: 0.9,
        reasoning: 'Request combines general explanation with order lookup action',
      };
    }

    // 4) General explanation + Time inquiry
    if (isGeneralExplanation && isTimeInquiry) {
      return {
        category: IntentCategory.MIXED,
        requiresRag: false,
        suggestedTools: ['getCurrentTime'],
        confidence: 0.9,
        reasoning: 'Request combines general inquiry with current time tool',
      };
    }

    // B. TOOL_ACTION:
    if (isTimeInquiry) {
      return {
        category: IntentCategory.TOOL_ACTION,
        requiresRag: false,
        suggestedTools: ['getCurrentTime'],
        confidence: 0.95,
        reasoning: 'User asked for current time or date requiring getCurrentTime tool',
      };
    }

    if (isOrderInquiry || orderMatch) {
      return {
        category: IntentCategory.TOOL_ACTION,
        requiresRag: false,
        suggestedTools: ['getOrderStatus'],
        confidence: 0.95,
        reasoning: 'User inquiry targets specific order status lookup',
      };
    }

    if (isTicketInquiry) {
      return {
        category: IntentCategory.TOOL_ACTION,
        requiresRag: false,
        suggestedTools: ['createSupportTicket'],
        confidence: 0.9,
        reasoning: 'User inquiry requires creating a support ticket',
      };
    }

    // C. HUMAN_HANDOFF (combined or matched earlier)
    if (isHumanHandoff) {
      return {
        category: IntentCategory.HUMAN_HANDOFF,
        requiresRag: false,
        suggestedTools: ['escalateToHuman'],
        confidence: 0.95,
        reasoning: 'Escalation to live human representative requested',
      };
    }

    // D. BUSINESS_KNOWLEDGE:
    if (isBusinessKnowledge) {
      return {
        category: IntentCategory.BUSINESS_KNOWLEDGE,
        requiresRag: true,
        suggestedTools: ['searchKnowledgeBase'],
        confidence: 0.9,
        reasoning: 'User inquiry depends on company documentation/policy (pgvector RAG required)',
      };
    }

    // E. GENERAL:
    // Greetings, general tech questions, math, definitions, or general conversation
    return {
      category: IntentCategory.GENERAL,
      requiresRag: false,
      suggestedTools: [],
      confidence: isGreeting || isGeneralExplanation ? 0.95 : 0.8,
      reasoning: isGreeting
        ? 'General greeting / welcome conversation'
        : 'General question answerable using model knowledge without company private data or tools',
    };
  }
}
