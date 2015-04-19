"use strict";

var visibleFrame;

var actualFrames=[];

function resize(){
    visibleFrame.style.width=innerWidth-visibleFrame.controlTagLateral.offsetWidth-40+'px';
    visibleFrame.style.height=innerHeight-30+'px';
}

function ajaxSimple(params){
    var ajax = new XMLHttpRequest();
    ajax.open('get',params.url);
    ajax.onload=params.onload;
    ajax.send();
}

function loadFrames(){
    var pattern=/^((https?:\/\/)?[-a-z.0-9]+(:\d+)?)\/file(\/|$)/;
    actualFrames.forEach(function(frame){
        frame.controlTagLateral.textContent='T';
        if(!frame.codenautas_fstat){
            frame.codenautas_fstat={
                mtime:"",
                autorefresh:!(/^((https?:\/\/)?[-a-z.0-9]+(:\d+)?)\/auto\/\!/.test(document.URL))
            };
        }
        if(frame.codenautas_fstat.autorefresh){
            ajaxSimple({
                url:'/info'+frame.dataset.path,
                onload:function(e){
                    var fstat=JSON.parse(this.responseText);
                    if(frame.codenautas_fstat.mtime=='ignored'){
                        frame.codenautas_fstat.mtime=fstat.mtime;
                    }else if(frame.codenautas_fstat.mtime<fstat.mtime){
                        frame.controlTagLateral.textContent='R';
                        frame.controlTagLateral.title='Refreshing';
                        frame.src='/file'+frame.dataset.path;
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
                                frame.codenautas_fstat.mtime='ignored';
                                frame.codenautas_fstat.autorefresh=autorefresh;
                                window.history.replaceState(null, document.title, newUrl);
                            }
                            frame.controlTagLateral.textContent='L';
                            frame.controlTagLateral.title=frame.src;
                        }
                        frame.codenautas_fstat.mtime=fstat.mtime;
                    }else{
                        frame.controlTagLateral.textContent='I';
                    }
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
    resize();
    setInterval(loadFrames,1000);
});