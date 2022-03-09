// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         3.0
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

var {autowide = '0', videocodec = '0'} = localStorage;
var title;
var format = {
    '30280': {label: '音频 高码率', ext: '.192k.aac'},
    '30232': {label: '音频 中码率', ext: '.128k.aac'},
    '30216': {label: '音频 低码率', ext: '.64k.aac'},
    '127': {label: '8K 超高清', ext: '.8K-UHD.mp4'},
    '120': {label: '4K 超清', ext: '.4K-UHD.mp4'},
    '116': {label: '1080P 60帧', ext: '.1080HQ.mp4'},
    '112': {label: '1080P 高码率', ext: '.1080Hbr.mp4'},
    '80': {label: '1080P 高清', ext: '.1080.mp4'},
    '74': {label: '720P 60帧', ext: '.720HQ.mp4'},
    '64': {label: '720P 高清', ext: '.720.mp4'},
    '32': {label: '480P 清晰', ext: '.480.mp4'},
    '16': {label: '360P 流畅', ext: '.360.mp4'},
    '15': {label: '360P 流畅', ext: '.360LQ.mp4'},
    'avc1': '视频编码: H.264',
    'hev1': '视频编码: HEVC',
    'mp4a': '音频编码: AAC'
};

var css = document.createElement('style');
css.innerHTML = '#helper-main {background-color: #fff; position: relative; z-index: 9999; display: inline-block; user-select: none;}\
#helper-options, #helper-analyse {position: relative; border: 1px solid #000; padding: 5px;}\
#helper-options p, #helper-options select, .helper-button {font-size: 16px; text-align: center; padding: 5px;}\
#helper-options select {width: 100%;}\
#helper-analyse ul {display: inline-block; margin-righ: 3px; vertical-align: top;}\
.helper-button {background-color: #c26; color: #fff; height: 16px; line-height: 16px; padding: 10px 15px; display: inline-block; margin-right: 3px; cursor: pointer;}\
.helper-button:hover {background-color: #26c;}';

var menu = document.createElement('div');
menu.id = 'helper-main';
menu.innerHTML = '<span id="options" class="helper-button">设置</span><span id="analyse" class="helper-button">解析</span>';
menu.querySelector('#options').addEventListener('click', event => {
    analyse.style.display = 'none';
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
});
menu.querySelector('#analyse').addEventListener('click', event => {
    options.style.display = 'none';
    analyse.style.display = analyse.style.display === 'none' ? 'block' : 'none';
    analyse.innerHTML = '<ul id="helper-thumb"></ul><ul id="helper-video"></ul><ul id="helper-audio"></ul>';
    title = '';
    var {aid, cid, __INITIAL_STATE__: {videoData, elecFullInfo, h1Title, epInfo}} = document.defaultView;
    if (aid && cid) {
        biliVideoTitle(videoData.title);
        biliVideoThumbnail(elecFullInfo.data.pic);
        biliVideoExtractor('x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
    }
    else {
        biliVideoTitle(h1Title);
        biliVideoThumbnail(epInfo.cover);
        biliVideoExtractor('pgc/player/web/playurl?ep_id=' + epInfo.id, 'result');
    }
});
var options = document.createElement('div');
options.id = 'helper-options';
options.innerHTML = '<p>自动宽屏</p><select id="autowide"><option value="0">关闭</option><option value="1">启用</option></select>\
<p>优先编码</p><select id="videocodec"><option value="0">H.264</option><option value="1">HEVC</option><option value="2">AV-1</option></select>';
options.querySelector('#autowide').value = autowide;
options.querySelector('#videocodec').value = videocodec;
options.addEventListener('change', event => {
    localStorage[event.target.id] = event.target.value;
});
var analyse = document.createElement('div');
analyse.id = 'helper-analyse';
menu.append(options, analyse, css);
options.style.display = analyse.style.display = 'none';

setTimeout(() => {
    var toolbar = document.querySelector('#arc_toolbar_report') ?? document.querySelector('#toolbar_module');
    toolbar.append(menu, css);
    document.defaultView.cid ? biliVideoAutoWide('div.bilibili-player-video-btn-widescreen', 'closed') : biliVideoAutoWide('div.squirtle-video-widescreen', 'active');
}, 1500);

function biliVideoTitle(name) {
    var multi = document.querySelector('#multi_page li.on > a');
    title = (name + (multi ? multi.innerText : '')).replace(/[\/\\\?\|\<\>:"']/g, '');
}

function biliVideoAutoWide(wide, active) {
    setTimeout(() => {
        if (document.querySelector(wide).classList.contains(active) || autowide === '0' ) {
            return;
        }
        document.querySelector(wide).click();
    }, 2500);
}

function biliVideoThumbnail(url) {
    var menu = createMenuitem('视频封面', url, url.slice(url.lastIndexOf('.')));
    analyse.querySelector('#helper-thumb').appendChild(menu);
}

function biliVideoExtractor(param, key) {
    fetch('https://api.bilibili.com/' + param + '&fourk=1&fnval=2000', {credentials: 'include'}).then(response => response.json()).then(json => {
        json[key].dash.video.forEach(({id, mimeType, codecs, baseUrl}) => {
            var codec = codecs.slice(0, codecs.indexOf('.'));
            if (codec === 'avc1' && videocodec !== '0' || codec === 'hev1' && videocodec !== '1') {
                return;
            }
            var {label, ext} = format[id];
            var item = createMenuitem(label, baseUrl, '.' + codec + ext, codec);
            analyse.querySelector('#helper-video').appendChild(item);
        });
        json[key].dash.audio.forEach(({id, mimeType, codecs, baseUrl}) => {
            var codec = codecs.slice(0, codecs.indexOf('.'));
            var {label, ext} = format[id];
            var item = createMenuitem(label, baseUrl, '.' + codec + ext, codec);
            analyse.querySelector('#helper-audio').appendChild(item);
        })
    });
}

function createMenuitem(label, url, ext, codec) {
    var li = document.createElement('li');
    var tip = codec === undefined ? '' : format[codec] ? format[codec] : '未知编码: ' + codec;
    li.innerHTML = '<a href="' + url + '" class="helper-button" target="_blank" download="' + title + '" title="' + tip + '">' + label + '</a>';
    return li;
}
