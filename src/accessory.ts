/**
 * Developed by Roman Schlich
 * July 2021
 */

 process.env.NTBA_FIX_319 = "1";
 process.env.NTBA_FIX_350 = "1";
 const TelegramBot = require('node-telegram-bot-api');
 
import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import { request } from 'http';
import { RequestOptions } from "https";

import { URL } from 'url';

let hap: HAP;

const PLUGIN_NAME = 'homebridge-doorbell-telegram-photo';
const ACCESSORY_NAME = 'Doorbell-Telegram-Photo';
const version = require('../package.json').version; 
/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, DoorbellPhoto);
};

class DoorbellPhoto implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly botId: string;
  private readonly chatId: string;
  private readonly locale: string;
  private host: string;
  private timer: NodeJS.Timeout;
  private api:API;
  private telegramAPI:any;

  private readonly doorbellPhotoService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.host = config.hostName;
    this.botId = config.botId;
    this.chatId = config.chatId;
    this.locale = config.locale || "de-DE";
    this.api = api;

    this.telegramAPI = new TelegramBot(this.botId, {
      filepath: false,
    });

    this.log.debug("botid: "+this.botId);
    this.log.debug("chatId: "+this.chatId);

    this.doorbellPhotoService = new hap.Service.Switch(this.name);

    this.doorbellPhotoService.getCharacteristic(hap.Characteristic.On)
    .on(CharacteristicEventTypes.SET, (state: CharacteristicValue, callback: CharacteristicSetCallback) => {
      this.doorbellHandler(state as boolean);
      callback();
    })
    .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
      callback(null, false);

    });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "California444")
      .setCharacteristic(hap.Characteristic.Model, "Telegram Photo Doorbell")
      .setCharacteristic(hap.Characteristic.SoftwareRevision, version);

      api.on(APIEvent.SHUTDOWN, this.shutdown.bind(this));
  
    log.info("Finished initializing!");
  }

  doorbellHandler(state:boolean): void {

    this.log.info('Doorbell ring...');
    let timeInfo:String = new Date().toLocaleString(this.locale);

    this.timer = setTimeout(() => {
      this.log.debug('Doorbell handler timeout.'+timeInfo);
      this.doorbellPhotoService.updateCharacteristic(hap.Characteristic.On, false);
    }, 1000);

    /**
     * request URL
     * 
     */

     //this.telegramAPI.sendMessage(this.chatId, timeInfo);

    var url = new URL(this.host);

    // check if auth information is included in URL

    const regexp = /(^[htps]*\:\/\/)([\w\:]*)(@)/;
    let match = url.toString().match(regexp);

    let authInfo;
    if(match && match[2] && match[2].includes(":")) {
      authInfo = match[2];
      this.log.debug("Extracted auth info from url: " + authInfo);
    }

    let options = {
      url: url,
      method: 'GET',
      encoding: null,
      timeout: 5000,
      insecureHTTPParser:true
    } as RequestOptions;

    if(authInfo) options.auth = authInfo;

    let result: Buffer;

    try {
      const req = request(url, options, response => {
        response.setEncoding('binary');
        const chunks: any[] = [];
        response.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk, 'binary'));
        });
        response.on('end', () => {
          response.rawHeaders.forEach(elem => {
            this.log.debug(elem);
          });
          if(response.statusCode == 200) {
            
            this.log.info("Picture received successful!");

            result = Buffer.concat(chunks);

            let fileOptions = {
              // Explicitly specify the file name.
              filename: 'photo.jpeg',
              // Explicitly specify the MIME type.
              contentType: 'image/jpeg'
            };
    
            const logg = this.log;
    
            const promise = this.telegramAPI.sendPhoto(this.chatId, result, {
              caption: this.name +'  (' +timeInfo+')',
            }, fileOptions);
    
            promise.then(
              function(success: any) {
                logg.info("Send photo successful!");
    
              }, 
              function(error: any) {
                logg.error("Error while sending photo to Telegram!");
            })
          }
          else {
            this.log.error("No Picture received! "+response.statusCode+" "+response.statusMessage);
          }
        });
      });
      req.end();
    } catch(e: any) {
      this.log.error(e.message);
    }
  }

  shutdown(): void {
    this.log.info("Shutdown");
    if(this.timer) clearTimeout(this.timer);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!"+ACCESSORY_NAME);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.doorbellPhotoService,
    ];
  }
}