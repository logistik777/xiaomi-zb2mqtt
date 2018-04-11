var debug = require('debug')('xiaomi-zb2mqtt')
var util = require("util");
var perfy = require('perfy');
var ZShepherd = require('zigbee-shepherd');
var mqtt = require('mqtt')

var client  = mqtt.connect('mqtt://localhost')
var timers = {};
var shepherd = new ZShepherd('/dev/ttyACM0', {
    net: {
        panId: 0x1a62
    }
});
 function updateState(dev_id, name, value, common) { 
    var topic = dev_id + '/' + name;
	 if (value != null) { // only publish message if we have not set payload to null
        console.log("MQTT Reporting to ", topic, " value ", value)
        client.publish(topic, value.toString());
    }
}
function updateStateWithTimeout(dev_id, name, value, common, timeout, outValue) {
    updateState(dev_id, name, value, common);
    setTimeout(function () {
        updateState(dev_id, name, outValue, common);
    }, timeout);
}

shepherd.on('ready', function() {
    console.log('Server is ready. Current devices:');
    shepherd.list().forEach(function(dev){
        if (dev.type === 'EndDevice')
           console.log(dev.ieeeAddr + ' ' + dev.nwkAddr + ' ' + dev.modelId);
        if (dev.manufId === 4151) // set all xiaomi devices to be online, so shepherd won't try to query info from devices (which would fail because they go tosleep)
            shepherd.find(dev.ieeeAddr,1).getDevice().update({ status: 'online', joinTime: Math.floor(Date.now()/1000) });
    });
    // allow devices to join the network within 60 secs
    shepherd.permitJoin(60, function(err) {
        if (err)
            console.log(err);
    });
});
shepherd.on('permitJoining', function(joinTimeLeft) {
    console.log(joinTimeLeft);
});
shepherd.on('ind', function(msg) {
    // debug('msg: ' + util.inspect(msg, false, null));
    var pl = null;
    var topic = 'xiaomiZb/';
    var dev, dev_id, devClassId, epId;

    switch (msg.type) {
	case 'devStatus':
	case 'devInterview':
        break;
        case 'devIncoming':
            console.log('Device: ' + msg.data + ' joining the network!');
            break;
        case 'statusChange':
                dev = msg.endpoints[0].device;
                devClassId = msg.endpoints[0].devId;
                dev_id = msg.endpoints[0].device.ieeeAddr.substr(2);
                topic += dev_id;
                pl = 1;
                switch (msg.data.cid) {
                    case 'ssIasZone':
                          if (msg.data.zoneStatus == 1) {
                           topic += "/leak";
                           pl = "true";
                        } else {
                            topic += "/leak";
                            pl = "false";
                        }
                        break;
                }
                break;
        //case 'devChange':
        case 'attReport':
	    dev = msg.endpoints[0].device;
            // devClassId = msg.endpoints[0].devId;
            // epId = msg.endpoints[0].epId;
             console.log('attreport: ' + msg.endpoints[0].device.ieeeAddr + ' ' + msg.endpoints[0].devId + ' ' + msg.endpoints[0].epId + ' ' + util.inspect(msg.data, false, null));
            // defaults, will be extended or overridden based on device and message
	     dev_id = msg.endpoints[0].device.ieeeAddr.substr(2);
             topic += dev_id;
             pl = 1;
		//var modelId = msg.endpoints[0].device.modelId;
                //if (modelId) modelId = modelId.replace("\u0000", "");

            switch (msg.data.cid) {
		case 'genBasic':
                        var batteryData;
                        // for new Aqara sensor
                        if (msg.data.data['65281']) {
                            batteryData = msg.data.data['65281']['1'];
                        }
                        // for old Mijia sensor
                        if (msg.data.data['65282']) {
                            batteryData = msg.data.data['65282']['1'].elmVal;
                        }
                        if (batteryData != undefined) {
                             topic += "/battery";
                             pl = (batteryData-2700)/5;
                        }
                        break;
                case 'genOnOff':  // various switches
                    topic += '/' + msg.endpoints[0].epId;
                    pl = msg.data.data['onOff'];
		// IKEA TRADFRI bulb and FLOALT panel WS
                if (dev.modelId && (dev.modelId.indexOf('TRADFRI bulb') !== -1 ||
                    dev.modelId.indexOf('FLOALT panel WS') !== -1)) {
                     pl = undefined;
                        if (msg.data.data['onOff'] == 1) {
                        topic += "/state";
			pl = "true";
                        } else {
                        topic += "/state";
			pl = "false";
                            }
                        }
	        if (dev.modelId && dev.modelId.indexOf('lumi.sensor_magnet') >= 0) {
                       pl = undefined;
                         if (msg.data.data['onOff'] == 1) {
                         pl = "true";
                            } else {
                         pl = "false";
                            }
                        }
		if (dev.modelId && dev.modelId.indexOf('lumi.plug') !== -1) {
                      pl = undefined;
                        if (msg.data.data['onOff'] == 1) {
                        topic += "/state";
		        pl = "true";
                            } else {
                        topic += "/state";
			pl = "false";
                            }
                        }
                if (dev.modelId && dev.modelId.indexOf('lumi.ctrl_ln1') !== -1) {
                        if (msg.data.data['onOff'] == 1) {
                        topic += "/state";
	                pl = "true";        
                            } else {
                        topic += "/state";
			pl = "false";
                            }
                        }
		if (dev.modelId && dev.modelId.indexOf('lumi.ctrl_86plug') !== -1) {
                        pl = undefined;
                        if (msg.data.data['onOff'] == 1) {
                        topic += "/state";
			pl = "true";
                            } else {
                        topic += "/state";
			pl = "false";
                            }
                        }
                 // WXKG02LM
                        if (dev.modelId == 'lumi.sensor_86sw2\u0000Un') {
                            pl = undefined;
                            if (devClassId === 24321) { // left
                                topic = 'left_click';                                
                            } else if (devClassId === 24322) { // right
                                topic = 'right_click';
                            } else if (devClassId === 24323) { // both
                                topic = 'both_click';
                            }
                            updateStateWithTimeout(dev_id, topic, true, {type: 'boolean'}, 300, false);
                        }
                 // QBKG03LM
                        if (dev.modelId == 'lumi.ctrl_neutral2') {
                            topic = null;
                            if (devClassId == 256 && (epId == 4 || epId == 2)) { // left
                                if (pl == 0) { // left press with state on
                                    updateState(dev_id, 'left_state', false, {type: 'boolean', write: true});
                                } else if (pl == 1) { // left press with state off
                                    updateState(dev_id, 'left_state', true, {type: 'boolean', write: true});
                                }
                            }
                            if (devClassId == 256 && (epId == 5 || epId == 3)) { // right
                                if (pl == 0) { // right press with state on
                                    updateState(dev_id, 'right_state', false, {type: 'boolean', write: true});
                                } else if (pl == 1) { // right press with state off
                                    updateState(dev_id, 'right_state', true, {type: 'boolean', write: true});
                                }
                            }
                            if (devClassId == 0 && epId == 4) { // left pressed
                                if (pl == 0) { // down
                                    updateState(dev_id, 'left_click', false, {type: 'boolean'});
                                } else if (pl == 1) { // up
                                    updateState(dev_id, 'left_click', true, {type: 'boolean'});
                                } else if (pl == 2) { // double 
                                    updateState(dev_id, 'left_double_click', true, {type: 'boolean'});
                                }
                            } else if (devClassId == 0 && epId == 5) { // right pressed
                                if (pl == 0) { // down
                                    updateState(dev_id, 'right_click', false, {type: 'boolean'});
                                } else if (pl == 1) { // up
                                    updateState(dev_id, 'right_click', true, {type: 'boolean'});
                                } else if (pl == 2) { // double 
                                    updateState(dev_id, 'right_double_click', true, {type: 'boolean'});
                                }
                            } else if (devClassId == 0 && epId == 6) { // both pressed
                                if (pl == 0) { // down
                                    updateState(dev_id, 'both_click', false, {type: 'boolean'});
                                } else if (pl == 1) { // up
                                    updateState(dev_id, 'both_click', true, {type: 'boolean'});
                                } else if (pl == 2) { // double 
                                    updateState(dev_id, 'both_double_click', true, {type: 'boolean'});
                                }
                            }
                        }
		break;
                case 'msTemperatureMeasurement':  // Aqara Temperature/Humidity
                    topic += "/temperature";
                    pl = parseFloat(msg.data.data['measuredValue']) / 100.0;
                    break;
                case 'msRelativeHumidity':
                    topic += "/humidity";
                    pl = parseFloat(msg.data.data['measuredValue']) / 100.0;
                    break;
                case 'msPressureMeasurement':
                    topic += "/pressure";
                    pl = parseFloat(msg.data.data['16']) / 10.0;
                    break;
		 case 'msOccupancySensing': // motion sensor
                        if (msg.data.data['occupancy'] == 1) {
                            updateState(dev_id, "occupancy", true, {type: 'boolean'});
                            if (timers[dev_id+'no_motion']) {
                                clearInterval(timers[dev_id+'no_motion']);
                                delete timers[dev_id+'no_motion'];
                            }
                            updateState(dev_id, "no_motion", 0, {type: 'number', unit: 'sec'});
                            if (!timers[dev_id+'in_motion']) {
                                timers[dev_id+'in_motion'] = setTimeout(function() {
                                    clearInterval(timers[dev_id+'in_motion']);
                                    delete timers[dev_id+'in_motion'];
                                    updateState(dev_id, "occupancy", false, {type: 'boolean'});
                                    if (!timers[dev_id+'no_motion']) {
                                        var counter = 1;
                                        timers[dev_id+'no_motion'] = setInterval(function() {
                                            updateState(dev_id, "no_motion", counter, {type: 'number', unit: 'sec'});
                                            counter = counter + 1;
                                            if (counter > 1800) {  // cancel after 1800 sec
                                                clearInterval(timers[dev_id+'no_motion']);
                                                delete timers[dev_id+'no_motion'];
                                            }
                                        }, 1000);
                                    }
                                }, 60000); // clear after 60 sec
                            } else {
                                clearInterval(timers[dev_id+'in_motion']);
                                delete timers[dev_id+'in_motion'];
                            }
                        }
		break;
                case 'msIlluminanceMeasurement':
                        topic = "illuminance";
                        pl = msg.data.data['measuredValue'];
                        break;
                 case 'genMultistateInput':
                        /*
                            +---+
                            | 2 |
                        +---+---+---+
                        | 4 | 0 | 1 |
                        +---+---+---+
                            |M5I|
                            +---+
                            | 3 |
                            +---+
                        Side 5 is with the MI logo, side 3 contains the battery door.
                        presentValue = 0 = shake
                        presentValue = 2 = wakeup 
                        presentValue = 3 = fly/fall
                        presentValue = y + x * 8 + 64 = 90º Flip from side x on top to side y on top
                        presentValue = x + 128 = 180º flip to side x on top
                        presentValue = x + 256 = push/slide cube while side x is on top
                        presentValue = x + 512 = double tap while side x is on top
                        */
                        var v = msg.data.data['presentValue'];
                        switch (true) {
                            case (v == 0):
                                updateStateWithTimeout(dev_id, 'shake', true, {type: 'boolean'}, 300, false);
                                break;
                            case (v == 2):
                                updateStateWithTimeout(dev_id, 'wakeup', true, {type: 'boolean'}, 300, false);
                                break;
                            case (v == 3):
                                updateStateWithTimeout(dev_id, 'fall', true, {type: 'boolean'}, 300, false);
                                break;
                            case (v >= 512): // double tap
                                updateStateWithTimeout(dev_id, 'tap', true, {type: 'boolean'}, 300, false);
                                updateState(dev_id, 'tap_side', v-512, {type: 'number'});
                                break;
                            case (v >= 256): // slide
                                updateStateWithTimeout(dev_id, 'slide', true, {type: 'boolean'}, 300, false);
                                updateState(dev_id, 'slide_side', v-256, {type: 'number'});
                                break;
                            case (v >= 128): // 180 flip
                                updateStateWithTimeout(dev_id, 'flip180', true, {type: 'boolean'}, 300, false);
                                updateState(dev_id, 'flip180_side', v-128, {type: 'number'});
                                break;
                            case (v >= 64): // 90 flip
                                updateStateWithTimeout(dev_id, 'flip90', true, {type: 'boolean'}, 300, false);
                                updateState(dev_id, 'flip90_from', Math.floor((v-64) / 8), {type: 'number'});
                                updateState(dev_id, 'flip90_to', v % 8, {type: 'number'});
                                break;
                        }
                        break;
                    case 'genAnalogInput':
                        /*
                        65285: 500, presentValue = rotation angel left < 0, rigth > 0
                        65285: 360, presentValue = ? angel
                        65285: 110, presentValue = ? angel 
                        65285: 420, presentValue = ? angel 
                        65285: 320, presentValue = ? angel 
                        65285: 330, presentValue = ? angel 
                        */
                        if (msg.data.data['65285'] == 500) {
                            var v = msg.data.data['presentValue'];
                            updateStateWithTimeout(dev_id, 'rotate', true, {type: 'boolean'}, 300, false);
                            updateState(dev_id, 'rotate_angel', v, {type: 'number', unit: 'º'});
                            if (v < 0) {
                                updateState(dev_id, 'rotate_dir', 'left');
                                
                            } else {
                                updateState(dev_id, 'rotate_dir', 'right');
                            }
                        }
                        var val = msg.data.data['presentValue'];
                        if (val != undefined && dev.modelId && dev.modelId.indexOf('lumi.plug') !== -1) {
                            updateState(dev_id, "load_power", val, {type: 'number', unit: 'W'});
                            updateState(dev_id, 'in_use', (val > 0) ? true : false, {type: 'boolean'});
                        }
                        if (val != undefined && dev.modelId && dev.modelId.indexOf('lumi.ctrl_ln') !== -1) {
                            updateState(dev_id, "load_power", val, {type: 'number', unit: 'W'});
                        }
                        if (val != undefined && dev.modelId && dev.modelId.indexOf('lumi.ctrl_86plug') !== -1) {
                            updateState(dev_id, "load_power", val, {type: 'number', unit: 'W'});
                            updateState(dev_id, 'in_use', (val > 0) ? true : false, {type: 'boolean'});
                        }
	    break;
            }

		switch (true) {

                    case (dev.modelId == 'lumi.sensor_switch.aq2'): // WXKG11LM switch

                    case ((msg.endpoints[0].devId == 260) && (dev.modelId && dev.modelId.indexOf('lumi.sensor_magnet') < 0)): // WXKG01LM switch

                        if (msg.data.data['onOff'] == 0) { // click down

                            perfy.start(msg.endpoints[0].device.ieeeAddr); // start timer

                            pl = null; // do not send mqtt message

                        } else if (msg.data.data['onOff'] == 1) { // click release

                            if (perfy.exists(msg.endpoints[0].device.ieeeAddr)) { // do we have timer running

                                var clicktime = perfy.end(msg.endpoints[0].device.ieeeAddr); // end timer

                                if (clicktime.seconds > 0 || clicktime.milliseconds > 240) { // seems like a long press so ..

                                    //topic = topic.slice(0,-1) + '2'; //change topic to 2

                                    pl = 'long_click';

                                    topic = topic + '/long';

                                    //pl = clicktime.seconds + Math.floor(clicktime.milliseconds) + ''; // and payload to elapsed seconds

                                    pl = clicktime.seconds;

                                }

                            }

                        } else if (msg.data.data['32768']) { // multiple clicks

                            if (msg.data.data['32768'] == 2) {

                               pl = 'dual_click';

                            }

                            if (msg.data.data['32768'] == 3) {

                                pl = 'triple_click';

                            }

                            if (msg.data.data['32768'] == 4) {

                                pl= 'quad_click';

                            }

                        }

                }



            break;
        default:
            // console.log(util.inspect(msg, false, null));
            // Not deal with other msg.type in this example
            break;
    }

  //function updateState(dev_id, name, value, common) { 
  //  var topic = dev_id + '/' + name;
  //  if (value != null) { // only publish message if we have not set payload to null
  //      console.log("MQTT Reporting to ", topic, " value ", value)
  //      client.publish(topic, value.toString());
  //  }
//}
	
});
client.on('connect', function() {
    client.publish('xiaomiZb', 'Bridge online')
})

shepherd.start(function(err) { // start the server
    if (err)
        console.log(err);
});
