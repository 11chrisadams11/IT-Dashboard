$(function(){

    $('#upSwitchWidget, #printersWidget').fadeOut();
	
	var skycons = new Skycons({"color": "white"});
	skycons.add('weatherIcon', Skycons.RAIN);
	skycons.play();
	
	Chart.defaults.global.scaleOverride = true;
	Chart.defaults.global.scaleSteps = 4;
	Chart.defaults.global.scaleStepWidth = 25;
	Chart.defaults.global.scaleStartValue = 0;
	Chart.defaults.global.responsive = false;
	
	
	var ctxT = $("#tempChart").get(0).getContext("2d");
	var ctxH = $("#humChart").get(0).getContext("2d");

	var data = {
		labels:[],
		datasets: [
			{
			label: "temp",
			fillColor: "rgba(220,220,220,0.2)",
			strokeColor: "rgba(220,220,220,1)",
			pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
			data: []
			}
		]
	};
	
	var data2 = {
		labels:[],
		datasets: [
			{
			label: "humidity",
			fillColor: "rgba(220,220,220,0.2)",
			strokeColor: "rgba(220,220,220,1)",
			pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
			data: []
			}
		]
	};

	var tempChart = new Chart(ctxT).Line(data, {pointDotRadius : 2});
	var humChart = new Chart(ctxH).Line(data2, {pointDotRadius : 2});

	var socket = io();

    var pingSwitchDown = {};
    var printerScroll = 0;
	var time, 
		upDown,
		tempHigh = 0,
		humHigh = 0,
		tempHighLowArray = [],
		humHighLowArray = [],
		audioError = new Audio('error.mp3'),
		audioAlarm = new Audio('alarm.mp3');
	
	socket.on('tempHum', function(msg){
		
		var temp = msg.split(':')[0],
		hum = msg.split(':')[1],
		thi = 0, 
		tlo = 100,
		hhi = 0, 
		hlo = 100;
		
		//var hr = new Date().getHours();
		//hr = hr > 12 ? hr - 12 : hr;
		var min = new Date().getMinutes();
		var sec = new Date().getSeconds();
		//min = min < 10 ? "0" + min : min;
		//time = hr + ":" + min;

		/*  --==Set Temperature==--  */
		$('#temp').html(temp).animate({'color':'#11D828'}).delay(1000).animate({'color': 'white'});
		if(tempChart.datasets[0].points.length > 12){
			tempChart.removeData();
		}
		
		tempHigh = (parseInt(temp) > tempHigh) ? parseInt(temp) : tempHigh;
		if ((min === 0 && sec >= 0 && sec < 31) || tempChart.datasets[0].points.length < 12) {
			tempChart.addData([tempHigh], '');
			tempHigh = 0;
		}
		
		if (tempHighLowArray.length > 2880){
			tempHighLowArray.shift();
		}
		tempHighLowArray.push(parseInt(temp));
		
		tempHighLowArray.forEach(function(e){
			thi = (e > thi) ? e : thi;
			tlo = (e < tlo) ? e : tlo;
		});
		
		$('div#tempHigh span').html(thi);
		$('div#tempLow span').html(tlo);
		
		if(parseInt(temp)>75 && parseInt(temp)<78){
			tempChart.datasets[0].fillColor = "rgba(220,220,0,0.8)";
		} else if(parseInt(temp)>=78){
			tempChart.datasets[0].fillColor = "rgba(220,0,0,0.8)";
		} else {
			tempChart.datasets[0].fillColor = "rgba(220,220,220,0.2)";
		}
		tempChart.update();
		
		/*  --==Set Humidity==--  */
		$('#hum').html(hum);
		if(humChart.datasets[0].points.length > 12){
			humChart.removeData();
		}

		humHigh = (parseInt(hum) > humHigh) ? parseInt(hum) : humHigh;
		if ((min === 0 && sec >= 0 && sec < 31) || humChart.datasets[0].points.length < 12) {
			humChart.addData([humHigh], '');
			humHigh = 0;
		}
		
		if (humHighLowArray.length > 2880){
			humHighLowArray.shift();
		}
		humHighLowArray.push(parseInt(hum));
		
		humHighLowArray.forEach(function(e){
			hhi = (e > hhi) ? e : hhi;
			hlo = (e < hlo) ? e : hlo;
		});
		
		$('div#humHigh span').html(hhi);
		$('div#humLow span').html(hlo);
		
		if(parseInt(hum)>60 || parseInt(hum)<22){
			humChart.datasets[0].fillColor = "rgba(220,220,0,0.8)";
		} else {
			humChart.datasets[0].fillColor = "rgba(220,220,220,0.2)";
		}
		humChart.update();
		
	})
	.on('pings', function(data){
        //console.log(data)
		var pointers = ['internetArrow', 'phonesArrow', 'spillmanArrow'];
		pingDo(data, pointers, '');
	})
	.on('pingSwitch', function(data){
        if(!data){
            $('#upSwitchWidget').fadeOut();
			pingSwitchDown = {}
        } else {
            $('#upSwitchWidget').fadeIn();
            data.forEach(function(e){
                if(pingSwitchDown.hasOwnProperty(e)){
                    pingSwitchDown[e]++
                } else {
                   pingSwitchDown[e] = 1
                }
            });

			var $upSwitchWidget = $('#switchContent');
			$upSwitchWidget.html('');
            for(var p in pingSwitchDown){
                if(pingSwitchDown.hasOwnProperty(p)){
                    if(data.indexOf(p) === -1){
                        delete pingSwitchDown[p]
                    } else {
						var m = pingSwitchDown[p] === 1 ? ' Minute': ' Minutes';
						$upSwitchWidget.append('<div class="upType"><div class="text">' + p + '</div><div class="downFor">Down For ' + pingSwitchDown[p] + m + '</div></div>')
						// $upSwitchWidget.append('<div class="upType"><div class="upArrows down"></div><div class="text">' + p + '</div><div class="downFor">Down For ' + pingSwitchDown[p] + m + '</div></div>')
					}
                }
            }

            if($upSwitchWidget.height() > 300){
                var biggerBy = $upSwitchWidget.height() - 300;
                $upSwitchWidget.stop().delay(10000).animate({"margin-top": "-" + biggerBy + "px"}, 10000).delay(15000).animate({"margin-top": 0}, 10000)
            }
        }
	})
	.on('ticketCount', function(data){
		$('#ticketsWidget').stop().animate({'border-color':'#418A49'}, {queue:false}).delay(3000).animate({'border-color': '#333'});
		$('div#ticketsWidget h1').stop().animate({'color':'#11D828'}, {queue:false}).delay(3000).animate({'color': 'white'});
		$('#ticketCount').html(data);
	})
	.on('unasignedTickets', function(data){
		$('#unasignedSummary, #unasignedName, #unasignedDate').html('');
		if(data.length > 0){
			$('#ticketsWidget').stop().animate({'border-color':'#418A49'}, {queue:false}).delay(3000).animate({'border-color': '#333'});
			$('div#ticketsWidget h1').stop().animate({'color':'#11D828'}, {queue:false}).delay(3000).animate({'color': 'white'});
			$('#unasignedTitle').fadeIn();
			data.forEach(function(e){
				$('#unasignedSummary').append("<p>" + e.summary + "</p>");
				$('#unasignedName').append("<p>" + e.name + "</p>");
				var d = new Date(e.date);
				var now = new Date();
				var dateTime;
				if(d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getYear() === now.getYear()){
					var h = d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
					var m = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
					dateTime = h + ":" + m;
				} else {
					dateTime = (d.getMonth()+1) + "-" + d.getDate();	
				}
				$('#unasignedDate').append("<p>" + dateTime + "</p>");
			});
		} else {
			$('#unasignedTitle').fadeOut();
		}
	})
	.on('serverRoomLight', function(data){
		if(data === 'on'){
			$("#serverRoomLight").css({"backgroundImage": "url('images/bulbOn.png')"});
		} else {
			$("#serverRoomLight").css({"backgroundImage": "url('images/bulbOff.png')"});
		}
	})
	.on('leakDetected', function(data){
		if(data === 'leak'){
			audioAlarm.play();
			$("#cover").fadeIn(100);
			$("#leakDetected").fadeIn(100).delay(100).fadeOut(100).delay(100).fadeIn(200);
		} else {
			$("#leakDetected, #cover").fadeOut();
		}
	})
	.on('weather', function(data){
		$('#weatherTemp').html(data[0]);
		$('#weatherWeather').html(data[2]);
		var icon = '';
		switch (data[1]) {
			case 'partlycloudy':
			case 'mostlysunny':
				icon = 'partly-cloudy-day';
				break;
			case 'clear':
			case 'sunny':
				icon = 'clear-day';
				break;
			case 'mostlycloudy':
			case 'partlysunny':
				icon = 'cloudy';
				break;
			case 'flurries':
			case 'chanceflurries':
			case 'chancesleet':
			case 'chancesnow':
			case 'sleet':
				icon = 'snow';
				break;
			case 'chancetstorms':
			case 'chancerain':
			case 'tstorms':
				icon = 'rain';
				break;
			case 'hazy':
				icon = 'fog';
				break;
			case 'unknown':
				icon = 'wind';
				break;
			default:
				icon = data[1];
		}
		skycons.set('weatherIcon', icon);
	})
	.on('woot', function(data){
		//console.log(data);
		$('#wootTitle').html(data[0]);
		$('#wootPrice').html(data[1]);
		$('#wootImage').css({'background-image': 'url("' + data[2] + '")'});
		$('div#wootWidget h1').html(data[3]);
	})
	.on('whosHere', function(data){
		// console.log(data)
		var $whosHere = $('div#whosHere');
		$whosHere.html('');
		$whosHere.css({'background-image': 'url("' + data.image + '")'});

		var date = new Date(),
            halloween = (date.getMonth() === 9);

		if(data.faces.length > 0 && !halloween){
			for(var i = 0; i < data.faces.length ; i++){
				$('#whosHere').append("<div class='face' style='left:" + data.faces[i].left + "px;top:" + data.faces[i].top + "px;width:" + data.faces[i].width + "px;height:" + data.faces[i].height + "px'><div class='faceInfo'></div></div>");
				var $whosHereInfo = $('div#whosHere div.face:nth-child(' + (i + 1) + ') div.faceInfo'),
					highEmotionNo = 0,
					highEmotion = '';
				for (var t in data.faces[i].scores){
					if (!data.faces[i].scores.hasOwnProperty(t)) continue;
					$whosHereInfo.append("<p>" + t + ': ' + data.faces[i].scores[t] + "%</p>");
					if(data.faces[i].scores[t] > highEmotionNo){
						highEmotionNo = data.faces[i].scores[t];
						highEmotion = t
					}
				}
				var plus = (highEmotionNo > 60) ? '2' : '';
				$whosHereInfo.prepend('<div class="emoji"><img src="/images/emotion/' + highEmotion + plus + '.png"></div>').css({'margin-top': data.faces[i].height + 20});
			}
		}

		for(var f = 0; f < data.stats.length ; f++){
            var desc = '';
			if(halloween){
                if(!(/boo/g.test(data.image))){
                    // masks format [image width, image height, outside of eyes width]
                    var masks = [[649, 884, 564], [828, 1000, 485], [603, 785, 384], [969, 1000, 526], [518, 726, 370], [571, 1000, 440], [790, 947, 538], [781, 1000, 518], [553, 691, 413], [770, 1000, 540], [655, 1000, 450]],
                        names = ['Anonymous', 'Mrs. "What Emails?"', 'The Joker', 'Kylo Ren', 'Jason', 'Batman', 'Mr. Robot', 'A sad clown', 'Jigsaw', 'A First Order Trooper', 'Skullman'];
                    var rnd = getRandomInt(0, masks.length);
                    var faceW = data.stats[f].width;
                    var width = (faceW / masks[rnd][2]) * masks[rnd][0];
                    var difT = ((width / masks[rnd][0]) * masks[rnd][1]) - data.stats[f].width;
                    var difL = (width - faceW) / 2;
                    $('#whosHere').append("<img src='images/halloween/mask" + rnd + ".png' style='left:" + (data.stats[f].left - difL) + "px;top:" + (data.stats[f].top - difT + 10) + "px;width:" + width + "px; position: absolute'>");
                    desc = names[rnd] + " is at the door.";
                } else {
                    desc = data.description;
                }
			} else {
                $('#whosHere').append("<div class='faceAge' style='left:" + data.stats[f].left + "px;top:" + (data.stats[f].top - 90) + "px'><p>" + data.stats[f].gender + "</p><p>" + data.stats[f].age + "</p></div>");
                desc = data.description;
            }
		}
        $whosHere.append("<div id='description'>" + desc + "</div>");

		$('#whosHere, #cover').stop().fadeIn(500).delay(15000).fadeOut(500);
	})
    .on('printers', function(data){
		//console.log(data);
        if(!data){
            $('#printersWidget').fadeOut();
        } else {
            $('#printersWidget').fadeIn();
            clearInterval(printerScroll);
            var $printersContent = $('#printersContent');
            $printersContent.html('');

            data.forEach(function(e){
                var name = e[0][0],
                    ip = e[0][1];
                //console.log(e[0][0], '(' + e[0][1] + ')');
                $printersContent.append('<div class="printer" data-name="' + name + '">' + name + ' <span>(' + ip + ')</span><div class="inks"></div></div>');
                e[1].forEach(function(i){
                    var color = i[0].split(' ')[0];
                    color = (color === 'Black') ? 'White' : color;
                    //console.log('   - ' + i[0], i[1] + '%');
                    $('*[data-name="' + name + '"] .inks').append('<div><span class="ink" style="color:' + color + '">' + i[0] + '</span> - <span class="percent">' + i[1] + '%</span></div>')
                })
            });

            if($printersContent.height() > 300){
                var biggerBy = $printersContent.height() - 300;
                $printersContent.stop().delay(10000).animate({"margin-top": "-" + biggerBy + "px"}, 10000).delay(15000).animate({"margin-top": 0}, 10000)
                printerScroll = setInterval(function(){
                    $printersContent.stop().delay(10000).animate({"margin-top": "-" + biggerBy + "px"}, 10000).delay(15000).animate({"margin-top": 0}, 10000)
                }, 1000*60);
            }
        }

	})
	.on('news', function(data){
		console.log('hello')
		console.log(data);
		$('#newsTitle').html(data[0]);
		$('#newsBody').html(data[1]);
	});
	
	function pingDo(data, pointers, who){
		upDown = 0;
		for(var i = 0; i < data.length; i++){
            var $pointers = $("#" + pointers[i]);
			if(data[i] === "Down"){
				//To change image change below to: $pointers.css({"background-image": down_image_name});
				// $pointers.css({"background-position": -31});
				$pointers.css({"background-image": "url('images/flame.gif')"});
				
				var warnCount = ($pointers.parent().find('.downFor').html() === "") ? "" : $pointers.parent().find('.downFor').html().split(' ')[2];
				if(warnCount !== ''){
					warnCount = parseInt(warnCount) + 1;
					$pointers.parent().find('.downFor').html("Down for: " + warnCount + " minutes");
				} else {
					$pointers.parent().find('.downFor').html('Down for: 1 minute');
				}
				upDown++;
				if(warnCount === 1){
					audioError.play();
				}
			} else {
				//To change image change below to: $pointers.css({"background-image": up_image_name}).parent().find('.downFor').html('');
				// $pointers.css({"background-position": 0}).parent().find('.downFor').html('');
				$pointers.css({"background-image": "url('images/newnyancat.gif ')"}).parent().find('.downFor').html('');
			}
		}
			
		if(upDown > 0){
			$('#up' + who +'Widget h1').animate({"color": "red"});
			$('#up' + who +'Widget').animate({"border-color": "red"});				
		} else {
			$('#up' + who +'Widget h1').animate({"color": "white"});
			$('#up' + who +'Widget').animate({"border-color": "#333"});
		}
	}

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}
});