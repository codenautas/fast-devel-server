/*!
 * fast-devel-server
 * 2015 Codenautas
 * GNU Licensed
 */

/**
 * Module dependencies.
 */
 
var _ = require('lodash');
var moment = require('moment');

module.exports = {
    html4serveIndex:function(serveIndex){
        var oldHtml = serveIndex.html;
        serveIndex.html = function html(req, res, files, next, dir, showUp, icons, path, view, template, stylesheet){
            var middleRes = {
                setHeader:function setHeader(name, value){
                    if(name!='Content-Length'){
                        res.setHeader(name, value);
                    }
                },
                end:function end(content){
                    var text=content.toString();
                    _.forEach(files,function(file){
                        var pattern = 
                        text = text.replace(
                            new RegExp(
                                '(<li><a href="/file/)([^"]+)'+
                                '(".*title="'+
                                _.escapeRegExp(file)+
                                '".*class="date">)([-a-zA-Z:./0-9 ]+)(</span>)(</a></li>)'
                            ),
                            function(match,firstLi,url,prefix,date,sufix,lastLi){
                                var dateObject=moment(new Date(date));
                                return firstLi+url+prefix+dateObject.format('DD/MM/YYYY HH:mm:ss')+sufix+
                                    '<span data-dirinfo=dirinfo id="dirinfo-'+file+'" data-path="/dir-info/'+url+'">?</span></a></li>';
                            }
                        )
                    });
                    text = text.replace(/  direction: rtl;/,'');
                    text = text.replace(/  width: 30%;/g,'  width: 25%;');
                    text = text.replace(/<\/body>/,'<script src="/auto-dir-info.js"></script></body>');
                    res.setHeader('Content-Length', text.length);
                    res.end(text);
                }
            };
            return oldHtml.call(serveIndex,req, middleRes, files, next, dir, showUp, icons, path, view, template, stylesheet);
        };
    }
};