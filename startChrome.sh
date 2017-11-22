#sleep 10s
export DISPLAY=:0.0
google-chrome --kiosk "127.0.0.1:3000" --disable-infobars --disable-session-crashed-bubble --disable-gpu
