#!/bin/bash

#export DISPLAY=:0.0
#google-chrome --kiosk "127.0.0.1:3000"
#forever -w /home/ittv/dashboard/index.js
cd /home/ittv/dashboard/
forever --watch --watchIgnore index.html --watchIgnore style.css --watchIgnore script.js --watchIgnore *.jpg --watchIgnore *.py  --watchIgnore static/emotion/* index.js
#forever --watch index.js

#sleep 5s
#xdotool key "f5"
