/* eslint-disable no-useless-catch */
import { fetchWithAuth, getSnapshot, sendPictureToTelegram2 } from '../src/platformAccessory.js';
import { Logger } from 'tslog';
import { Ffmpeg } from '../src/ffmpeg.js';
process.env.NTBA_FIX_319 = '1';
process.env.NTBA_FIX_350 = '1';
import TelegramBot from 'node-telegram-bot-api';

const timeout = 20000;

const BASE_URL = 'https://httpcan.org';
const AUTH_BASE_URL = 'https://user:passwd@httpcan.org';

export default describe('Doorbell', () => {

  const botId = process.env.BOT_ID;
  const chatId = parseInt(process.env.CHAT_ID || '');

  const telegramAPI = new TelegramBot(botId || '', {
    filepath: false,
  });

  const logger = new Logger({ name: 'myLogger', minLevel: 3  });

  describe('test auth', () => {
    test('Digest Auth', async () => {
      try {
        const response = await fetchWithAuth(AUTH_BASE_URL + '/digest-auth/auth/user/passwd', 'json');
        expect(response.status).toBe(200);
        expect(response.data.authenticated).toBe(true);

      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Basic Auth', async () => {
      try {
        const response = await fetchWithAuth(AUTH_BASE_URL + '/basic-auth/user/passwd', 'json');
        expect(response.status).toBe(200);
        expect(response.data.authenticated).toBe(true);
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (JPEG)', async () => {
      try {
        const snapshot = await getSnapshot(BASE_URL + '/image/jpeg');
        expect(snapshot.length).toBeGreaterThan(0);
        const success = await sendPictureToTelegram2(snapshot, chatId, 'test', telegramAPI);
        expect(success.chat.id).toBe(chatId);
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (PNG)', async () => {
      try {
        const snapshot = await getSnapshot(BASE_URL + '/image/png');
        expect(snapshot.length).toBeGreaterThan(0);
        const success = await sendPictureToTelegram2(snapshot, chatId, 'URL PNG', telegramAPI);
        expect(success.chat.id).toBe(chatId);
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (FFMPEG)', async () => {
      const url = '-i '+BASE_URL+'/image/png';

      try {
        const ffmpeg = new Ffmpeg(logger);
        const snapshot = await (ffmpeg.fetchSnapshot(url, 'test'));

        try {
          sendPictureToTelegram2(snapshot, chatId, 'FFMPEG', telegramAPI);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          logger.error(e.message);
        }
      } catch (error) {
        throw error;
      }
    }, timeout);
  });
});