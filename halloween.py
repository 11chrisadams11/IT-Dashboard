#!/usr/bin/env python3

from apiclient.discovery import build
from random import randint
from apscheduler.schedulers.background import BackgroundScheduler
import time
import requests
import datetime

service = build("customsearch", "v1",
               developerKey="AIzaSyCq67zpT_JE1v7F2wxaU_NilSOSQGqmJVM")

search_list = ['halloween ', 'scary ', '', 'sexy ', 'superhero ', 'couple ']
face_photo = ['face', 'photo']

def do_work_son():
    now = datetime.datetime.now()
    if 7 <= now.hour < 18:
        res = service.cse().list(
            q=search_list[randint(0, len(search_list) - 1)] + 'costumes',
            cx='010890517815859148333:r-qgbxie3m4',
            searchType='image',
            imgType=face_photo[randint(0, 1)],
            safe='medium',
            start=randint(1, 50)
        ).execute()

        arr = []

        if not 'items' in res:
            print('No result !!')
        else:
            for item in res['items']:
                arr.append(item['link'])
                # print('{}:\n\t{}'.format(item['title'], item['link']))

        image = arr[randint(0, len(arr) - 1)]
        print(image)

        path = '/home/ittv/dashboard/static/emotion/boo' + str(randint(0, 9999999)) + '.jpg'
        r = requests.get(image, stream=True)
        if r.status_code == 200:
            with open(path, 'wb') as f:
                for chunk in r:
                    f.write(chunk)
    else:
        print('After hours')

do_work_son()

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(do_work_son, 'interval', minutes=10)
    scheduler.start()

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()