# homebridge-doorbell-telegram-photo

<a href="https://www.npmjs.com/package/homebridge-doorbell-telegram-photo"><img title="npm version" src="https://badgen.net/npm/v/homebridge-doorbell-telegram-photo" ></a>

**homebridge-doorbell-telegram-photo** is a homebridge plugin to send a camera snapshot on a doorbell event to Telegram.

You can use:

- a http(s) URL for snapshots provided from your camera

- a ffmpeg command to grab a snapshot from the camera's video stream

The plugin adds a switch in the Home App for an automation rule to trigger in case of an doorbell event

------

## Installation

- Install the plugin via Config UI X
- [Create a Telegram Bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) if not existing yet
- Configure the plugin settings via Config UI X
  - Provide an individual name of the camera
  - Provide the bot Id of the Telegram Bot (without the leading "bot"). The bot Id is received from bot father once the bot is created
  - Provide the chat Id of the Telegram Chat to send the pictures to. Usually the first sign of the chat Id is a minus sign which must be included. To find out the chat Id ypi can send a telegram message to the bot in the desired chat and then open the following url in the browser: [https://api.telegram.org/[BOT_ID]/getUpdates](https://api.telegram.org/[BOT_ID]/getUpdates) Copy the chat Id from here
  - Check the use ffmpeg option if your camera does not support an http(s) url for snapshots or if you need to use basic or digest authentification
  - In the url field either provide the http URL for the snapshot of the camera or the ffmpeg command, e.g.
  > -fflags nobuffer -flags low_delay -fflags discardcorrupt -analyzeduration 0 -probesize 2000 -rtsp_transport tcp -i rtsp://...
- In Home App add an automation rule that triggers the switch of this plugin in case of an doorbell event
