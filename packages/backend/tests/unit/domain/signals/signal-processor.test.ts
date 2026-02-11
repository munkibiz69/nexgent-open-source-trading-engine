/**
 * Signal Processor Unit Tests
 */

// Jest globals are available without import
import { SignalProcessor } from '@/domain/signals/signal-processor.service.js';
import { signalEventEmitter } from '@/domain/signals/signal-events.js';
import { agentEligibilityService } from '@/domain/signals/agent-eligibility.service.js';
import { signalExecutionService } from '@/domain/signals/execution-tracker.service.js';
import { tradingExecutor } from '@/domain/trading/trading-executor.service.js';

// Mock dependencies
jest.mock('@/domain/signals/agent-eligibility.service.js');
jest.mock('@/domain/signals/execution-tracker.service.js');
jest.mock('@/domain/trading/trading-executor.service.js');
jest.mock('@/infrastructure/external/jupiter/index.js', () => ({
  fetchTokenMetrics: jest.fn().mockResolvedValue(null),
}));

describe('SignalProcessor', () => {
  let signalProcessor: SignalProcessor;

  // Mock data
  const mockSignal: any = {
    id: 123,
    tokenAddress: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    signalStrength: 5,
    signalType: 'BUY',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgentId = 'agent-123';
  const mockExecutionId = 'exec-456';
  const mockTransactionId = 'tx-789';

  beforeEach(() => {
    jest.clearAllMocks();
    // Get singleton instance (it might already be initialized)
    signalProcessor = SignalProcessor.getInstance();
    
    // Reset mocks
    (agentEligibilityService.getEligibleAgents as jest.Mock).mockResolvedValue([mockAgentId]);
    (signalExecutionService.createPendingExecution as jest.Mock).mockResolvedValue(mockExecutionId);
    (tradingExecutor.executePurchase as jest.Mock).mockResolvedValue({
      success: true,
      transactionId: mockTransactionId,
    });
  });

  it('should process signal when signal_created event is emitted', async () => {
    // Spy on processSignal
    const processSpy = jest.spyOn(signalProcessor, 'processSignal');

    // Emit event
    signalEventEmitter.emitSignalCreated(mockSignal);

    // Wait for event loop (events are synchronous but handlers might be async)
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(processSpy).toHaveBeenCalledWith(mockSignal);
  });

  it('should execute trades for eligible agents', async () => {
    await signalProcessor.processSignal(mockSignal);

    // 1. Check eligibility was called with signal and token metrics (fetchTokenMetrics mocked to return null)
    expect(agentEligibilityService.getEligibleAgents).toHaveBeenCalledWith(mockSignal, null);

    // 2. Check execution creation
    expect(signalExecutionService.createPendingExecution).toHaveBeenCalledWith(mockSignal.id, mockAgentId);

    // 3. Check trade execution
    expect(tradingExecutor.executePurchase).toHaveBeenCalledWith(expect.objectContaining({
      agentId: mockAgentId,
      tokenAddress: mockSignal.tokenAddress,
      signalId: mockSignal.id,
    }));

    // 4. Check success update
    expect(signalExecutionService.updateExecutionSuccess).toHaveBeenCalledWith(
      mockExecutionId, 
      mockTransactionId
    );
  });

  it('should handle execution failures gracefully', async () => {
    const error = new Error('Insufficient funds');
    (tradingExecutor.executePurchase as jest.Mock).mockRejectedValue(error);

    await signalProcessor.processSignal(mockSignal);

    // Check failure update
    expect(signalExecutionService.updateExecutionFailure).toHaveBeenCalledWith(
      mockExecutionId, 
      error
    );
  });

  it('should skip if execution already exists', async () => {
    (signalExecutionService.createPendingExecution as jest.Mock).mockResolvedValue(null);

    await signalProcessor.processSignal(mockSignal);

    expect(tradingExecutor.executePurchase).not.toHaveBeenCalled();
  });

  it('should do nothing if no eligible agents', async () => {
    (agentEligibilityService.getEligibleAgents as jest.Mock).mockResolvedValue([]);

    await signalProcessor.processSignal(mockSignal);

    expect(signalExecutionService.createPendingExecution).not.toHaveBeenCalled();
    expect(tradingExecutor.executePurchase).not.toHaveBeenCalled();
  });

  it('should process multiple eligible agents in parallel', async () => {
    // Arrange
    const agentIds = ['agent-1', 'agent-2', 'agent-3'];
    (agentEligibilityService.getEligibleAgents as jest.Mock).mockResolvedValue(agentIds);
    (signalExecutionService.createPendingExecution as jest.Mock)
      .mockResolvedValueOnce('exec-1')
      .mockResolvedValueOnce('exec-2')
      .mockResolvedValueOnce('exec-3');
    (tradingExecutor.executePurchase as jest.Mock).mockResolvedValue({
      success: true,
      transactionId: 'tx-123',
    });

    // Act
    await signalProcessor.processSignal(mockSignal);

    // Assert
    expect(signalExecutionService.createPendingExecution).toHaveBeenCalledTimes(3);
    expect(tradingExecutor.executePurchase).toHaveBeenCalledTimes(3);
    expect(signalExecutionService.updateExecutionSuccess).toHaveBeenCalledTimes(3);
  });

  it('should handle partial failures when some agents fail', async () => {
    // Arrange
    const agentIds = ['agent-1', 'agent-2'];
    (agentEligibilityService.getEligibleAgents as jest.Mock).mockResolvedValue(agentIds);
    (signalExecutionService.createPendingExecution as jest.Mock)
      .mockResolvedValueOnce('exec-1')
      .mockResolvedValueOnce('exec-2');
    (tradingExecutor.executePurchase as jest.Mock)
      .mockResolvedValueOnce({ success: true, transactionId: 'tx-1' })
      .mockRejectedValueOnce(new Error('Insufficient balance'));

    // Act
    await signalProcessor.processSignal(mockSignal);

    // Assert
    expect(signalExecutionService.updateExecutionSuccess).toHaveBeenCalledTimes(1);
    expect(signalExecutionService.updateExecutionFailure).toHaveBeenCalledTimes(1);
  });
});

