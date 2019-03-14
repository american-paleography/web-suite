$('#exhibit-navmenu > li').click( function(event){
        event.stopPropagation();
        $('#exhibit-navmenu .dropdown-inner').toggle();
});

$('#user-menu > li').click( function(event){
        event.stopPropagation();
        $('#user-menu .dropdown-inner').toggle();
});

$(document).click( function(){
        $('.dropdown-inner').hide();
});
