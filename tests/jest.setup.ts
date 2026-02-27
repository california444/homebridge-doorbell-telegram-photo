import { config as loadEnv } from 'dotenv';
import * as path from 'path';

loadEnv({ path: path.resolve(__dirname, '.env.test') });
