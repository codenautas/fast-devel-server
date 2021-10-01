"use strict";

var dirInfo={};

function eid(x){ return document.getElementById(x); }

function isNotSubdirInProject(info, element){
    return element.dataset.dirinfotype!='sub'; 
}

dirInfo.possibleResponses = {
    isGit:{
        type:'boolean',
        showIf:function isNotGithub(info, element){ return !info.isGithub && !info.isGitlab && element.dataset.dirinfotype!='sub'; },
        icon:'https://git-scm.com/favicon.ico'
    },
    isGithub:{
        type:'boolean',
        showIf:isNotSubdirInProject,
        icon:'https://github.com/fluidicon.png'
    },
    isGitlab:{
        type:'boolean',
        showIf:isNotSubdirInProject,
        icon:'https://about.gitlab.com/ico/favicon-32x32.png'
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
        showIf:isNotSubdirInProject,
        icon:'/unsynced.png'
    },
    pushPending:{
        type:'boolean',
        showIf:isNotSubdirInProject,
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

function isProject(info, element){
    return (info.isGithub || info.isGitlab) && isNotSubdirInProject(info, element);
}

var actions={
    install:{
        icon:'/ac-install.png',
        showIf:isProject,
        title:'pull, prune, install & test'
    },
    'npm-check-updates--u':{
        icon:'/ac-npm-check-updates--u.png',
        showIf:function(info){
            return info.isPackageJson && info.isOutdated;
        },
        title:'npm-check-updates -u'
    },
    stage:{
        icon:'/ac-stage.png',
        showIf:function(info){
            return info.untracked;
        },
        title:'stage (add)'
    }
}

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
    if(opts.invisible){
        img.style.visibility='hidden';
    }
    span.appendChild(img);
}

window.addEventListener('load',function(){
    var elements=document.querySelectorAll("[data-dirinfo=dirinfo]");
    for(var iElement=0; iElement<elements.length; iElement++){
        // var element=elements[iElement];
        (function(element){
            element.textContent='...';
            ajaxSimple({
                url:element.dataset.path,
                data:{},
                onload:function(text){
                    if(element.textContent==='...'){
                        element.textContent='';
                    }
                    element.title=text;
                    var info=JSON.parse(text);
                    for(var property in info){
                        var value=info[property];
                        var response=dirInfo.possibleResponses[property];
                        if(response && (!response.showIf || response.showIf(info,element))){
                            addDirEntryIcon(element,{
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
                    for(var actionName in actions){
                        var actionInfo=actions[actionName];
                        var elementAction=document.getElementById('execaction-'+element.dataset.name);
                        if(actionInfo.showIf && actionInfo.showIf(info, element)){
                            var a=document.createElement('a');
                            a.href='/exec-action/controls/'+actionName+'/'+(element.dataset.name=='..'?element.dataset.parent:element.dataset.name);
                            elementAction.appendChild(a);
                            addDirEntryIcon(a,{
                                icon:actionInfo.icon,
                                // invisible:!actionInfo.showIf || !actionInfo.showIf(info, element),
                                value:actionInfo.title||actionName,
                                property:actionName
                            });
                            a.onclick=function(event){
                                event.preventDefault();
                                var iframe=document.createElement('iframe');
                                var mainElement=document.body.childNodes[1];
                                mainElement.id='main-dir';
                                eid('main-dir').style.cssFloat='left';
                                eid('main-dir').parentNode.appendChild(iframe);
                                iframe.style.cssFloat='left';
                                iframe.style.border='1px solid green';
                                iframe.src=this.href;
                            }
                        }
                    }
                },
                onerror:function(text){
                    addDirEntryIcon(element,{
                        icon:'/mini-error.png',
                        value:text,
                        property:'dir-info ERR!'
                    });
                }
            });
            if(element.dataset.dirinfotype==='dir'){
                // ajaxSimple({
                //     url:element.dataset.path.replace(/^\/dir-info\//,'/qa-control/'),
                //     data:{},
                //     onload:function(text){
                //         var warnings=JSON.parse(text);
                //         addDirEntryIcon(element,{
                //             icon:warnings.length?
                //                 (/"warning":"(no_qa_control_section_in_|no_package_json)/.test(text)?'/qa-control-na.png':'/qa-control-warns.png'):
                //                 '/qa-control-ok.png',
                //             value:text,
                //             property:'qa-control!'
                //         });
                //     },
                //     onerror:function(text){
                //         addDirEntryIcon(element,{
                //             icon:'/mini-error.png',
                //             value:text,
                //             property:'qa-control ERR!'
                //         });
                //     }
                // });
            }
        })(elements[iElement]);
    }
});