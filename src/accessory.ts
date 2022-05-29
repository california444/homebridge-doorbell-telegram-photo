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
  Logger,
  Logging,
  Service
} from "homebridge";
import request, { AuthOptions, CoreOptions, Request } from "request";
import { Ffmpeg } from "./ffmpeg";

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
  private readonly useFfmpeg: boolean;
  private ffmpeg:Ffmpeg;

  private readonly doorbellPhotoService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.host = config.hostName;
    this.botId = config.botId;
    this.chatId = config.chatId;
    this.locale = config.locale || "de-DE";
    this.useFfmpeg = config.useFfmpeg;
    this.api = api;
    this.ffmpeg = new Ffmpeg(log, api);

    this.telegramAPI = new TelegramBot(this.botId, {
      filepath: false,
    });

    this.log.debug("Then botId is: "+this.botId);
    this.log.debug("The chatId is: "+this.chatId);

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

  async doorbellHandler(state:boolean) {

    this.log.info('Doorbell ring received.');
    let timeInfo:String = new Date().toLocaleString(this.locale);

    this.timer = setTimeout(() => {
      this.log.debug('Doorbell handler timeout.'+timeInfo);
      this.doorbellPhotoService.updateCharacteristic(hap.Characteristic.On, false);
    }, 1000);

    const url = this.host;

    if(this.useFfmpeg) {
      this.log.debug("Using ffmpeg to grab the snapshot...");
      
      try {
        const cached = !!this.ffmpeg.snapshotPromise;
        if(cached) this.log.info("using cached picture...");
        
        let snapshot = await (this.ffmpeg.snapshotPromise || this.ffmpeg.fetchSnapshot(url, this.name));
        this.sendPictureToTelegram(snapshot, timeInfo.toString());
      } catch (e : any) {
        this.log.error(e.message);
      }
    }
    else {
       // check if auth information is included in URL and extract it

    const regexp = /(^[htps]*\:\/\/)([\w\:]*)(@)/;
    let match = url.match(regexp);

    let user;
    let pass;
    if(match && match[2] && match[2].includes(":")) {
      let tokens = match[2].split(":");
      if(tokens.length == 2) {
        user = tokens[0];
        pass = tokens[1];
        this.log.debug("Extracted user/pass auth info from url...");
      }
    }

    let options = {
      url: url,
      method: 'GET',
      encoding: null,
      timeout: 5000,
      insecureHTTPParser:true
    } as CoreOptions;


    if(user && pass) options.auth = {
      'user':user,
      'pass':pass,
      'sendImmediately':false
    } as AuthOptions;

    let logger: Logger = this.log;
    let that = this;

    try {
      const req1: Request = request(url.toString(), options, function (error, response, body) {
        if(error) logger.error(error);
        response.setEncoding('binary');

        response.rawHeaders.forEach(elem => {
          logger.debug(elem);
        });

        if(response.statusCode == 200) {
            
          logger.info("Picture received successful!");
          that.sendPictureToTelegram(body, timeInfo.toString());

          
        }
        else {
          logger.error("No Picture received! "+response.statusCode+" "+response.statusMessage);
        }
      });
    } catch(e: any) {
      this.log.error(e.message);
    }
    }
  }

  sendPictureToTelegram(data:Buffer, timeInfo:string): void {

    let fileOptions = {
      // Explicitly specify the file name.
      filename: 'photo.jpeg',
      // Explicitly specify the MIME type.
      contentType: 'image/jpeg'
    };

    const promise = this.telegramAPI.sendPhoto(this.chatId, data, {
      caption: this.name +'  (' +timeInfo+')',
    }, fileOptions);

    let that = this;

    promise.then(
      function(success: any) {
        that.log.info("Send photo successful!");

      }, 
      function(error: any) {
        that.log.error("Error while sending photo to Telegram!");
    })

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