// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.4.2
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @require         https://raw.githubusercontent.com/jc3213/jslib/7d4380aa6dfc2fcc830791497fb3dc959cf3e49d/ui/menu.js#sha256-/1vgY/GegKrXhrdVf0ttWNavDrD5WyqgbAMMt7MK4SM=
// @run-at          document-end
// ==/UserScript==

var {autowide = '0', videocodec = '0'} = localStorage;
var [toolbar, widescreen, widestate, next, prev, offset] = location.pathname.startsWith('/video/') ?
    ['#arc_toolbar_report', 'div.bpx-player-ctrl-wide', 'bpx-state-entered', 'div.bpx-player-ctrl-next', 'div.bpx-player-ctrl-prev', 'top: -6px; left: -60px;'] :
    ['#toolbar_module', 'div.squirtle-video-widescreen', 'active', 'div.squirtle-video-next', '', 'left: 20px;'];
var watching;
var title;
var worker;
var jsMenu = new FlexMenu();
var format = {
    '30280': {text: '音频 高码率', ext: '.192k.aac'},
    '30232': {text: '音频 中码率', ext: '.128k.aac'},
    '30216': {text: '音频 低码率', ext: '.64k.aac'},
    '127': {text: '8K 超高清', ext: '.8K-UHD.mp4'},
    '120': {text: '4K 超清', ext: '.4K-UHD.mp4'},
    '116': {text: '1080P 60帧', ext: '.1080HQ.mp4'},
    '112': {text: '1080P 高码率', ext: '.1080Hbr.mp4'},
    '80': {text: '1080P 高清', ext: '.1080.mp4'},
    '74': {text: '720P 60帧', ext: '.720HQ.mp4'},
    '64': {text: '720P 高清', ext: '.720.mp4'},
    '32': {text: '480P 清晰', ext: '.480.mp4'},
    '16': {text: '360P 流畅', ext: '.360.mp4'},
    '15': {text: '360P 流畅', ext: '.360LQ.mp4'},
    'avc1': '视频编码: H.264',
    'hev1': '视频编码: HEVC',
    'av01': '视频编码：AV1',
    'mp4a': '音频编码: AAC'
};

var css = document.createElement('style');
css.innerHTML = '.jsui-menu-item {background-color: #c26; color: #fff; font-size: 16px;}\
.jsui-drop-menu {flex: 1;}\
.jsui-analyse {display: flex; width: 400px;}\
.jsui-options {width: 150px;}\
.jsui-options, .jsui-analyse {position: absolute; border: 1px solid #000; padding: 5px; top: 48px; left: 0px; background-color: #fff;}\
.jsui-options * {font-size: 16px; text-align: center; padding: 5px; width: 100%;}\
.jsui-options p, .jsui-options option:checked {color: #c26; font-weight: bold;}';

var menu = jsMenu.menu({
    items: [
        {text: '设置', onclick: openOptions},
        {text: '解析', onclick: analyseVideo}
    ]
});
menu.style.cssText = 'position: relative; z-index: 9999; width: 160px; ' + offset;
function openOptions() {
    analyse.style.display = 'none';
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
}
async function analyseVideo() {
    if (worker || videocodec !== localStorage.videocodec) {
        worker = false;
        videocodec = localStorage.videocodec;
        analyse.innerHTML = '';
        var {videoData, epInfo} = document.defaultView.__INITIAL_STATE__;
        var [title, thumb, playurl, key] = videoData ? [videoData.title, videoData.pic, 'x/player/playurl?avid=' + videoData.aid + '&cid=' + videoData.cid, 'data'] : [epInfo.share_copy, epInfo.cover, 'pgc/player/web/playurl?ep_id=' + epInfo.id, 'result'];
        biliVideoTitle(title);
        biliVideoThumbnail(thumb);
        await biliVideoExtractor(playurl, key);
    }
    options.style.display = 'none';
    analyse.style.display = analyse.style.display === 'none' ? 'flex' : 'none';
}

document.addEventListener('keydown', event => {
    if (event.ctrlKey) {
        if (event.key === 'ArrowRight') {
            document.querySelector(next).click();
        }
        if (event.key === 'ArrowLeft') {
            document.querySelector(prev).click();
        }
    }
});

var options = document.createElement('div');
options.className = 'jsui-options';
options.innerHTML = '<p>自动宽屏</p><select id="autowide"><option value="0">关闭</option><option value="1">启用</option></select>\
<p>优先编码</p><select id="videocodec"><option value="0">H.264</option><option value="1">HEVC</option><option value="2">AV-1</option></select>';
options.querySelector('#autowide').value = autowide;
options.querySelector('#videocodec').value = videocodec;
options.addEventListener('change', event => {
    var {id, value} = event.target;
    localStorage[id] = value;
});

var analyse = document.createElement('div');
analyse.className = 'jsui-analyse';
menu.append(options, analyse, css);

options.style.display = analyse.style.display = 'none';

var observer = setInterval(() => {
    var widebtn = document.querySelector(widescreen);
    if (widebtn) {
        clearInterval(observer);
        document.querySelector(toolbar).append(menu);
        if (!widebtn.classList.contains(widestate) && autowide === '1' ) {
            widebtn.click();
        }
    }
}, 200);
new MutationObserver(mutations => {
    if (watching !== location.pathname) {
        watching = location.pathname;
        worker = true;
        options.style.display = analyse.style.display = 'none';
    }
}).observe(document.head, {childList: true, subtree: true});

function biliVideoTitle(name) {
    var multi = document.querySelector('#multi_page li.on > a');
    name = multi ? name + multi.innerText : name;
    title = name.replace(/[\/\\\?\|\<\>:"']/g, '');
}

function biliVideoThumbnail(url) {
    var fixed = url.replace(/^(https?:)?\/\//, 'https://')
    var menu = jsMenu.menu({
        items: [
            {text: '视频封面', onclick: event => downloadBiliVideo(event, fixed, title + url.slice(url.lastIndexOf('.')))}
        ], dropdown: true
    });
    analyse.appendChild(menu);
}

async function biliVideoExtractor(playurl, key) {
    var response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
    var json = await response.json();
    menu = {avc1: [], hev1: [], av01: [], mp4a: []};
    var {video, audio} = json[key].dash;
    [...video, ...audio].forEach(({id, codecs, baseUrl}) => {
        var codec = codecs.slice(0, codecs.indexOf('.'));
        var {text, ext} = format[id];
        menu[codec].push({text, onclick: event => downloadBiliVideo(event, baseUrl, title + ext), attributes: [{name: 'title', value: format[codec]}]});
    });
    var items = videocodec === '2' ? menu.av01.length !== 0 ? menu.av01 : menu.hev1.length !== 0 ? menu.hev1 : menu.avc1 : videocodec === '1' && menu.hev1.length !== 0 ? menu.hev1 : menu.avc1;
    video = jsMenu.menu({items, dropdown: true});
    audio = jsMenu.menu({items: menu.mp4a, dropdown: true});
    analyse.append(video, audio);
}

function downloadBiliVideo(event, url, name) {
    if (event.ctrlKey) {
        var aria2 = JSON.stringify({url, options: {out: name, referer: location.href}});
        navigator.clipboard.writeText(aria2);
    }
    else {
        open(url, '_blank');
    }
}
