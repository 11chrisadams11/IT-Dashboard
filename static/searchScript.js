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
                        $results.append('<div class="result">' + e[0] + ' <span><a href="http://' + e[1] + '" target="_blank">' + e[1] + '</a></span></div>');
                    });
                    for(var i = 1; i <= results.length ; i++){
                        $('div#results div:nth-child(' + i + ')').delay(40 * i).fadeIn(200)
                    }
                }
            })
    }

    $('input').keyup(function(e){
        if(e.keyCode == 13)
        {
            $('#searchButton').click();
        }
    });

});