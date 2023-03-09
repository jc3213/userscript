// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.5.0
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @require         https://raw.githubusercontent.com/jc3213/jslib/bbc7806672da9af7e023ebc3a25194e95c23bd5c/js/jsui.js#sha256-DXIy14gcMq8OGDH4F858fuvoSqNJCFozz1mqVW4j30I=
// @grant           GM_webRequest
// @grant           GM_download
// @webRequest      {"selector": "*://s1.hdslb.com/bfs/static/jinkela/long/js/sentry/*", "action": "cancel"}
// @run-at          document-idle
// ==/UserScript==

var {autowide = '0', videocodec = '0'} = localStorage;
var watch = location.pathname;
var worker = true;
var title;
var aria2c = 'Download With Aria2';
var bvplayer = watch.startsWith('/video/');
var format = {
    '30280': {text: '音频 高码率', ext: '.192k.m4a'},
    '30232': {text: '音频 中码率', ext: '.128k.m4a'},
    '30216': {text: '音频 低码率', ext: '.64k.m4a'},
    '127': {text: '8K 超高清', ext: '.8k.mp4'},
    '120': {text: '4K 超清', ext: '.4k.mp4'},
    '116': {text: '1080P 60帧', ext: '.1080f60.mp4'},
    '112': {text: '1080P 高码率', ext: '.1080hbr.mp4'},
    '80': {text: '1080P 高清', ext: '.1080.mp4'},
    '74': {text: '720P 60帧', ext: '.720f60.mp4'},
    '64': {text: '720P 高清', ext: '.720.mp4'},
    '32': {text: '480P 清晰', ext: '.480.mp4'},
    '16': {text: '360P 流畅', ext: '.360.mp4'},
    '15': {text: '360P 流畅', ext: '.360lq.mp4'},
    'avc1': {title: '视频编码: H.264', alt: '.h264'},
    'hev1': {title: '视频编码: HEVC', alt: '.h265'},
    'av01': {title: '视频编码：AV1', alt: '.av1'},
    'mp4a': {title: '音频编码: AAC', alt: '.aac'}
};

if (bvplayer) {
    var menuBox = '#arc_toolbar_report';
    var wideBtn = 'div.bpx-player-ctrl-wide';
    var wideStat = 'bpx-state-entered';
    var nextBtn = 'div.bpx-player-ctrl-next';
    var prevBtn = 'div.bpx-player-ctrl-prev';
    var cssOffset = '.jsui-main-menu {top: -6px;}';
}
else {
    menuBox = 'div.toolbar_toolbar__NJCNy';
    wideBtn = 'div.squirtle-video-widescreen'
    wideStat = 'active';
    nextBtn = 'div.squirtle-video-next';
    prevBtn = 'div.squirtle-video-prev';
    cssOffset = `.jsui-main-menu {left: 20px;}
    .jsui-menu-item {padding: 10px}`;
}

var jsUI = new JSUI();
jsUI.css.innerText += `.jsui-main-menu {position: relative; width: 160px; display: inline-block; width: 220px;}
.jsui-main-menu > .jsui-menu-item {display: inline-block; width: 100px;}
.jsui-drop-menu {width: 150px;}
.jsui-analyse {display: flex;}
.jsui-options {width: 150px;}
.jsui-menu-item {background-color: #c26; color: #fff; font-size: 16px;}
.jsui-options, .jsui-analyse {position: absolute; z-index: 9999; border: 1px solid #000; padding: 5px; top: 48px; left: 0px; background-color: #fff;}
.jsui-options * {font-size: 16px; text-align: center; padding: 5px; width: 100%;}
.jsui-options p, .jsui-options option:checked {color: #c26; font-weight: bold;}
${cssOffset}`;

var menu = jsUI.menulist([
    {text: '设置', onclick: openOptions},
    {text: '解析', onclick: analyseVideo}
]);
menu.className = 'jsui-main-menu';
function openOptions() {
    analyse.style.display = 'none';
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
}
async function analyseVideo() {
    if (worker || videocodec !== localStorage.videocodec) {
        worker = false;
        videocodec = localStorage.videocodec;
        analyse.innerHTML = '';
        if (bvplayer) {
            var {title, pic, aid, cid} = document.defaultView.__INITIAL_STATE__.videoData;
            await biliVideoExtractor(title, pic, 'x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
        }
        else {
            var {name, thumbnailUrl} = JSON.parse(document.head.querySelector('script[type]').innerText).itemListElement[0];
            var id = document.body.querySelector('li.squirtle-pagelist-select-item.active').getAttribute('data-value');
            console.log(id);
            await biliVideoExtractor(name, thumbnailUrl[0], 'pgc/player/web/playurl?ep_id=' + id, 'result');
        }
    }
    options.style.display = 'none';
    analyse.style.display = analyse.style.display === 'none' ? 'flex' : 'none';
}

document.addEventListener('keydown', event => {
    if (event.ctrlKey) {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            document.querySelector(nextBtn).click();
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            document.querySelector(prevBtn).click();
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

var analyse = jsUI.add({style: 'jsui-analyse'});
menu.append(options, analyse);

options.style.display = analyse.style.display = 'none';

var observer = setInterval(() => {
    var video = document.querySelector('div.bpx-player-video-wrap > :first-child');
    if (video) {
        clearInterval(observer);
        video.addEventListener('play', function biliVideoToolbar() {
            setTimeout(() => {
                document.querySelector(menuBox).append(menu);
                var wide = document.querySelector(wideBtn);
                if (!wide.classList.contains(wideStat) && autowide === '1' ) {
                    wide.click();
                }
            }, 500);
            video.removeEventListener('play', biliVideoToolbar);
        });
    }
}, 200);
new MutationObserver(mutations => {
    if (watch !== location.pathname) {
        watch = location.pathname;
        worker = true;
        options.style.display = analyse.style.display = 'none';
    }
}).observe(document.head, {childList: true, subtree: true});

async function biliVideoExtractor(name, image, playurl, key) {
    var multi = document.querySelector('#multi_page li.on > a');
    name = multi ? name + '-' + multi.innerText : name;
    title = name.replace(/[\/\\\?\|\<\>:"'\r\n]/g, '_');
    var fixed = image.replace(/^(https?:)?\/\//, 'https://');
    var thumb = jsUI.menulist([
        {text: '视频封面', onclick: event => downloadBiliVideo(event, fixed, image.slice(image.lastIndexOf('.')))}
    ], true);
    var response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
    var json = await response.json();
    menu = {avc1: [], hev1: [], av01: [], mp4a: []};
    var {video, audio} = json[key].dash;
    [...video, ...audio].forEach(({id, codecs, baseUrl}) => {
        var codec = codecs.slice(0, codecs.indexOf('.'));
        var {text, ext} = format[id];
        var {title, alt} = format[codec];
        menu[codec].push({text, onclick: event => downloadBiliVideo(event, baseUrl, alt + ext), attr: [{name: 'title', value: title}]});
    });
    var vid = videocodec === '2' ? menu.av01.length !== 0 ? menu.av01 : menu.hev1.length !== 0 ? menu.hev1 : menu.avc1 : videocodec === '1' && menu.hev1.length !== 0 ? menu.hev1 : menu.avc1;
    video = jsUI.menulist(vid, true);
    audio = jsUI.menulist(menu.mp4a, true);
    analyse.append(thumb, video, audio);
}

function downloadBiliVideo({altKey}, url, ext) {
    if (altKey) {
        postMessage({ aria2c, download: {url, options: {out: title + ext, referer: location.href }} });
    }
    else {
        GM_download(url, title + ext);
    }
}
