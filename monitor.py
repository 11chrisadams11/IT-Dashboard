#!/usr/bin/env python3

import urllib.request
import urllib.error
from urllib.parse import urlencode
from apscheduler.schedulers.background import BackgroundScheduler
import time
import datetime
import smbus
from Adafruit_BME280 import *
import RPi.GPIO as GPIO

bus = smbus.SMBus(1)
sensor = BME280(mode=BME280_OSAMPLE_8)
light = 'off'
GPIO.setmode(GPIO.BCM)
GPIO.setup(7, GPIO.IN, pull_up_down=GPIO.PUD_UP)
water_count_1 = 0


def make_call(where, info):
    data = urlencode({}).encode()
    # print(where + ' ' + info)
    req = urllib.request.Request('http://10.1.110.15:3000/' + where + '/' + info, data)
    try:
        urllib.request.urlopen(req)
    except(TimeoutError, ConnectionError, ConnectionRefusedError, urllib.error.URLError) as e:
        pass
        #print(e)


def read_light():
    global light
    data = bus.read_i2c_block_data(0x23, 0x20)
    lum = int((data[1] + (256 * data[0])) / 1.2)
    if lum > 50:
        if light == 'off':
            make_call('light', 'on')
            light = 'on'
    else:
        if light == 'on':
            make_call('light', 'off')
            light = 'off'


def read_temp_hum():
    degrees = sensor.read_temperature()
    degrees = ((degrees * 9) / 5) + 32
    humidity = sensor.read_humidity()
    make_call('tempHum', str(round(degrees - 4)) + ':' + str(round(humidity)))


def read_water_sensors():
    global water_count_1
    water_1 = GPIO.input(7)

    if not water_1:
        if water_count_1 == 30:
            make_call('leakDetected', 'leak')
        water_count_1 += 1
    else:
        if water_count_1 != 0:
            make_call('leakDetected', 'ok')
        water_count_1 = 0


if __name__ == '__main__':
    print("Running - " + datetime.datetime.now().strftime('%c'))
    read_light()
    read_temp_hum()
    read_water_sensors()
    scheduler = BackgroundScheduler()
    scheduler.add_job(read_light, 'interval', seconds=5)
    scheduler.add_job(read_temp_hum, 'interval', seconds=30)
    scheduler.add_job(read_water_sensors, 'interval', seconds=5)
    scheduler.start()

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        GPIO.cleanup()