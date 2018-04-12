# xiaomi-zb2mqtt

Mqtt driver for Xiaomi (and other) devices via cc2531/cc2530

remake of ioBroker Driver by https://github.com/kirovilya 

Look wiki for info, hardware and flash https://github.com/kirovilya/ioBroker.zigbee/wiki (russian lang).

It is alpha version of driver!!! Properties names may changing!!!

Tested with devices:
```
TRÅDFRI bulb (state, level, colortemp)
QBCZ11LM Aqara Smart Socket ZiGBee (state, load power, in use)
QBKG11LM Xiaomi Aqara Smart Wall Switch Line-Neutral Single-Button (click, state, load power)
JTYJ-GD-01LM/BW Xiaomi Smoke Alarm (detected, voltage)
ZNCZ02LM Xiaomi Smart Power Plug (state, load power, in use)
QBKG03LM Xiaomi Aqara Light Switch (left is on, right is on, click left, click right, click both)
MFKZQ01LM Xiaomi Magic Cube Controller (shake, slide, flip90, flip180, tap, rotate, fall, wakeup, voltage)
SJCGQ11LM Aqara Smart Water Sensor (detected, voltage)
WXKG02LM Aqara Smart Light Switch Wireless (click left, click right, click both, voltage)
WSDCGQ11LM Aqara Temperature Humidity Sensor (humidity, pressure, temperature, voltage)
WSDCGQ01LM Aqara Temperature Humidity Sensor (humidity, temperature, voltage)
MCCGQ11LM Aqara Window Door Sensor (contact, voltage)
MCCGQ01LM Xiaomi Mi Smart Door/Window Sensor (contact, voltage)
WXKG11LM Aqara Smart Wireless Switch (click, double click, voltage)
WXKG01LM Xiaomi Smart Wireless Switch (click, double click, triple, long click, voltage)
RTCGQ11LM Aqara Human Body Sensor (illuminance, occupancy, voltage)
RTCGQ01LM Xiaomi Mi Smart IR Human Body Sensor (illuminance, occupancy, voltage)
```
=================

### To run the bridge

* Install
```sh  
$ git clone https://github.com/starkun/xiaomi-zb2mqtt.git  
$ cd xiaomi-zb2mqtt  
/xiaomi-zb2mqtt$ npm install  
```
* Configuration: for the moment you have to edit index.js and set your serial port and mqtt broker.
```
var client  = mqtt.connect('mqtt://localhost') //write your mqtt broker adress (ex. mqtt://192.168.0.1:1883,localhost)
var timers = {};
var shepherd = new ZShepherd('/dev/ttyACM0',  //write adress of USB device cc25xx
```
* Run it
```sh  
/xiaomi-zb2mqtt$ node index.js  
```

* To see whats happening behind the scenes run it with debug enabled:
```sh  
/xiaomi-zb2mqtt$ DEBUG=* node index.js  
```

### Notes
* You need CC2531 USB stick flashed with CC2531ZNP-Pro-Secure_LinkKeyJoin.hex from here: https://github.com/mtornblad/zstack-1.2.2a.44539/tree/master/CC2531
* Zigbee shepherd's pairing process can take quite a while (more than a minute).
* When pairing WXKG01LM, after reset you need to toggle (short keypress) the reset button every couple of seconds to keep the switch from going to sleep until the pairing is complete.
