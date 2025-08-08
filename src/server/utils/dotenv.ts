import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Environment variable validation error
 */
class EnvValidationError extends Error {
  public readonly errors: string[];
  
  constructor(message: string, errors: string[]) {
    super(`${message}\n${errors.join('\n')}`);
    this.name = 'EnvValidationError';
    this.errors = errors;
  }
}

/**
 * Environment variable validator class
 */
class EnvValidator {
  private readonly requiredVars: ReadonlyArray<{
    name: string;
    validate: (value: string) => boolean;
    message: string;
  }> = [
    {
      name: 'NODE_ENV',
      validate: (value: string) => 
        ['development', 'production', 'test'].includes(value),
      message: 'NODE_ENV must be one of: development, production, test',
    },
    {
      name: 'HTTP2_PRIVATE_KEY',
      validate: (value: string) => value.length > 0,
      message: 'HTTP2_PRIVATE_KEY is required',
    },
    {
      name: 'HTTP2_CERTIFICATE',
      validate: (value: string) => value.length > 0,
      message: 'HTTP2_CERTIFICATE is required',
    },
  ];

  /**
   * Validates environment variables
   * @throws {EnvValidationError} If validation fails
   */
  public validate(env: NodeJS.ProcessEnv): void {
    const errors: string[] = [];
    const validatedEnv: Record<string, string> = {};

    for (const { name, validate, message } of this.requiredVars) {
      const value = env[name] || '';
      if (!validate(value)) {
        errors.push(`- ${name}: ${message}`);
      } else {
        validatedEnv[name] = value;
      }
    }

    if (errors.length > 0) {
      throw new EnvValidationError('Environment validation failed:', errors);
    }
  }
}

/**
 * Loads environment variables from .env file
 */
function loadEnvFile(filePath: string): NodeJS.ProcessEnv {
  try {
    const content = readFileSync(filePath, 'utf8');
    const env: NodeJS.ProcessEnv = {};

    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/(^['"]|['"]$)/g, '');
        if (key && value !== undefined) {
          env[key] = value;
        }
      }
    }

    return env;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') { 
      return {};
    }
    throw error;
  }
}

/**
 * Loads and validates environment variables
 * @throws {Error} If environment configuration is invalid
 */
function initializeEnvironment(): void {
  try {
    const env = process.env.NODE_ENV || 'development';
    const envPath = resolve(process.cwd(), `.env.${env}`);
    const commonEnvPath = resolve(process.cwd(), '.env');

    // Load environment variables from files if they exist
    const envVars = existsSync(envPath) 
      ? loadEnvFile(envPath)
      : loadEnvFile(commonEnvPath);

    // Apply loaded environment variables
    Object.assign(process.env, envVars);

    // Validate environment variables
    const validator = new EnvValidator();
    validator.validate(process.env);

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error loading environment configuration';
    
    console.error('❌ Environment configuration error:', errorMessage);
    process.exit(1);
  }
}

// Initialize environment when module is imported
initializeEnvironment();
