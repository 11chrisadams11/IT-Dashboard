sleep 5s
screen -d -m -S mysession -t forever
sleep 2s
screen -S mysession -p 0 -X shelltitle chrome
sleep 1s
screen -S mysession -p 0 -X exec /home/ittv/startForever.sh
sleep 2s
screen -S mysession -X screen
sleep 1s
screen -S mysession -p 1 -X shelltitle bash
sleep 10s
screen -S mysession -p 1 -X exec /home/ittv/startChrome.sh
sleep 2s
screen -S mysession -X screen
