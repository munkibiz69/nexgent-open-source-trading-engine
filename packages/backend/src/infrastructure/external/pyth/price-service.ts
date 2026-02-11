/**
 * Price Service
 * 
 * Fetches and maintains SOL/USD price from Pyth Network.
 * Stores price in memory for fast access.
 * Uses SSE streaming for real-time updates with polling fallback.
 */

interface PythPriceResponse {
  parsed?: Array<{
    id: string;
    price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
  }>;
}

interface PythSSEResponse {
  parsed?: Array<{
    id: string;
    price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
  }>;
  binary?: {
    encoding: string;
    data: string[];
  };
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'fallback';

export class PriceService {
  private static instance: PriceService;
  private solPrice: number = 100; // Default fallback price
  private lastUpdated: Date | null = null;
  private isInitialized = false;

  // SSE Streaming
  private eventSource: {
    onopen: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    close(): void;
  } | null = null;
  private isStreaming: boolean = false;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000; // Base delay in ms
  private readonly streamingFallbackEnabled: boolean = true;

  // Polling Fallback
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly pollInterval = 10000; // 10 seconds

  // Connection Health Monitoring
  private lastMessageTime: Date | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private readonly staleConnectionThreshold = 30000; // 30 seconds

  // Proactive reconnection before 24-hour Pyth timeout
  private proactiveReconnectInterval: NodeJS.Timeout | null = null;
  private readonly proactiveReconnectHours = 23; // Reconnect at 23 hours to avoid 24-hour timeout

  // Error Tracking
  private lastError: Error | null = null;

  // Pyth Network configuration (public, stable values)
  private readonly baseUrl = 'https://hermes.pyth.network';
  private readonly solUsdFeedId = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';

  private constructor() {
    // No initialization needed - values are hardcoded
  }

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  /**
   * Initialize price service
   * Fetches price on startup and starts SSE streaming (with polling fallback)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('📊 Initializing price service...');

    // Fetch price immediately on startup (ensures we have a price even if streaming fails)
    await this.fetchPrice();

    // Try to start SSE streaming, fallback to polling if it fails
    try {
      await this.startStreaming();
    } catch (error) {
      console.warn('⚠️  Failed to start SSE streaming, falling back to polling:', error);
      this.fallbackToPolling();
    }

    this.isInitialized = true;
    console.log('✅ Price service initialized');
  }

  /**
   * Get current SOL price in USD
   * Returns in-memory value (fast, no API call)
   */
  getSolPrice(): number {
    return this.solPrice;
  }

  /**
   * Get timestamp of last price update
   */
  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get last error if any
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Check if price is stale (> 30 seconds old)
   */
  isPriceStale(): boolean {
    if (!this.lastUpdated) {
      return true;
    }
    const age = Date.now() - this.lastUpdated.getTime();
    return age > 30000; // 30 seconds
  }

  /**
   * Fetch price from Pyth Network API
   */
  private async fetchPrice(): Promise<void> {
    if (!this.solUsdFeedId) {
      console.warn('⚠️  Cannot fetch price: feed ID not configured');
      return;
    }

    try {
      const url = `${this.baseUrl}/v2/updates/price/latest?ids[]=${this.solUsdFeedId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as PythPriceResponse;

      // Handle different response formats
      const priceData = data.parsed?.[0] || (Array.isArray(data) ? data[0] : null);

      if (!priceData?.price) {
        throw new Error('Invalid price data from Pyth API');
      }

      // Normalize price: price * 10^expo
      const price = parseFloat(priceData.price.price);
      const expo = priceData.price.expo || -8;
      const actualPrice = price * Math.pow(10, expo);

      // Update in-memory price
      this.solPrice = actualPrice;
      this.lastUpdated = new Date();

      console.log(`💰 Price updated: $${actualPrice.toFixed(2)} SOL/USD`);
    } catch (error) {
      console.error('❌ Error fetching price from Pyth:', error);
      // Don't throw - wait for next update
      // Price remains at last known value
    }
  }

  /**
   * Start SSE streaming connection
   */
  private async startStreaming(): Promise<void> {
    if (!this.solUsdFeedId) {
      throw new Error('Cannot start streaming: feed ID not configured');
    }

    if (this.isStreaming && this.eventSource) {
      return; // Already streaming
    }

    // Close existing connection if any
    this.stopStreaming();

    this.connectionState = 'connecting';
    this.lastError = null;

    try {
      // Build SSE URL - Pyth uses /v2/updates/price/stream endpoint
      const streamUrl = `${this.baseUrl}/v2/updates/price/stream?ids[]=${this.solUsdFeedId}`;

      // Use eventsource package - dynamic import for ES modules
      // eventsource exports EventSource as a named export
      const EventSourceModule = await import('eventsource');
      // Access EventSource from the named exports
      const EventSourceClass = EventSourceModule.EventSource;

      if (!EventSourceClass) {
        throw new Error('EventSource class not found in eventsource package');
      }

      // Create EventSource instance
      this.eventSource = new EventSourceClass(streamUrl) as {
        onopen: ((event: Event) => void) | null;
        onmessage: ((event: MessageEvent) => void) | null;
        onerror: ((event: Event) => void) | null;
        close(): void;
      };

      this.isStreaming = true;

      // Handle successful connection
      this.eventSource.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0; // Reset on successful connection
        this.lastMessageTime = new Date();
        console.log('📡 SSE connection established');
        this.startHealthMonitoring();
        this.startProactiveReconnection();
      };

      // Handle incoming messages
      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          this.parsePriceUpdate(event.data);
          this.lastMessageTime = new Date();
        } catch (error) {
          console.error('❌ Error parsing price update:', error);
          this.lastError = error instanceof Error ? error : new Error(String(error));
        }
      };

      // Handle errors
      this.eventSource.onerror = (error: Event) => {
        this.handleStreamError(error);
      };

    } catch (error) {
      this.connectionState = 'disconnected';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      this.isStreaming = false;
      throw error;
    }
  }

  /**
   * Parse price update from SSE message
   * Pyth SSE format: {"parsed":[{"id":"...","price":{"price":"...","expo":-8,...}}],"binary":{...}}
   */
  private parsePriceUpdate(data: string): void {
    try {
      // Parse JSON message - Pyth SSE format has 'parsed' array
      const response: PythSSEResponse = JSON.parse(data);

      // Extract price data from parsed array
      if (!response.parsed || !Array.isArray(response.parsed) || response.parsed.length === 0) {
        throw new Error('Invalid price data: missing parsed array');
      }

      // Find the message matching our feed ID, or use first one
      const message = response.parsed.find((m) => m.id === this.solUsdFeedId) || response.parsed[0];

      if (!message || !message.price) {
        throw new Error('Invalid price data: missing price field');
      }

      // Normalize price: price * 10^expo
      const price = parseFloat(message.price.price);
      const expo = message.price.expo || -8;
      const actualPrice = price * Math.pow(10, expo);

      // Only update and log if price actually changed (reduces noise and CPU)
      const priceChanged = Math.abs(actualPrice - this.solPrice) > 0.05; // Only log if change > $0.05 (5 cents)

      if (priceChanged || !this.lastUpdated) {
        // Update in-memory price
        this.solPrice = actualPrice;
        this.lastUpdated = new Date();
        console.log(`💰 Price updated via SSE: $${actualPrice.toFixed(2)} SOL/USD`);
      } else {
        // Silently update timestamp for staleness check, but don't log
        this.lastUpdated = new Date();
      }
    } catch (error) {
      console.error('❌ Error parsing SSE price update:', error);
      // Log the raw data for debugging
      if (error instanceof Error && error.message.includes('Invalid price data')) {
        console.error('Raw SSE data:', data.substring(0, 200)); // Log first 200 chars for debugging
      }
      throw error;
    }
  }

  /**
   * Handle SSE stream errors
   */
  private handleStreamError(error: Event): void {
    this.lastError = new Error('SSE connection error');
    console.error('❌ SSE connection error:', error);

    // Close the connection
    this.stopStreaming();

    // Attempt reconnection if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
      this.reconnect();
    } else {
      console.warn('⚠️  Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
    }
  }

  /**
   * Reconnect to SSE stream with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.fallbackToPolling();
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    this.connectionState = 'connecting';

    console.log(`🔄 Reconnecting in ${delay}ms...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.startStreaming();
    } catch (error) {
      // Reconnection failed, will be handled by handleStreamError
      console.error('❌ Reconnection failed:', error);
    }
  }

  /**
   * Fallback to polling when SSE fails
   */
  private fallbackToPolling(): void {
    if (!this.streamingFallbackEnabled) {
      return;
    }

    this.connectionState = 'fallback';
    this.stopStreaming();
    this.startPollingFallback();
    console.log('⚠️  Falling back to polling mode');
  }

  /**
   * Start connection health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Check if connection is healthy (receiving messages)
   */
  private checkConnectionHealth(): void {
    if (!this.lastMessageTime || this.connectionState !== 'connected') {
      return;
    }

    const timeSinceLastMessage = Date.now() - this.lastMessageTime.getTime();

    if (timeSinceLastMessage > this.staleConnectionThreshold) {
      console.warn('⚠️  SSE connection appears stale (no messages for 30s), reconnecting...');
      this.stopStreaming();
      this.reconnect();
    }
  }

  /**
   * Start proactive reconnection before 24-hour Pyth timeout
   * Reconnects at 23 hours to avoid connection drop
   */
  private startProactiveReconnection(): void {
    // Clear any existing proactive reconnect timer
    if (this.proactiveReconnectInterval) {
      clearTimeout(this.proactiveReconnectInterval);
      this.proactiveReconnectInterval = null;
    }

    // Schedule reconnection at 23 hours (before 24-hour Pyth timeout)
    const reconnectDelay = this.proactiveReconnectHours * 60 * 60 * 1000; // 23 hours in ms

    this.proactiveReconnectInterval = setTimeout(() => {
      console.log('🔄 Proactive reconnection: Reconnecting before 24-hour Pyth timeout...');
      this.stopStreaming();
      this.reconnectAttempts = 0; // Reset attempts for proactive reconnect
      this.reconnect();
    }, reconnectDelay);
  }

  /**
   * Stop SSE streaming
   */
  private stopStreaming(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isStreaming = false;
    this.connectionState = 'disconnected';
    this.lastMessageTime = null;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.proactiveReconnectInterval) {
      clearTimeout(this.proactiveReconnectInterval);
      this.proactiveReconnectInterval = null;
    }
  }

  /**
   * Start background polling (fallback mode)
   */
  private startPollingFallback(): void {
    if (this.updateInterval) {
      return; // Already polling
    }

    this.updateInterval = setInterval(() => {
      this.fetchPrice();
    }, this.pollInterval);

    console.log(`🔄 Price polling started (fallback mode, every ${this.pollInterval / 1000} seconds)`);
  }


  /**
   * Stop background polling
   */
  stopPolling(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️  Price polling stopped');
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    this.stopStreaming();
    this.stopPolling();
    this.isInitialized = false;
    this.connectionState = 'disconnected';
    console.log('👋 Price service shutdown');
  }
}

