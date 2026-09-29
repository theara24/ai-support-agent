import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetCurrentTimeTool } from './get-current-time.tool';

describe('GetCurrentTimeTool', () => {
  let tool: GetCurrentTimeTool;
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'COMPANY_TIMEZONE') return 'Asia/Phnom_Penh';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentTimeTool,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    tool = module.get<GetCurrentTimeTool>(GetCurrentTimeTool);
  });

  it('should be defined with correct LLM definition', () => {
    expect(tool).toBeDefined();
    expect(tool.definition.name).toBe('getCurrentTime');
    expect(tool.definition.parameters.properties.timezone).toBeDefined();
  });

  it('should return structured real clock data with default company timezone (Asia/Phnom_Penh)', async () => {
    const beforeMs = Date.now();
    const result = await tool.execute({}, { conversationId: 'c1', customerId: 'cust1' });
    const afterMs = Date.now();

    expect(result.timezone).toBe('Asia/Phnom_Penh');
    expect(result.iso).toBeDefined();
    const parsedIsoMs = new Date(result.iso).getTime();
    expect(parsedIsoMs).toBeGreaterThanOrEqual(beforeMs - 1000);
    expect(parsedIsoMs).toBeLessThanOrEqual(afterMs + 1000);

    expect(result.readable).toBeDefined();
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.time).toBeDefined();
    expect(result.dayOfWeek).toBeDefined();
  });

  it('should support custom requested timezone (e.g., America/New_York)', async () => {
    const result = await tool.execute(
      { timezone: 'America/New_York' },
      { conversationId: 'c1', customerId: 'cust1' },
    );

    expect(result.timezone).toBe('America/New_York');
    expect(result.iso).toBeDefined();
    expect(result.readable).toBeDefined();
  });

  it('should safely fall back to default company timezone on invalid timezone string', async () => {
    const result = await tool.execute(
      { timezone: 'Invalid/Non_Existent_Timezone' },
      { conversationId: 'c1', customerId: 'cust1' },
    );

    expect(result.timezone).toBe('Asia/Phnom_Penh');
    expect(result.date).toBeDefined();
  });
});
