$(function(){
	
	/*Chart.defaults.global = {
		tooltips: {
			enabled: false
		},
		title: {
			display: false
		}
	};*/
	
	Chart.defaults.global.tooltips.enabled = false;
	Chart.defaults.global.legend.display = false;
	
	var ctxT = $("#tempChart");
	var ctxH = $("#humChart");

	var data = {
		labels:[],
		datasets: [
			{
			label: "temp",
			fill: true,
			backgroundColor: "rgba(220,220,220,0.2)",
			borderColor: "rgba(220,220,220,1)",
			pointBorderColor: "rgba(220,220,220,1)",
			data: []
			}
		]
	};
	
	var data2 = {
		labels:[],
		datasets: [
			{
			label: "humidity",
			fill: true,
			backgroundColor: "rgba(220,220,220,0.2)",
			borderColor: "rgba(220,220,220,1)",
			pointBorderColor: "rgba(220,220,220,1)",
			data: []
			}
		]
	};

	var tempChart = new Chart(ctxT, {
		type: 'line', 
		data: data
	});
	
	tempChart.options.scales.xAxes.type = 'time';
	tempChart.options.scales.xAxes.display = false;
	
	var humChart = new Chart(ctxH, {
		type: 'line', 
		data: data2
	});

	var socket = io();
	$('form').submit(function(){
		socket.emit('chat message', $('#m').val());
		$('#m').val('');
		return false;
	});
	  
	var time;
	socket.on('chat message', function(msg){
		var temp = msg.split(':')[0],
		hum = msg.split(':')[1];
		
		var hr = new Date().getHours();
		hr = hr > 12 ? hr - 12 : hr;
		var min = new Date().getMinutes();
		min = min < 10 ? "0" + min : min;

		time = hr + ":" + min;

		$('#temp').html(temp);
		if(tempChart.config.data.datasets[0].data.length > 10){
			tempChart.data.datasets[0].data.shift();
		}
		tempChart.data.datasets[0].data.push(parseInt(temp));
		tempChart.update();
		
		if(parseInt(temp)>75 && parseInt(temp)<78){
			tempChart.data.datasets[0].backgroundColor = "rgba(220,220,0,0.8)";
			tempChart.update();
		} else if(parseInt(temp)>=78){
			tempChart.data.datasets[0].backgroundColor = "rgba(220,0,0,0.8)";
			tempChart.update();
		} else {
			tempChart.data.datasets[0].backgroundColor = "rgba(220,220,220,0.2)";
			tempChart.update();
		}
		
		$('#hum').html(hum);
		if(humChart.config.data.datasets[0].data.length > 10){
			humChart.data.datasets[0].data.shift();
		}
		humChart.data.datasets[0].data.push(parseInt(hum));
		humChart.update();
		//humChart.addData([parseInt(hum)], time);
		if(parseInt(hum)>60 || parseInt(hum)<40){
			humChart.data.datasets[0].backgroundColor = "rgba(220,220,0,0.8)";
			humChart.update();
		} else {
			humChart.data.datasets[0].backgroundColor = "rgba(220,220,220,0.2)";
			humChart.update();
		}
	});
});