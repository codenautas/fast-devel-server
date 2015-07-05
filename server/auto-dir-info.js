"use strict";

var dirInfo={};

dirInfo.possibleResponses = {
    isGit:{
        type:'boolean',
        showIf:function isNotGithub(info){ return !info.isGithub; },
        icon:'https://git-scm.com/favicon.ico'
    },
    isGithub:{
        type:'boolean',
        icon:'https://github.com/fluidicon.png'
    },
    modifieds:{
        type:'list-of-files',
        icon:'/modifieds.png'
    },
    deletes:{
        type:'list-of-files',
        icon:'/deletes.png'
    },
    untrackeds:{
        type:'list-of-files',
        icon:'/untrackeds.png'
    },
    syncPending:{
        type:'boolean',
        icon:'/unsynced.png'
    },
    pushPending:{
        type:'boolean',
        icon:'/push.png'
    },
    isPackageJson:{
        type:'boolean',
        icon:'/packagejson.png'
    },
    isOutdated:{
        type:'boolean',
        icon:'/outdated.png'
    }
};

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
                    span.textContent='';
                    var info=JSON.parse(text);
                    for(var property in info){
                        var value=info[property];
                        var response=dirInfo.possibleResponses[property];
                        if(response && (!response.showIf || response.showIf(info))){
                            var img=document.createElement('img');
                            img.src=response.icon;
                            img.title=value;
                            img.alt=property;
                            img.style.height='18px';
                            img.style.rightMargin='3px';
                            span.appendChild(img);
                        }
                    }
                },
                onerror:function(text){
                    span.title=text;
                    span.textContent='E!';
                }
            });
        })(spans[iSpan]);
    }
});