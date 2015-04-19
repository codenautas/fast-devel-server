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
                if(frame.codenautas_fstat.mtime<fstat.mtime){
                    frame.controlTagLateral.textContent='R';
                    frame.controlTagLateral.title='Refreshing';
                    frame.src='/loading.html';
                    frame.src='/file'+frame.dataset.path;
                    frame.onload=function(){
                        frame.controlTagLateral.textContent='L';
                        frame.controlTagLateral.title=fstat.mtime;
                    }
                    frame.codenautas_fstat.mtime=fstat.mtime;
                }else{
                    frame.controlTagLateral.textContent='I';
                }
            }
        });
    });
}

window.addEventListener('load',function(){
    visibleFrame=frame1;
    visibleFrame.controlTagLateral=lateral1;
    actualFrames.push(visibleFrame);
    window.addEventListener('resize', resize);
    resize();
    setInterval(loadFrames,1000);
});