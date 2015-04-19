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
    actualFrames.forEach(function(frame){
        frame.controlTagLateral.textContent='T';
        ajaxSimple({
            url:'/info'+frame.dataset.path,
            onload:function(e){
                var fstat=JSON.parse(this.responseText);
                if(!frame.codenautas_fstat){
                    frame.codenautas_fstat={mtime:""};
                }
                if(frame.codenautas_fstat.mtime=='ignored'){
                    frame.codenautas_fstat.mtime=fstat.mtime;
                }else if(frame.codenautas_fstat.mtime<fstat.mtime){
                    frame.controlTagLateral.textContent='R';
                    frame.controlTagLateral.title='Refreshing';
                    frame.src='/file'+frame.dataset.path;
                    frame.onload=function(){
                        var pattern=/^((https?:\/\/)?[-a-z.0-9]+(:\d+)?)\/file(\/|$)/;
                        var loadedPath='/'+frame.contentDocument.URL.replace(pattern,'');
                        if(loadedPath != frame.dataset.path){
                            frame.dataset.path = loadedPath;
                            frame.codenautas_fstat.mtime='ignored';
                            var newUrl=frame.contentDocument.URL.replace(pattern,'$1/auto/')
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