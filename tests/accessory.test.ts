/* eslint-disable no-useless-catch */
import { fetchWithAuth, getSnapshot, sendPictureToTelegram2 } from '../src/platformAccessory.js';
import { Logger } from 'tslog';
import { Ffmpeg } from '../src/ffmpeg.js';
import type { Api, Message } from 'node-telegram-bot-api';

const timeout = 20000;

const BASE_URL = 'https://httpcan.org';
const AUTH_BASE_URL = 'https://user:passwd@httpcan.org';

type SentPhoto = {
  chat_id: string | number;
  caption?: string;
  photo: unknown;
};

/**
 * Minimal stand-in for the Telegram Api. It records every sendPhoto call
 * instead of talking to Telegram, so this suite never posts into a real chat.
 */
function createFakeTelegramApi(): { api: Api; sent: SentPhoto[] } {
  const sent: SentPhoto[] = [];

  const api = {
    sendPhoto: (params: SentPhoto): Promise<Message> => {
      sent.push(params);
      return Promise.resolve({
        message_id: sent.length,
        date: Math.floor(Date.now() / 1000),
        chat: {
          id: typeof params.chat_id === 'string' ? parseInt(params.chat_id) : params.chat_id,
          type: 'private',
        },
        caption: params.caption,
      } as unknown as Message);
    },
  } as unknown as Api;

  return { api, sent };
}

export default describe('Doorbell', () => {

  // Never talks to Telegram - the dedicated live test in
  // tests/telegram.live.test.ts is the only one that sends real messages.
  const chatId = parseInt(process.env.CHAT_ID || '-1000000000000');

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
        const { api, sent } = createFakeTelegramApi();
        const snapshot = await getSnapshot(BASE_URL + '/image/jpeg');
        expect(snapshot.length).toBeGreaterThan(0);
        const success = await sendPictureToTelegram2(snapshot, chatId, 'test', api);
        expect(success.chat.id).toBe(chatId);
        expect(sent).toHaveLength(1);
        expect(sent[0].caption).toBe('test');
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (PNG)', async () => {
      try {
        const { api, sent } = createFakeTelegramApi();
        const snapshot = await getSnapshot(BASE_URL + '/image/png');
        expect(snapshot.length).toBeGreaterThan(0);
        const success = await sendPictureToTelegram2(snapshot, chatId, 'URL PNG', api);
        expect(success.chat.id).toBe(chatId);
        expect(sent).toHaveLength(1);
        expect(sent[0].caption).toBe('URL PNG');
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (FFMPEG)', async () => {
      const url = '-i '+BASE_URL+'/image/png';

      try {
        const { api, sent } = createFakeTelegramApi();
        const ffmpeg = new Ffmpeg(logger);
        const snapshot = await (ffmpeg.fetchSnapshot(url, 'test'));
        expect(snapshot.length).toBeGreaterThan(0);

        try {
          await sendPictureToTelegram2(snapshot, chatId, 'FFMPEG', api);
          expect(sent).toHaveLength(1);
          expect(sent[0].caption).toBe('FFMPEG');
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
