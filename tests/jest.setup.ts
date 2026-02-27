import { config as loadEnv } from 'dotenv';
import * as path from 'node:path';

loadEnv({ path: path.resolve(process.cwd(), '.env.test') });
