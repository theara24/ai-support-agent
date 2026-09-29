import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider } from '../llm-provider.interface';
import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class DemoProvider implements LLMProvider {
  readonly providerName = 'demo';
  readonly modelName = 'demo-deterministic';
  private readonly logger = new Logger(DemoProvider.name);

  async generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const userMessage = options.messages.filter((m) => m.role === 'user').pop()?.content || '';
    const lower = userMessage.toLowerCase();

    this.logger.log(`[DEMO_AI] Processing deterministic prompt: "${userMessage.slice(0, 100)}..."`);

    // A. Tool Result Synthesis Turns (when synthesizing tool results into user response)
    if (userMessage.includes('Tool executed: getCurrentTime')) {
      try {
        const jsonMatch = userMessage.match(/Tool result:\s*(\{[\s\S]*?\})/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[1]);
          const timeText = result.time || result.readable || 'current time';
          const tz = result.timezone || 'Asia/Phnom_Penh';
          return {
            content: `It's ${timeText} in ${tz}.`,
            tokenUsage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
          };
        }
      } catch (e) {
        this.logger.warn('Failed to parse getCurrentTime result during synthesis');
      }
      return {
        content: "Here is the current time based on the server clock.",
        tokenUsage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 },
      };
    }

    if (userMessage.includes('Tool executed: getOrderStatus')) {
      try {
        const jsonMatch = userMessage.match(/Tool result:\s*(\{[\s\S]*?\})/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[1]);
          const itemsStr = Array.isArray(result.items) ? result.items.join(', ') : result.items;
          return {
            content: `Hello! I'd be happy to help you with that.\n\nYour order **${result.orderId}** has been **${(result.status || '').toLowerCase()}** via ${result.carrier}. Here are the details for your shipment:\n\n* **Tracking Number:** ${result.trackingNumber}\n* **Estimated Delivery:** ${result.estimatedDelivery}\n* **Items in order:** ${itemsStr}\n* **Total Amount:** ${result.totalAmount}\n\nPlease let me know if you need help with anything else!`,
            tokenUsage: { promptTokens: 40, completionTokens: 35, totalTokens: 75 },
          };
        }
      } catch (e) {
        this.logger.warn('Failed to parse getOrderStatus result during synthesis');
      }
    }

    // B. Tool Detection Calls (when tools are available to call)
    // 1. Current Time tool detection
    const isTimeInquiry =
      lower.includes('what time is it') ||
      lower.includes('what is the time') ||
      lower.includes("what's the time") ||
      lower.includes('current time') ||
      lower.includes('tell me the time') ||
      lower.includes("what's today's date") ||
      lower.includes('what date is it') ||
      lower.includes('what day is today') ||
      lower.includes('current date');

    if (isTimeInquiry && options.tools?.some((t) => t.name === 'getCurrentTime')) {
      return {
        content: 'Checking current time...',
        toolCalls: [
          {
            id: `call_demo_${Date.now()}`,
            name: 'getCurrentTime',
            arguments: { timezone: 'Asia/Phnom_Penh' },
          },
        ],
        tokenUsage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 },
      };
    }

    // 2. Order lookup tool detection
    const orderMatch = userMessage.match(/ACME-\d{4}/i);
    if (orderMatch && options.tools?.some((t) => t.name === 'getOrderStatus')) {
      const orderId = orderMatch[0].toUpperCase();
      return {
        content: `Checking order status for ${orderId}...`,
        toolCalls: [
          {
            id: `call_demo_${Date.now()}`,
            name: 'getOrderStatus',
            arguments: { orderId },
          },
        ],
        tokenUsage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
      };
    }

    // 3. Human escalation request detection
    const wantsHuman =
      lower.includes('human') ||
      lower.includes('agent') ||
      lower.includes('representative') ||
      lower.includes('real person') ||
      lower.includes('escalat');

    if (wantsHuman && options.tools?.some((t) => t.name === 'escalateToHuman')) {
      return {
        content: 'I understand you would like to speak to a human representative. Escalating your request now...',
        toolCalls: [
          {
            id: `call_demo_${Date.now()}`,
            name: 'escalateToHuman',
            arguments: { reason: 'Customer requested human support agent' },
          },
        ],
        tokenUsage: { promptTokens: 25, completionTokens: 20, totalTokens: 45 },
      };
    }

    // 4. Ticket creation detection
    const wantsTicket =
      lower.includes('ticket') ||
      lower.includes('complain') ||
      lower.includes('damaged') ||
      lower.includes('broken');

    if (wantsTicket && options.tools?.some((t) => t.name === 'createSupportTicket')) {
      return {
        content: 'I am creating an official support ticket for this issue...',
        toolCalls: [
          {
            id: `call_demo_${Date.now()}`,
            name: 'createSupportTicket',
            arguments: {
              title: 'Customer complaint / damaged order',
              description: userMessage,
              priority: 'HIGH',
            },
          },
        ],
        tokenUsage: { promptTokens: 35, completionTokens: 25, totalTokens: 60 },
      };
    }

    // C. Mixed Questions
    if (lower.includes('what is a refund') && (lower.includes('acme') || lower.includes('policy') || lower.includes('refund policy'))) {
      return {
        content:
          'A refund is the repayment of monetary funds to a customer when a product is returned, an order is cancelled, or a service is deemed unsatisfactory.\n\nRegarding Acme\'s policy: Acme provides a 30-day full refund policy for products returned in their original packaging. Once received, refunds are processed within 3-5 business days back to your original payment method.',
        tokenUsage: { promptTokens: 45, completionTokens: 45, totalTokens: 90 },
      };
    }

    // D. Grounded Acme policy responses
    if (lower.includes('payment') || lower.includes('pay') || lower.includes('khqr')) {
      return {
        content:
          'At Acme Support, we accept payments via KHQR, Visa, MasterCard, and direct Bank Transfer. All transactions are encrypted and processed securely.',
        tokenUsage: { promptTokens: 40, completionTokens: 30, totalTokens: 70 },
      };
    }

    if (lower.includes('refund') || lower.includes('return') || lower.includes('money back')) {
      return {
        content:
          'Acme provides a 30-day full refund policy for products returned in their original packaging. Once received, refunds are processed within 3-5 business days back to your original payment method.',
        tokenUsage: { promptTokens: 40, completionTokens: 35, totalTokens: 75 },
      };
    }

    if (lower.includes('shipping') || lower.includes('delivery')) {
      return {
        content:
          'Standard shipping with Acme takes 2-4 business days within the continental United States. Express shipping (1-2 business days) is available at checkout.',
        tokenUsage: { promptTokens: 35, completionTokens: 30, totalTokens: 65 },
      };
    }

    // E. General Knowledge Questions
    if (lower.includes('docker')) {
      return {
        content:
          'Docker is an open-source platform that enables developers to build, package, and run applications inside isolated containers. Containers bundle the application code together with all its system dependencies, ensuring consistent execution across different environments from development to production.',
        tokenUsage: { promptTokens: 25, completionTokens: 40, totalTokens: 65 },
      };
    }

    if (lower.includes('python')) {
      return {
        content:
          'Python is a high-level, general-purpose programming language renowned for its readable syntax, versatility, and extensive library ecosystem for web development, automation, and machine learning.',
        tokenUsage: { promptTokens: 25, completionTokens: 35, totalTokens: 60 },
      };
    }

    // F. General Greetings
    if (/^(?:hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)\b/i.test(lower)) {
      return {
        content:
          'Hello! I am your AI assistant. I can answer general questions, assist with Acme company policies, check order status, or connect you with a live support agent. How can I assist you today?',
        tokenUsage: { promptTokens: 20, completionTokens: 35, totalTokens: 55 },
      };
    }

    // Default polite assistant response
    return {
      content:
        'Hello! I am your AI assistant. How can I assist you today? You can ask general questions, check order status (e.g. ACME-1001), inquire about shipping or return policies, check the current time, or request human support.',
      tokenUsage: { promptTokens: 20, completionTokens: 35, totalTokens: 55 },
    };
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    // Generate deterministic 768-dimensional vector
    const vector = new Array(768).fill(0);
    for (let i = 0; i < 768; i++) {
      vector[i] = Math.sin(text.length * 7 + i * 13) * 0.05;
    }
    return vector;
  }
}
