/**
 * Position Events
 * 
 * Event emitter for position lifecycle events.
 * Used to notify WebSocket server and other services about position changes.
 */

import { EventEmitter } from 'events';
import type { OpenPosition } from '@nexgent/shared';

/**
 * Position event data types
 */
export interface PositionCreatedEvent {
  agentId: string;
  walletAddress: string;
  position: OpenPosition;
}

export interface PositionUpdatedEvent {
  agentId: string;
  walletAddress: string;
  position: OpenPosition;
}

export interface PositionClosedEvent {
  agentId: string;
  walletAddress: string;
  positionId: string;
  tokenAddress: string; // Added for price update manager tracking
}

/**
 * Position Event Emitter
 * 
 * Singleton event emitter for position lifecycle events.
 * Events:
 * - 'position_created': Emitted when a new position is created
 * - 'position_updated': Emitted when a position is updated (stop loss, etc.)
 * - 'position_closed': Emitted when a position is closed
 */
class PositionEventEmitter extends EventEmitter {
  private static instance: PositionEventEmitter;

  private constructor() {
    super();
    // Set max listeners to prevent memory leaks warning
    this.setMaxListeners(50);
  }

  static getInstance(): PositionEventEmitter {
    if (!PositionEventEmitter.instance) {
      PositionEventEmitter.instance = new PositionEventEmitter();
    }
    return PositionEventEmitter.instance;
  }

  /**
   * Emit position created event
   */
  emitPositionCreated(data: PositionCreatedEvent): void {
    this.emit('position_created', data);
  }

  /**
   * Emit position updated event
   */
  emitPositionUpdated(data: PositionUpdatedEvent): void {
    this.emit('position_updated', data);
  }

  /**
   * Emit position closed event
   */
  emitPositionClosed(data: PositionClosedEvent): void {
    this.emit('position_closed', data);
  }
}

// Export singleton instance
export const positionEventEmitter = PositionEventEmitter.getInstance();

// Export class for testing
export { PositionEventEmitter };

