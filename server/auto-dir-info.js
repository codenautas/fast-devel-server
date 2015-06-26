"use strict";

var dirInfo={};

dirInfo.possibleResponses = {
    is:{
        values:{
            github:'h',
            git:'g',
            svn:'s',
            multilang:'m',
            "package.json":'p',
            json:'j',
            other:''
        }
    },
    status:{
        values:{
            error:'E', // for json & package.json
            deletes:'D',
            changed:'C',
            unstaged:'U',
            ignored:'i',
            outdated:'O', // only for multilang
            ok:''
        }
    },
    server:{
        values:{
            unpushed:'P',
            unsynced:'S',
            outdated:'O',
            ok:''
        }
    },
    isGit:{
        type:'boolean',
        icon:'https://git-scm.com/favicon.ico'
    },
    isGithub:{
        type:'boolean',
        icon:'https://github.com/fluidicon.png'
    },
    modifieds:{
        type:'list-of-files',
        icon:'/modifieds.png'
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
                    var info=JSON.parse(text);
                    for(var property in info){
                        var value=info[property];
                        var theIconUrl=(dirInfo.possibleResponses[property]||{}).icon;
                        if(theIconUrl){
                            var img=document.createElement('img');
                            img.src=theIconUrl;
                            img.title=value;
                            img.alt=property;
                            img.style.height='18px';
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