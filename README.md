# xiaomi-zb2mqtt
Xiaomi Zigbee to MQTT bridge using zigbee-shepherd.

This little script allows you to use Xiaomi Zigbee sensors and switches **without** Xiaomi's gateway. It bridges the events sent from the sensors to MQTT. You can 
integrate the cheap and nice Zigbee sensors and switches with whatever smart home infrastructure you are using.

### To run the bridge

* Install
```sh  
$ git clone https://github.com/starkun/xiaomi-zb2mqtt.git  
$ cd xiaomi-zb2mqtt  
/xiaomi-zb2mqtt$ npm install  
```
* Configuration: for the moment you have to edit index.js and set your serial port and mqtt broker.

* Run it
```sh  
/xiaomi-zb2mqtt$ node index.js  
```

* To see whats happening behind the scenes run it with debug enabled:
```sh  
/xiaomi-zb2mqtt$ DEBUG=* node index.js  
```
### Supports
* WXKG01LM - Single, double, triple, quad and "more than five" click. Push and hold long click. 
* WXKG02LM - Left, right and both click
* WSDCGQ11LM - Aqara Temperature Hudimity sensor with Temperature, Humidity and Pressure
* RTCGQ11LM - Xiaomi Smart Home Aqara Human Body Sensor
* MCCGQ11LM - Xiaomi Aqara Window Door Sensor

### Notes
* You need CC2531 USB stick flashed with CC2531ZNP-Pro-Secure_LinkKeyJoin.hex from here: https://github.com/mtornblad/zstack-1.2.2a.44539/tree/master/CC2531
* Zigbee shepherd's pairing process can take quite a while (more than a minute).
* When pairing WXKG01LM, after reset you need to toggle (short keypress) the reset button every couple of seconds to keep the switch from going to sleep until the pairing is complete.
