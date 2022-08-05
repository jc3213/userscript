// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         3.9
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

var {autowide = '0', videocodec = '0'} = localStorage;
var [widescreen, toolbar] = location.pathname.startsWith('/video/') ? ['div.bilibili-player-video-btn-widescreen', '#arc_toolbar_report'] : ['div.squirtle-video-widescreen', '#toolbar_module'];
var title;
var video;
var worker;
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
    'av01': '视频编码：AV1',
    'mp4a': '音频编码: AAC'
};

var css = document.createElement('style');
css.innerHTML = '#helper-main {position: relative; z-index: 9999; display: inline-block; user-select: none;}\
#helper-options, #helper-analyse {position: absolute; border: 1px solid #000; padding: 5px; top: 40px; left: 0px; background-color: #fff;}\
#helper-options {width: 115px;}\
#helper-options p, #helper-options select, .helper-button {font-size: 16px; text-align: center; padding: 5px;}\
#helper-options p, #helper-options option:checked {color: #c26; font-weight: bold;}\
#helper-options select {width: 100%;}\
#helper-analyse {width: 400px;}\
#helper-analyse ul {display: inline-block; margin-righ: 3px; vertical-align: top;}\
#helper-analyse a {display: inline-block; width: 100px;}\
.helper-button {background-color: #c26; color: #fff; height: 16px; line-height: 16px; padding: 10px 15px; display: inline-block; margin: 0px 3px 3px 0px; cursor: pointer;}\
.helper-button:hover {background-color: #26c;}';

var menu = document.createElement('div');
menu.id = 'helper-main';
menu.innerHTML = '<span id="options" class="helper-button">设置</span><span id="analyse" class="helper-button">解析</span>';
menu.querySelector('#options').addEventListener('click', event => {
    analyse.style.display = 'none';
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
});
menu.querySelector('#analyse').addEventListener('click', async event => {
    options.style.display = 'none';
    if (worker || videocodec !== localStorage.videocodec) {
        worker = false;
        videocodec = localStorage.videocodec;
        analyse.innerHTML = '<ul id="helper-thumb"></ul><ul id="helper-video"></ul><ul id="helper-audio"></ul>';
        var {aid, bvid, videoData, elecFullInfo, h1Title, epInfo} = document.defaultView.__INITIAL_STATE__;
        var [title, thumb, playurl, key] = bvid ? [videoData.title, elecFullInfo.pic, 'x/player/playurl?avid=' + videoData.aid + '&cid=' + videoData.cid, 'data'] : [h1Title, epInfo.cover, 'pgc/player/web/playurl?ep_id=' + epInfo.id, 'result'];
        biliVideoTitle(title);
        biliVideoThumbnail(thumb);
        await biliVideoExtractor(playurl, key);
    }
    analyse.style.display = analyse.style.display === 'none' ? 'block' : 'none';
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

new MutationObserver(mutations => {
    if (video !== location.pathname) {
        video = location.pathname;
        worker = true;
        options.style.display = analyse.style.display = 'none';
        biliVideoAutoWide();
    }
}).observe(document.head, {childList: true, subtree: true});

setTimeout(() => {
    var bar = document.querySelector(toolbar);
    bar.append(menu, css);
}, 2000);

function biliVideoTitle(name) {
    var multi = document.querySelector('#multi_page li.on > a');
    title = (name + (multi ? multi.innerText : '')).replace(/[\/\\\?\|\<\>:"']/g, '');
}

function biliVideoAutoWide() {
    var observer = setInterval(() => {
        var wide = document.querySelector(widescreen);
        if (wide) {
            clearInterval(observer);
            if (wide.classList.contains('closed') || wide.classList.contains('active') || autowide === '0' ) {
                return;
            }
            wide.click();
        }
    }, 500);
}

function biliVideoThumbnail(url) {
    var top = document.createElement('ul');
    var sub = createMenuitem('视频封面', url, url.slice(url.lastIndexOf('.')));
    top.append(sub);
    analyse.append(top);
}

async function biliVideoExtractor(param, key) {
    var menu = {av1: document.createElement('ul'), hevc: document.createElement('ul'), avc: document.createElement('ul'), aac: document.createElement('ul')};
    var response = await fetch('https://api.bilibili.com/' + param + '&fourk=1&fnval=4048', {credentials: 'include'});
    var {[key]: {dash: {video, audio}}} = await response.json();
    [...video, ...audio].forEach(({id, mimeType, codecs, baseUrl}) => {
        var codec = codecs.slice(0, codecs.indexOf('.'));
        var top = codec === 'avc1' ? menu.avc : codec === 'hev1' ? menu.hevc : codec === 'av01' ? menu.av1 : menu.aac;
        var {label, ext} = format[id];
        var sub = createMenuitem(label, baseUrl, '.' + codec + ext, codec);
        top.appendChild(sub);
    });
    var codec = videocodec === '2' && menu.av1.childNodes.length !== 0 ? menu.av1 : videocodec === '1' && menu.hevc.childNodes.length !== 0 ? menu.hevc : menu.avc;
    analyse.append(codec, menu.aac)
}

function createMenuitem(label, url, ext, codec) {
    var li = document.createElement('li');
    var tip = codec === undefined ? '' : format[codec] ? format[codec] : '未知编码: ' + codec;
    li.innerHTML = '<a href="' + url + '" class="helper-button" target="_blank" download="' + title + ext + '" title="' + tip + '">' + label + '</a>';
    li.addEventListener('click', event => navigator.clipboard.writeText(title));
    return li;
}
