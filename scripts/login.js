$(function(){
    $("#btn").click(function(){
        $.ajax({
            type: "POST",
            url: 'https://api.22seven.com/sessions?version=7',
            data: JSON.stringify({
                username: $("#email").val(),
                password: $("#password").val()
            }),
            success: function(response){
                localStorage.setItem('token', response.sessionToken);
                localStorage.setItem('customer_id', response.customerId);
                window.location.href="/index.html";
            }
        })
    });
});