var express = require('express');
var app = express();
var http = require('http').Server(app);
var https = require('https');
var io = require('socket.io')(http);
var cors = require('cors');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var chokidar = require('chokidar');
var watcher = chokidar.watch('static/emotion/', {
  ignored: /[\/\\]\./,
  persistent: true
});
var request = require('request');
var fs = require("fs");
var Promise = require('promise');
var nodemailer = require('nodemailer');
var parser = require('rssparser');
var cl = console.log;

var transporter = nodemailer.createTransport({
    service: 'gmail', // no need to set host or port etc.
    auth: {
        user: 'lehi.it.alerts',
        pass: 'QLeXxEE3DZiQ'}
});

exec('rm /home/ittv/dashboard/static/emotion/*');

app.use(express.static('static'))
	.use(cors())
	.use(bodyParser.json())
    .use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
});

var oldPings = [],
    pingsMessageSent = false,
    pingsMessageCounter = 0,
    defaultSMS = {
        chris: '8017838695@tmomail.net',
        chad: '8018361193@vtext.com',
        tyler: '3852909593@vtext.com'
    },
    smsArray = [];
    // smsArray = [defaultSMS.chris, defaultSMS.chad, defaultSMS.tyler];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
})
.get('/alerts/:info', function(req, res){
    var n = req.params.info.toLowerCase();
    if(n === 'chris' || n === 'chad' || n === 'tyler'){
        if(smsArray.indexOf(defaultSMS[n]) > -1){
            smsArray.splice(smsArray.indexOf(defaultSMS[n]), 1);
            res.send('Removed ' + n.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + ' from SMS list.')
        } else {
            smsArray.push(defaultSMS[n]);
            res.send('Added ' + n.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + ' to SMS list.')
        }
    }
    console.log(smsArray)
})
.get('/search/:info', function(req, res){
    res.redirect('http://ittv01:3000/search');
})
.get('/search', function(req, res){
    res.sendFile(__dirname + '/search.html');
})
.get('/search/for/:info', function(req, res){
    var results = getIpAddresses(req.params.info);
    res.send(results)
})
.post('/tempHum/:info', function(req, res){
	//console.log(new Date(), req.params.info, req.hostname);
	io.emit('tempHum', req.params.info);
	res.send('OK');
})
.post('/tickets/count/:info', function(req, res){
    //console.log('Ticket count:', req.params.info);
	io.emit('ticketCount', req.params.info);
	res.send('OK');
})
.post('/tickets/unassigned', function(req, res){
	var data = '';
	req.on('data', function(chunk) {
      data += chunk.toString();
    });

    req.on('end', function() {
      res.writeHead(200, "OK", {'Content-Type': 'text/html'});
      res.end();
	  io.emit('unasignedTickets', JSON.parse(data));
	});
})
.post('/light/:info', function(req, res){
	//console.log(req.params.info);
	io.emit('serverRoomLight', req.params.info);
	res.send('OK');
})
.post('/leakDetected/:info', function(req, res){
	//console.log(req.params.info);
	io.emit('leakDetected', req.params.info);
	res.send('OK');
})
.post('/pings', function(req, res){
    r = req.body[0];
	io.emit('pings', [r.int, r.phones, r.spillman]);

    if(req.body[1].length > 0) {
        if(pingsMessageCounter > 0){
            var newPings = req.body[1].sort();
            if(!(arraysEqual(newPings, oldPings))){
                var switchList = newPings.join(', ');
                sendEmail('Switches Down', switchList);
                pingsMessageSent = true;
                oldPings = newPings;
            }
        }
        pingsMessageCounter++;
        io.emit('pingSwitch', req.body[1]);
    } else {
        if(pingsMessageSent){
            sendEmail('Switches', 'Connections OK');
            pingsMessageSent = false;
            pingsMessageCounter = 0;
            oldPings = [];
        }
        io.emit('pingSwitch', false);
    }
	res.send('OK');
})
.post('/printers', function(req, res){
	//console.log(req.body);
	var r = req.body;
    if(r.length > 0){
       io.emit('printers', r);
    } else {
        o.emit('printers', false);
    }
	res.send('OK');
});

io.on('connection', function(socket){
	socket.on('tempHum', function(msg){
    	io.emit('tempHum', msg);
  	})
	.on('weather', function(msg){
		io.emit('weather', msg);
	});
});

function errorLog(){
    var args = arguments;
    var stream = fs.createWriteStream("/home/ittv/dashboard/errors.txt");
    stream.once('open', function(fd) {
        stream.write(new Date() + "\n");
        for(var i=0; i<args.length; i++) {
            stream.write(args[i] + "\n");
        }
        stream.write("\n-------------------------------------------------------------------------------------------------------------------------------\n");
        stream.end();
    });
}

function jsonCleanup(data){
    var clean = data.replace(/\\n/g, "\\n")
                    .replace(/\\'/g, "\\'")
                    .replace(/\\"/g, '\\"')
                    .replace(/\\&/g, "\\&")
                    .replace(/\\r/g, "\\r")
                    .replace(/\\t/g, "\\t")
                    .replace(/\\b/g, "\\b")
                    .replace(/\\f/g, "\\f");
    clean = clean.replace(/[\u0000-\u0019]+/g,"");
    return JSON.parse(clean)
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    a = a.sort();
    b = b.sort();

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/*  --== Get Weather ==-- */

setInterval(function(){
	getWeather();
}, 1000 * 60 * 5);

function getWeather(){
	try{
        var url = 'http://api.wunderground.com/api/38cf3e91a1d49ada/conditions/q/84043.json';
        var options = {
            url: 'http://api.wunderground.com/api/38cf3e91a1d49ada/conditions/q/84043.json',
            method: 'GET'
        };
        //var url = 'http://api.wunderground.com/api/38cf3e91a1d49ada/conditions/q/pws:KUTLEHI16.json';
        request(options, function(error, res, body){
            if(!error && res.statusCode >= 200 && res.statusCode < 300){
                var weather = jsonCleanup(body);
                if (!(weather.response.hasOwnProperty('error'))) {
                    var sendWeather = [weather.current_observation.temp_f, weather.current_observation.icon, weather.current_observation.weather];
                    io.emit('weather', sendWeather);
                    //console.log(sendWeather);
                }
            } else {
                console.log('Weather Underground error:', error);
                errorLog('Weather Underground error:', error, body)
            }
        });
    } catch(e) {
        console.log('Weather Underground error:', e)
    }
}

var sales = {
		wootMain: [],
		wootComputers: [],
		meh: []
	},
	salesCount = 0;

var functionArray = [
	function() { getWoot('www') },
	function() { getWoot('computers') },
	function() { getWoot('electronics') },
	function() { getWoot('tools') },
	function() { getWoot('sport') },
	function() { getWoot('home') },
	function() { getMeh() }
];

setInterval(function(){
	functionArray[salesCount]();
	salesCount++;
	if(salesCount === functionArray.length){
		salesCount = 0;
	}
}, 1000 * 60 * 5);

function getWoot(site){
    var url = 'http://api.woot.com/2/events.json?site=' + site + '.woot.com&key=dd81f5dd20a94e0d8796c109b7f71f84';
    var options = {
        url: 'http://api.woot.com/2/events.json?site=' + site + '.woot.com&key=dd81f5dd20a94e0d8796c109b7f71f84',
        method: 'GET'
    };
    request(options, function(error, res, body){
        if(!error && res.statusCode >= 200 && res.statusCode < 300) {
            try {
                var woot = jsonCleanup(body);
                var price = '';
                if (woot[0].Offers[0].Items.length > 1) {
                    var arr = [];
                    woot[0].Offers[0].Items.forEach(function (e) {
                        arr.push(parseFloat(e.SalePrice));
                    });
                    arr.sort(function compareNumbers(a, b) {
                        return a - b;
                    });
                    price = (arr[0] === arr[(arr.length - 1)]) ? '$' + arr[0] : '$' + arr[0] + ' - $' + arr[(arr.length - 1)];
                } else {
                    price = '$' + woot[0].Offers[0].Items[0].SalePrice;
                }
                var name = (woot[0].Type === 'Daily') ? 'Woot!' : '<img src="images/wootoff.gif" style="height:36px;"> Woot-Off! <img src="images/wootoff.gif" style="height:36px;">';

                var sendWoot = [woot[0].Offers[0].Title, price, woot[0].Offers[0].Photos[0].Url, name];
                //console.log(sendWoot);
                io.emit('woot', sendWoot);
            } catch (e) {
                console.log('Woot error');
                errorLog('Woot error:', error, body)
            }
        } else {
            console.log('Woot error');
            errorLog('Woot error:', error, body)
        }
    });
}

function getMeh() {
    var url = 'https://api.meh.com/1/current.json?apikey=j8HBHncxDdQTXTPrHZLrwPJaK8PEEFpq';
    var options = {
        url: 'https://api.meh.com/1/current.json?apikey=j8HBHncxDdQTXTPrHZLrwPJaK8PEEFpq',
        method: 'GET'
    };
    request(options, function (error, res, body) {
        var html = body[0] === '<';
        if(!error && res.statusCode >= 200 && res.statusCode < 300 && !html) {
            try {
                var meh = jsonCleanup(body);
                if(meh.hasOwnProperty('deal')){
                    var price = '';
                    if (meh.deal.items.length > 1) {
                        var arr = [];
                        meh.deal.items.forEach(function (e) {
                            arr.push(e.price);
                        });
                        arr.sort();
                        price = (arr[0] === arr[1]) ? '$' + arr[0] : '$' + arr[0] + ' - $' + arr[1];
                    } else {
                        price = '$' + meh.deal.items[0].price;
                    }
                    var sendMeh = [meh.deal.title, price, meh.deal.photos[0], 'Meh.'];
                    io.emit('woot', sendMeh);
                    //console.log(sendMeh)
                }
            } catch (e) {
                console.log('Meh error');
                errorLog('Meh error:', error, body)
            }
        } else {
            console.log('Meh error');
            errorLog('Meh error:', error, body)
        }
    });
}

var newsCount = 0;
function getNews(){
    var options = {};
    parser.parseURL('https://threatpost.com/feed/', options, function(err, out){
        var title = out.items[newsCount].title;
        var body = out.items[newsCount].summary;
        io.emit('news', [title, body]);
        // console.log(title, body);
        newsCount = ++newsCount > 5 ? 0 : newsCount++
    });
}

setTimeout(getNews, 3000);
setInterval(getNews, 1000 * 60 * 5);


watcher.on('add', function(event) {
    exec("/usr/local/bin/facedetect " + event, function(error, stdout, stderr){
        if(stdout !== '' || /boo/g.test(event)){
            var hour = new Date().getHours(),
                obj = {};
            if (hour >= 7 && hour < 18){
                var promiseArr = [getMsEmotion(event), getMsComputerVision(event)];
                Promise.all(promiseArr).then(function(res){
                    //console.log(res);
                    obj = {
                        image: res[0].image,
                        faces: res[0].faces,
                        description: res[1].description,
                        stats: res[1].stats
                    };
                    io.emit('whosHere', obj);
                });
            } else {
                obj = {image: event, faces: [], description: '', stats: []};
            }
            io.emit('whosHere', obj);
            setTimeout(function(){exec('rm ' + event);}, 60000);
        } else {
            exec('rm ' + event);
        }
    });
});

function binaryRead(file) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap.toString('binary'),'binary');
}

function getMsEmotion(event){
    return new Promise(function(resolve, reject){
        var options = {
            url: "https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize",
            headers: {
                "Content-Type": "application/octet-stream",
                "Ocp-Apim-Subscription-Key":"b277b370ca0f4f30a31cd85e06253e0e",
                "Host": "westus.api.cognitive.microsoft.com"
            },
            method: 'POST',
            json: false,
            body: binaryRead(event)
        };

        request(options, function(error, response, body){
            if(!error && response.statusCode >= 200 && response.statusCode < 300 ) {
                var b = jsonCleanup(body),
                    obj = {},
                    arr = [];
                obj.image = event.replace('static/', '');
                if (!b.error) {
                    b.forEach(function (e) {
                        var score = {};
                        for (var i in e.scores) {
                            if (e.scores.hasOwnProperty(i)) {
                                var s = parseInt(parseFloat(e.scores[i]) * 100);
                                if (s >= 1 && parseInt(e.scores[i]) < 100) {
                                    score[i] = s;
                                }
                            }
                        }
                        var ef = e.faceRectangle;
                        arr.push({height: ef.height,
                            width: ef.width,
                            left: ef.left,
                            top: ef.top,
                            scores: score});
                    });
                    obj.faces = arr;
                    //console.log(obj)
                    resolve(obj);
                } else {
                    console.log(b.error)
                    resolve(obj)
                }
            } else {
                console.log(error)
            }
        })
    });
}

function getMsComputerVision(event){
    return new Promise(function(resolve, reject){
        var optionsCV = {
            url: "https://westus.api.cognitive.microsoft.com/vision/v1.0/analyze?visualFeatures=Faces,Description&language=en",
            headers: {
                "Content-Type": "application/octet-stream",
                "Ocp-Apim-Subscription-Key":"847c5270180e449291293bbcf8104509",
                "Host": "westus.api.cognitive.microsoft.com"
            },
            method: 'POST',
            json: false,
            body: binaryRead(event)
        };

        request(optionsCV, function(error, response, body){
            if(!error && response.statusCode >= 200 && response.statusCode < 300 ) {
                var b = jsonCleanup(body),
                    desc = '',
                    obj = {},
                    arr = [];
                try {
                    desc = b.description.captions[0].text;
                }
                catch (e) {
                    desc = '';
                }
                obj.description = desc;
                b.faces.forEach(function (e) {
                    var fr = e.faceRectangle;
                    arr.push({age: e.age,
                        gender: e.gender,
                        left: fr.left,
                        top: fr.top,
                        width: fr.width,
                        height: fr.height});
                });
                obj.stats = arr;
                resolve(obj);
            }
        });
    });
}

function sendEmail(subject, what){
    var h = new Date().getHours();
    var mailData = {
        from: 'lehi.it.alerts@gmail.com',
        to: smsArray,
        subject: subject,
        text: what
    };

    if(h >= 7 && h <= 21){
       transporter.sendMail(mailData)
    }
}

var ips = {};

fs.readFile("static/ip.txt", function(err, data){
    ips = JSON.parse(data);
});

function comparator(a, b) {
    if (a[0].toLowerCase() < b[0].toLowerCase()) return -1;
    if (a[0].toLowerCase() > b[0].toLowerCase()) return 1;
    return 0;
}

function getIpAddresses(query){
    var arr = [];
    if (/^[a-z0-9\s]+$/i.test(query)){
        query = query.trim();
        var split = [];
        if (/\s/g.test(query)) {
            split = query.split(' ');
        } else {
            split = [query]
        }
        query = '^';
        split.forEach(function(q){
            // query += '(?=.*\\b' + q + '\\b)'
            query += '(?=.*' + q + ')'
        });
        query += '.+';
        var re = new RegExp(query, "ig");
        for(var e in ips){
            var found = re.test(e);
            if(ips.hasOwnProperty(e) && found){
                var temp = re.test(e);
                arr.push([e, ips[e]])
            }
        }
        arr = arr.sort(comparator);
    } else if (/^[$*&]+$/i.test(query)) {
        for(var i in ips){
            if(ips.hasOwnProperty(i)){
                arr.push([i, ips[i]])
            }
        }
    }
    return arr
}

//sendEmail(false , 'Hello' )

http.listen(3000, function(){
	console.log('listening on *:3000 - ' + new Date());
});

/*https.createServer({
      key: fs.readFileSync('/home/ittv/key.pem'),
      cert: fs.readFileSync('/home/ittv/cert.pem')
    }, app).listen(3001);*/

https.createServer({
      key: fs.readFileSync('/home/ittv/lehiwildcard.key'),
      cert: fs.readFileSync('/home/ittv/lehiwildcard.crt')
    }, app).listen(3001);
