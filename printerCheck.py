#!/usr/bin/env python3

import urllib.error
from bs4 import BeautifulSoup
from apscheduler.schedulers.background import BackgroundScheduler
import time
import json
import requests
import datetime
requests.packages.urllib3.disable_warnings()

source = 'http://10.1.120.31/info_suppliesStatus.html'
printers_400_300_2000 = {}

printers_600_500 = {}

printers_3000_4000 = {}

printers_4250 = {}

low_ink_arr = []
try_again = False


def check_levels_400_300_2000(url, name):
    try:
        if name == 'Court' or name == 'LEG Pro Shop':
            site = 'http://%s/hp/device/supply_status.htm' % url
        else:
            site = 'http://%s/info_suppliesStatus.html' % url

        r = requests.get(site, verify=False, timeout=4000)
        html_doc = r.text
        soup = BeautifulSoup(html_doc, 'html.parser')

        arr = [[name, url], []]
        if soup.find_all("td", {"class": 'SupplyName width65'}):
            f = 'SupplyName width65'
        elif soup.find_all("td", {"class": 'SupplyName width80'}):
            f = 'SupplyName width80'
        else:
            f = 'supplyName width80'

        for i in soup.find_all("td", {"class": f}):
            ink = str(i.text).strip().replace('  ', '').replace(' *', '').replace('†', '').replace('Non-HP ', '').replace('HP', '').replace("\n", "").replace("\u202c", "").replace("\xa0", " ").split(' ')
            percent = int(i.next_sibling.next_sibling.text.strip().replace(' ', '').replace('†', '').replace("%", "").replace("\n", "").replace("*", "").replace("Lessthan", "").replace("--", "0").replace("‡", ""))
            if percent <= 10:
                arr[1].append([ink[0] + ' ' + ink[len(ink) - 1], percent])
        return arr
    except:
        return [[name, url], []]


def check_levels_600_500(url, name):
    try:
        r = requests.get('https://%s/hp/device/InternalPages/Index?id=SuppliesStatus' % url, verify=False, timeout=4000)
        html_doc = r.text
        soup = BeautifulSoup(html_doc, 'html.parser')

        arr = [[name, url], []]
        colors = [['Black'], ['Cyan'], ['Magenta'], ['Yellow']]

        for color in range(4):
            if soup.find('h2', {'id': colors[color][0] + "Cartridge1-Header"}):
                c = soup.find('h2', {'id': colors[color][0] + "Cartridge1-Header"}).next_sibling
                cc = int(c.text.strip().replace(' ', '').replace('†', '').replace("%", "").replace("\n", "").replace("*", "").replace("Lessthan", "").replace("--", "0").replace("‡", ""))
                if cc <= 10:
                    order = c.next_sibling.text.split(' ')
                    arr[1].append([colors[color][0] + ' ' + order[2], cc])

        return arr
    except:
        return [[name, url], []]


def check_levels_3000_4000(url, name):
    try:
        r = requests.get('http://%s/hp/device/this.LCDispatcher?nav=hp.Supplies' % url, verify=False, timeout=4000)
        html_doc = r.text
        soup = BeautifulSoup(html_doc, 'html.parser')

        arr = [[name, url], []]
        ink = soup.find('span', {'id': 'msg-9725-0'})
        ink = ink.text.strip().replace('  ', '').replace(' *', '').replace('†', '').replace('Non-HP ', '').split(' ')
        percent = soup.find("td", {"class": 'hpConsumableBlockHeaderPctRemaining'})
        if percent.contents[0].text:
            percent = int(percent.contents[0].text.strip().replace(' ', '').replace('†', '').replace("%", "").replace("\n", "").replace("*", "").replace("Lessthan", "").replace("--", "0").replace("‡", ""))
        else:
            percent = 100
        if percent <= 10:
            arr[1].append(['Black ' + ink[len(ink) - 1], percent])

        return arr
    except:
        return [[name, url], []]


def check_levels_4250(url, name):
    try:
        r = requests.get('http://%s/hp/device/this.LCDispatcher?nav=hp.Supplies' % url, verify=False, timeout=4000)
        html_doc = r.text
        soup = BeautifulSoup(html_doc, 'html.parser')

        arr = [[name, url], []]
        ink = soup.find('span', {'class': 'hpConsumableBlockHeaderText'})
        ink = ink.text.strip().replace('  ', '').replace(' *', '').replace('†', '').replace('Non-HP ', '').split(' ')
        ink = ink[0] + ' (' + ink[4] + ')'
        percent = soup.find("td", {"class": 'hpConsumableBlockHeaderPctRemaining'})
        if percent.contents[1].text:
            percent = int(percent.contents[1].text.strip().replace(' ', '').replace('†', '').replace("%", "").replace("\n", "").replace("*", "").replace("Lessthan", "").replace("--", "0").replace("‡", ""))
        else:
            percent = 100
        if percent <= 4:
            arr[1].append(['Black ' + ink[len(ink) - 1], percent])
        return arr
    except:
        return [[name, url], []]


def make_call(data):
    global try_again
    url = 'http://10.1.110.15:3000/printers'
    payload = data
    headers = {'content-type': 'application/json'}

    try:
        requests.post(url, data=json.dumps(payload), headers=headers)
        # r.raise_for_status()
    except (requests.exceptions.RequestException, TimeoutError, ConnectionError, ConnectionRefusedError, urllib.error.URLError) as e:
        pass
        # print(e)


def do_work_son():
    global low_ink_arr
    low_ink_arr = []
    
    for printer in printers_600_500:
        res = check_levels_600_500(printers_600_500[printer], printer)
        if res[1]:
            low_ink_arr.append(res)

    for printer in printers_400_300_2000:
        res = check_levels_400_300_2000(printers_400_300_2000[printer], printer)
        if res[1]:
            low_ink_arr.append(res)

    for printer in printers_3000_4000:
        res = check_levels_3000_4000(printers_3000_4000[printer], printer)
        if res[1]:
            low_ink_arr.append(res)

    for printer in printers_4250:
        res = check_levels_4250(printers_4250[printer], printer)
        if res[1]:
            low_ink_arr.append(res)

    make_call(low_ink_arr)


print("Running - " + datetime.datetime.now().strftime('%c'))
do_work_son()

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(do_work_son, 'interval', hours=1)
    scheduler.start()

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()