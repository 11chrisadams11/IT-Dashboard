$(function() {

    $('#searchButton').click(function(){
        $($('div#results div').get().reverse()).each(function(i){
            $(this).delay(20 * i).fadeOut(100);
        })
            .promise()
            .done(function(){
                search($('#searchInput').val());
                // socket.emit('search', $('#searchInput').val())
            });

    });

    function search(query) {
        $.ajax(
            {
                type: 'get',
                url: "/search/for/" + query
            }
        )
            .done(function (results) {
                var $results = $('#results');
                $results.html('');
                if(results.length === 0){
                    $results.append('<div style="text-align: center; display: block">No items found.</div>');
                } else {
                    results.forEach(function(e){
                        $results.append('<div class="result"><div class="deleteButton"></div><span class="name">' + e[0] + '</span> <span class="ip"><a href="http://' + e[1] + '" target="_blank">' + e[1] + '</a></span></div>');
                    });
                    for(var i = 1; i <= results.length ; i++){
                        $('div#results div:nth-child(' + i + ')').delay(40 * i).fadeIn(200)
                    }
                }
            })
    }

    function addIP(){
        var obj = {
            searchName: $('#addIPSearchName').val(),
            pingName: $('#addIPPingName').val(),
            ip: $('#addIPIP').val()
        };
        $('#addIPPopup, #dimmer').fadeOut();

        $.ajax(
            {
                type: 'post',
                url: "/addip",
                data: JSON.stringify(obj),
                headers:{'content-type': 'application/json'}
            }
        )
            .done(function (results) {
                if(results){
                    console.log('Add done')
                    $('#addIPSearchName, #addIPPingName, #addIPIP').val('');
                    search($('#searchInput').val());
                } else {
                    console.log('Add failure')
                }
            })
    }

    function removeIP(ip){
        $.ajax(
            {
                type: 'post',
                url: "/removeip",
                data: JSON.stringify({ip: ip}),
                headers:{'content-type': 'application/json'}
            }
        )
            .done(function (results) {
                if(results){
                    console.log('Remove done')
                    search($('#searchInput').val());
                } else {
                    console.log('Remove failure')
                }
            })
    }

    $('#searchInput').keyup(function(e){
        if(e.keyCode == 13)
        {
            $('#searchButton').click();
        }
    });

    $('#addButton').click(function() {
        $('#addIPPopup, #dimmer').fadeIn()
    });

    $('#addIPAddButton').click(function(){
/*        if($('#addIPSearchName').val() === ''){
            $('#addIPSearchName').css({'box-shadow': '0 0 6px red'});
            empty++;
        } else {
            $('#addIPSearchName').css({'box-shadow': '0 0 0 red'})
        }
        if($('#addIPPingName').val() === ''){
            $('#addIPPingName').css({'box-shadow': '0 0 6px red'});
            empty++
        } else {
            $('#addIPPingName').css({'box-shadow': '0 0 0 red'})
        }*/
        if($('#addIPIP').val() === ''){
            $('#addIPIP').css({'box-shadow': '0 0 6px red'});
        } else {
            $('#addIPIP').css({'box-shadow': '0 0 0 red'})
            addIP()
        }
    });

    $('#addIPCancelButton').click(function(){
        $('#addIPPopup, #dimmer').fadeOut()
    });

    var ipToRemove = '';

    $('#results').on('mouseenter', '.result', function(){
        $(this).find('.deleteButton').stop().animate({"margin-left": -1})
    })
    .on('mouseleave', '.result', function(){
        $(this).find('.deleteButton').stop().animate({"margin-left": -25})
    })
    .on('click', '.deleteButton', function(){
        $('#removeIPName').html($(this).parent().find('.name').text());
        ipToRemove = $(this).parent().find('.ip').find('a').text();
        $('#removeIPIP').html(ipToRemove);
        $('#removeIPPopup, #dimmer').fadeIn()
    });

    $('#removeIPYesButton').click(function(){
        $('#removeIPPopup, #dimmer').fadeOut();
        removeIP(ipToRemove)
    });

    $('#removeIPNoButton').click(function(){
        $('#removeIPPopup, #dimmer').fadeOut()
    })
});