/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';
import type { DoorbellTelegramPhoto } from './platform.js';
import TelegramBot from 'node-telegram-bot-api';
import { Ffmpeg } from './ffmpeg.js';
import DigestClient from 'digest-fetch';

const timeout:number = 5000;

export type Device = {
  name:string,
  hostName:string,
  botId:string,
  chatIds:string[]
}

export interface Logging2 {
  info(message: string, ...parameters: any[]): void;
  warn(message: string, ...parameters: any[]): void;
  error(message: string, ...parameters: any[]): void;
  debug(message: string, ...parameters: any[]): void;
}

export function sendPictureToTelegram2(
  data: Buffer,
  chatId:string|number,
  caption:string, tApi): Promise<TelegramBot.Message> {
  const fileOptions = {
  // Explicitly specify the file name.
    filename: 'photo.jpeg',
    // Explicitly specify the MIME type.
    contentType: 'image/jpeg',
  };

  return tApi.sendPhoto(chatId, data, {
    caption: caption,
  }, fileOptions);
}

export type RequestAuthResponse<TData> = {
  data: TData;
  status: number;
  statusText: string;
  headers: Record<string, string>;
};

export type FetchResponseType = 'arraybuffer' | 'json' | 'text';

export async function fetchWithAuth(
  url: string,
  responseType: FetchResponseType = 'arraybuffer',
): Promise<RequestAuthResponse<any>> {

  let sanitizedUrl = url;
  let urlCreds: [string, string] | undefined;
  try {
    const parsed = new URL(url);
    if (parsed.username && parsed.password) {
      urlCreds = [decodeURIComponent(parsed.username), decodeURIComponent(parsed.password)];
    }
    if (parsed.username || parsed.password) {
      parsed.username = '';
      parsed.password = '';
      sanitizedUrl = parsed.toString();
    }
  } catch {
    // ignore invalid URLs
  }

  const hasCreds = !!urlCreds;

  const requestInit: RequestInit = {
    method: 'GET',
  };

  // Provide a fresh timeout-based AbortSignal for each use of this RequestInit.
  // This avoids sharing a single AbortController across multiple HTTP attempts
  // (for example, digest auth challenge + authenticated request or basic auth fallback).
  Object.defineProperty(requestInit, 'signal', {
    get: () => AbortSignal.timeout(timeout),
  });
  const parseBody = async (response: Response) => {
    if (responseType === 'arraybuffer') {
      const ab = await response.arrayBuffer();
      return Buffer.from(ab);
    }
    if (responseType === 'json') {
      return await response.json();
    }
    return await response.text();
  };

  const toResponse = async (response: Response): Promise<RequestAuthResponse<any>> => {
    const data = await parseBody(response);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
    };
  };

  const runFetch = async (client?: DigestClient): Promise<Response> => {
    if (client) {
      return await client.fetch(sanitizedUrl, requestInit);
    }
    return await fetch(sanitizedUrl, requestInit);
  };

  try {
    let response: Response;

    if (hasCreds) {
      const [username, password] = urlCreds!;
      // 1) try Digest first
      response = await runFetch(new DigestClient(username, password));

      // 2) if not successful and server offers Basic, retry with basic mode
      const wwwAuth = response.headers.get('www-authenticate') || '';
      if (!response.ok && response.status === 401 && /\bbasic\b/i.test(wwwAuth)) {
        response = await runFetch(new DigestClient(username, password, { basic: true }));
      }
    } else {
      response = await runFetch();
    }

    const responseLike = await toResponse(response);
    if (!response.ok) {
      const err: any = new Error(`Request failed with status ${response.status}`);
      err.response = responseLike;
      throw err;
    }
    return responseLike;
  } finally {
    clearTimeout(timeoutTimer);
  }
}

export async function getSnapshot(url: string): Promise<Buffer> {
  const response = await fetchWithAuth(url, 'arraybuffer');
  return response.data as Buffer;
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DoorbellTelegramPhotoAccessory {

  private service: Service;
  private telegramAPI: any;
  public readonly log: Logging;

  private readonly name: string;
  private readonly botId: string;
  private readonly chatIds: string[];
  private readonly locale: string;
  private readonly host: string;
  private readonly useFfmpeg: boolean;
  private readonly ffmpeg: Ffmpeg;
  private readonly platform: DoorbellTelegramPhoto;
  private readonly accessory: PlatformAccessory;

  constructor(
    platform: DoorbellTelegramPhoto,
    accessory: PlatformAccessory,
    device: Device,
  ) {
    this.platform = platform;
    this.accessory = accessory;
    this.name = device.name;
    this.host = device.hostName;
    this.botId = device.botId;
    this.chatIds = device.chatIds || [];

    this.log = platform.log;
    this.locale = platform.config.locale || 'de-DE';

    this.useFfmpeg = platform.config.useFfmpeg;
    this.ffmpeg = new Ffmpeg(this.log);

    this.telegramAPI = new TelegramBot(this.botId, {
      filepath: false,
    });

    this.log.debug('Then botId is: ' + this.botId);
    this.log.debug('The chatIds are: '+this.chatIds.toString());


    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'California444')
      .setCharacteristic(this.platform.Characteristic.Model, 'Telegram Photo Doorbell');

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.doorbellHandler.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async doorbellHandler() {

    this.log.info('Doorbell ring received.');
    const timeInfo: string = new Date().toLocaleString(this.locale);
    const caption = `${this.name}  (${timeInfo})`;

    setTimeout(() => {
      this.log.debug('Doorbell handler timeout.' + timeInfo);
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }, 1000);

    const url = this.host;

    const sendToAll = async (snapshot: Buffer) => {
      const results = await Promise.allSettled(
        this.chatIds.map((chatId) => sendPictureToTelegram2(snapshot, chatId, caption, this.telegramAPI)),
      );

      results.forEach((result, index) => {
        const chatId = this.chatIds[index];
        if (result.status === 'fulfilled') {
          this.log.info('Picture send to chatId: ' + chatId);
          return;
        }

        const reason: any = result.reason;
        const message = reason?.message ? String(reason.message) : String(reason);
        this.log.error('Picture not send to chatId: ' + chatId + ' due to error: ' + message);
      });
    };

    if (this.useFfmpeg) {
      this.log.debug('Using ffmpeg to grab the snapshot...');

      try {
        const cached = !!this.ffmpeg.snapshotPromise;
        if (cached) {
          this.log.info('using cached picture...');
        }

        const snapshot = await (this.ffmpeg.snapshotPromise || this.ffmpeg.fetchSnapshot(url, this.name));
        await sendToAll(snapshot);
      } catch (e: any) {
        this.log.error(e.message);
        this.log.debug(e.stack);
      }
    } else {
      try {
        const snapshot = await getSnapshot(url);
        this.log.info('Picture received successful!');
        await sendToAll(snapshot);
      } catch (error: any) {
        const message = error?.message ? String(error.message) : String(error);
        this.log.error('No Picture received: ' + message);
      }
    }
  }

  async getOn(): Promise<CharacteristicValue> {

    //this.platform.log.debug('Get Characteristic On -> 0');
    //this.service.getCharacteristic(this.platform.Characteristic.On).value

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return 0;
  }
}