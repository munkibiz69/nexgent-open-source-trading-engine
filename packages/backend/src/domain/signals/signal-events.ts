/**
 * Signal Events
 * 
 * Event emitter for trading signals.
 * Used to process signals immediately after creation.
 */

import { EventEmitter } from 'events';
import type { TradingSignal } from '@prisma/client';

export interface SignalCreatedEvent {
  signal: TradingSignal;
}

export interface ISignalEventEmitter {
  on(event: 'signal_created', listener: (event: SignalCreatedEvent) => void): this;
  emit(event: 'signal_created', eventData: SignalCreatedEvent): boolean;
}

export class SignalEventEmitter extends EventEmitter implements ISignalEventEmitter {
  constructor() {
    super();
  }
  
  /**
   * Emit signal created event
   */
  public emitSignalCreated(signal: TradingSignal): void {
    this.emit('signal_created', { signal });
  }
}

// Export singleton instance
export const signalEventEmitter = new SignalEventEmitter();

