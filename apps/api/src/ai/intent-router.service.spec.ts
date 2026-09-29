import { IntentRouterService } from './intent-router.service';
import { IntentCategory } from '@ai-support/types';

describe('IntentRouterService', () => {
  let router: IntentRouterService;

  beforeEach(() => {
    router = new IntentRouterService();
  });

  it('should route simple greeting to GENERAL without RAG', () => {
    const res = router.classify('Hello');
    expect(res.category).toBe(IntentCategory.GENERAL);
    expect(res.requiresRag).toBe(false);
    expect(res.suggestedTools).toHaveLength(0);
  });

  it('should route general knowledge question to GENERAL without RAG', () => {
    const res = router.classify('What is Docker?');
    expect(res.category).toBe(IntentCategory.GENERAL);
    expect(res.requiresRag).toBe(false);
  });

  it('should route time inquiry to TOOL_ACTION with getCurrentTime', () => {
    const res = router.classify('What time is it?');
    expect(res.category).toBe(IntentCategory.TOOL_ACTION);
    expect(res.requiresRag).toBe(false);
    expect(res.suggestedTools).toContain('getCurrentTime');
  });

  it('should route business policy inquiry to BUSINESS_KNOWLEDGE with RAG', () => {
    const res = router.classify('What is your return policy?');
    expect(res.category).toBe(IntentCategory.BUSINESS_KNOWLEDGE);
    expect(res.requiresRag).toBe(true);
    expect(res.suggestedTools).toContain('searchKnowledgeBase');
  });

  it('should route payment inquiry to BUSINESS_KNOWLEDGE with RAG', () => {
    const res = router.classify('What payment methods do you support?');
    expect(res.category).toBe(IntentCategory.BUSINESS_KNOWLEDGE);
    expect(res.requiresRag).toBe(true);
  });

  it('should route order lookup to TOOL_ACTION with getOrderStatus', () => {
    const res = router.classify('Where is order ACME-1001?');
    expect(res.category).toBe(IntentCategory.TOOL_ACTION);
    expect(res.requiresRag).toBe(false);
    expect(res.suggestedTools).toContain('getOrderStatus');
  });

  it('should route human request to HUMAN_HANDOFF', () => {
    const res = router.classify('I want to talk to a human');
    expect(res.category).toBe(IntentCategory.HUMAN_HANDOFF);
    expect(res.requiresRag).toBe(false);
    expect(res.suggestedTools).toContain('escalateToHuman');
  });

  it('should route mixed general explanation and company policy to MIXED with RAG', () => {
    const res = router.classify("What is a refund, and what is Acme's refund policy?");
    expect(res.category).toBe(IntentCategory.MIXED);
    expect(res.requiresRag).toBe(true);
  });

  it('should route mixed business policy and order lookup to MIXED with RAG', () => {
    const res = router.classify('Explain our return policy and tell me whether order ACME-1001 has shipped.');
    expect(res.category).toBe(IntentCategory.MIXED);
    expect(res.requiresRag).toBe(true);
    expect(res.suggestedTools).toContain('getOrderStatus');
  });
});
