/**
 * Application Configuration
 * 
 * General application settings including server port, environment, and CORS.
 */

interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const appConfig: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : process.env.NODE_ENV === 'production'
    ? [] // Must be set in production
    : ['http://localhost:3000'],
  logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
};

