#!/usr/bin/env python3

import os
import platform
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import time
import json
import datetime
import urllib.error

internet = ["8.8.8.8",
            "23.72.27.241",
            "23.72.15.162",
            "107.162.132.24",
            "8.8.4.4",
            "198.41.209.137",
            "209.244.0.3",
            "208.67.220.220",
            "72.32.138.96",
            "75.75.75.75",
            "204.79.197.203",
            "139.130.4.5",
            "208.67.222.222",
            "209.244.0.4",
            "64.6.64.6",
            "64.6.65.6",
            "84.200.69.80",
            "84.200.70.40",
            "8.26.56.26",
            "8.20.247.20",
            "208.67.222.222",
            "208.67.220.220",
            "209.88.198.133",
            "195.46.39.39",
            "195.46.39.40",
            "162.211.64.20",
            "208.76.50.50",
            "216.146.35.35",
            "216.146.36.36",
            "37.235.1.174",
            "37.235.1.177",
            "198.101.242.72",
            "23.253.163.53",
            "77.88.8.8",
            "77.88.8.1",
            "91.239.100.100",
            "89.233.43.71",
            "74.82.42.42"]

connectivity = {}

switches = {}
			
aps = {}

count = 0


def ping(host):
    if platform.system().lower() == "windows":
        return os.system("ping -n 1 -w 2000 " + host + " > nul") == 0
    else:
        return os.system("ping -c 1 -W 2 " + host + " > /dev/null 2>&1") == 0

def pingInternet(host):
    if platform.system().lower() == "windows":
        return os.system("ping -n 4 -w 2000 " + host + " > nul") == 0
    else:
        return os.system("ping -c 4 -W 2 " + host + " > /dev/null 2>&1") == 0

def make_call(data):
    url = 'http://127.0.0.1:3000/pings'
    payload = data
    headers = {'content-type': 'application/json'}

    try:
        r = requests.post(url, data=json.dumps(payload), headers=headers)
        r.raise_for_status()
    except (requests.exceptions.RequestException, TimeoutError, ConnectionError, ConnectionRefusedError,
            urllib.error.URLError) as e:
        print(e)


def do_work_son():
    global count
    arr = [{}, []]

    i = "Up" if pingInternet(internet[count]) else "Down"
    if i == "Down":
        print(internet[count])
    arr[0]['int'] = i
    count += 1
    count = 0 if count == len(internet) else count

    for con in connectivity:
        i = "Up" if ping(connectivity[con]) else "Down"
        arr[0][con] = i

    for switch in switches:
        p = ping(switches[switch])
        if not p:
            arr[1].append(switch)

    for ap in aps:
        p = ping(aps[ap])
        if not p:
            arr[1].append(ap)

    make_call(arr)


print("Running - " + datetime.datetime.now().strftime('%c'))
do_work_son()

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(do_work_son, 'interval', minutes=1)
    scheduler.start()

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
