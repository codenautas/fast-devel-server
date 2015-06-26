"use strict";

function ajaxSimple(params){
    var ajax = new XMLHttpRequest();
    params.onerror=params.onerror||function(err){ alert(err); };
    ajax.open(params.method||'get',params.url);
    ajax.onload=function(e){
        if(ajax.status!=200){
            params.onerror(new Error(ajax.status+' '+ajax.responseText));
        }else{
            try{
                params.onload.call(null,ajax.responseText);
            }catch(err){
                params.onerror(err);
            }
        }
    }
    ajax.onerror=params.onerror;
    ajax.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    var enviar=Object.keys(params.data).map(function(key){
        return key+'='+encodeURIComponent(params.data[key]);
    }).join('&');
    ajax.send(enviar);
}

window.addEventListener('load',function(){
    var spans=document.querySelectorAll("[data-dirinfo=dirinfo]");
    for(var iSpan=0; iSpan<spans.length; iSpan++){
        // var span=spans[iSpan];
        (function(span){
            span.textContent='...';
            ajaxSimple({
                url:span.dataset.path,
                data:{},
                onload:function(text){
                    span.title=text;
                    span.textContent=text;
                },
                onerror:function(text){
                    span.title=text;
                    span.textContent='E!';
                }
            });
        })(spans[iSpan]);
    }
});