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

function addDirEntryIcon(span,opts){
    var img=document.createElement('img');
    img.src=opts.icon;
    img.title=opts.value;
    img.alt=opts.property;
    img.style.height='18px';
    img.style.rightMargin='3px';
    if(span.textContent==='...'){
        span.textContent='';
    }
    span.appendChild(img);
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
                    if(span.textContent==='...'){
                        span.textContent='';
                    }
                    span.title=text;
                    var info=JSON.parse(text);
                    for(var property in info){
                        var value=info[property];
                        var response=dirInfo.possibleResponses[property];
                        if(response && (!response.showIf || response.showIf(info))){
                            addDirEntryIcon(span,{
                                icon:response.icon,
                                value:value===true?property:property+':'+value,
                                property:property
                            });
                            if(response.type==='list-of-files'){
                                value.forEach(function(fileName){
                                    var element=document.getElementById('dirinfo-'+fileName);
                                    if(element){
                                        addDirEntryIcon(element,{
                                            icon:response.icon,
                                            value:property,
                                            property:property
                                        }); 
                                    }
                                });
                            }
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