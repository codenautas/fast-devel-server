"use strict";

var visibleFrame;

var actualFrames=[];

function resize(){
    visibleFrame.style.width=innerWidth-visibleFrame.controlTagLateral.offsetWidth-40+'px';
    visibleFrame.style.height=innerHeight-50+'px';
}

function ajaxSimple(params){
    var ajax = new XMLHttpRequest();
    ajax.open('get',params.url);
    ajax.onload=function(e){
        try{
            params.onload.call(this,e);
        }catch(err){
            params.onerror(err);
        }
    }
    ajax.onerror=params.onerror;
    ajax.send();
}

function loadFrames(){
    var pattern=/^((https?:\/\/)?[-a-z.0-9]+(:\d+)?)\/file(\/|$)/;
    actualFrames.forEach(function(frame){
        frame.controlTagLateral.textContent='T';
        if(!frame.codenautas_info){
            frame.codenautas_info={
                mtime:"",
                autorefresh:!(/^((https?:\/\/)?[-a-z.0-9]+(:\d+)?)\/auto\/\!/.test(document.URL))
            };
        }
        if(frame.codenautas_info.autorefresh){
            var parametrosQuery=function(){
                return frame.codenautas_info.originFileName && convertir.checked?"?from-original="+encodeURIComponent(frame.codenautas_info.originFileName):"";
            }
            ajaxSimple({
                url:'/info'+frame.dataset.path+parametrosQuery(),
                onload:function(e){
                    var info=JSON.parse(this.responseText);
                    frame.codenautas_info.originFileName=info.originFileName;
                    if(frame.codenautas_info.mtime!='ignored' && frame.codenautas_info.mtime<info.mtime){
                        frame.controlTagLateral.textContent='R';
                        frame.controlTagLateral.title='Refreshing';
                        frame.src='/file'+frame.dataset.path+parametrosQuery();
                        frame.onload=function(){
                            var insideFrame=false;
                            try{
                                insideFrame=pattern.test(frame.contentDocument.URL);
                            }catch(err){
                                insideFrame=false;
                            }
                            if(insideFrame){
                                var newUrl=frame.contentDocument.URL.replace(pattern,'$1/auto/')
                                var loadedPath='/'+frame.contentDocument.URL.replace(pattern,'');
                                var autorefresh=true;
                            }else{
                                var newUrl='/auto/!EXTERNAL';
                                var loadedPath='!EXTERNAL';
                                var autorefresh=false;
                            }
                            if(loadedPath != frame.dataset.path){
                                frame.dataset.path = loadedPath;
                                frame.codenautas_info.mtime='ignored';
                                frame.codenautas_info.autorefresh=autorefresh;
                                window.history.replaceState(null, document.title, newUrl);
                            }
                            frame.controlTagLateral.textContent='L';
                            frame.controlTagLateral.title=frame.src;
                            setTimeout(resize,100);
                            // setTimeout(loadFrames,1000);
                        }
                        frame.codenautas_info.mtime=info.mtime;
                    }else{
                        if(frame.codenautas_info.mtime=='ignored'){
                            frame.codenautas_info.mtime=info.mtime;
                        }else{
                            frame.controlTagLateral.textContent='I';
                        }
                        // setTimeout(loadFrames,1000);
                    }
                    for(var name in frame.codenautas_info){
                        var element=document.getElementById(name);
                        if(element){
                            element.textContent=frame.codenautas_info[name];
                        }
                    }
                    opcion_originFileName.style.display=(frame.codenautas_info.originFileName?"":"none");
                },
                onerror:function(err){
                    // setTimeout(loadFrames,1000);
                }
            });
        }
    });
}

window.addEventListener("popstate", function(e) {
    console.log(e);
    swapPhoto(location.pathname);
});

window.addEventListener('load',function(){
    visibleFrame=frame1;
    visibleFrame.controlTagLateral=lateral1;
    actualFrames.push(visibleFrame);
    window.addEventListener('resize', resize);
    setTimeout(resize,100);
    // setTimeout(loadFrames,1000);
    setInterval(loadFrames,1000);
});