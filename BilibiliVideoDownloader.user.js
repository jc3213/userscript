// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.7.5
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @match           *://www.bilibili.com/v/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@e7814b44512263b5e8125657aff4c1be5fe093a5/ui/jsui.min.js#sha256-mnAxgBFxrf9LCVUKhR2ikxUBvTY0/sFs9wjF3kDV9Mg=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@7cb4fb4348574f426417490c20e0ea7d8f0b3187/js/nodeobserver.js#sha256-v48u9yZlthnR8qPvz1AEnK7WLtQmn56wKT1qX76Ic+w=
// @grant           GM_download
// @run-at          document-idle
// ==/UserScript==

var {autowide = '0', videocodec = '0'} = localStorage;
var watch = location.pathname;
var worker = true;
var title;
var history = {};
var archive;
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

if (watch.startsWith('/video/')) {
    var bvplayer = true;
    var menuBox = 'div.video-toolbar-left';
    var wideBtn = 'div.bpx-player-ctrl-wide';
    var wideStat = 'bpx-state-entered';
    var current = 'ul.bpx-player-ctrl-eplist-menu > li.bpx-state-active';
    var offset = `.jsui-video-menu {position: relative;}`;
}
else if (watch.startsWith('/v/')) {
    archive = true;
    menuBox = 'div.select-type > ul.type';
    wideBtn = 'div.bilibili-player-video-btn-widescreen';
    wideStat = 'closed';
    current = 'div.select-type > ul.type > li.active';
    offset = `.jsui-video-menu {position: absolute;}`;
}
else {
    menuBox = 'div.toolbar[mr-show]';
    wideBtn = 'div.squirtle-video-widescreen'
    wideStat = 'active';
    current = 'li.squirtle-pagelist-select-item.active';
    offset = `.jsui-video-menu {position: relative;}`;
}

var jsUI = new JSUI();
var observer = new NodeObserver();

jsUI.css.add(`.jsui-video-menu {display: inline-block;}
.jsui-video-menu > .jsui-menu-item {display: inline-block; width: 100px;}
.jsui-options, .jsui-drop-menu {width: 140px;}
.jsui-analyse {display: flex;}
.jsui-menu-item {background-color: #c26; color: #fff; font-size: 16px; padding: 3px 5px !important;}
.jsui-options, .jsui-analyse {position: absolute; z-index: 99999999999; border: 1px solid #000; padding: 5px; top: 38px; left: 0px; background-color: #fff;}
.jsui-options * {font-size: 16px; text-align: center; padding: 5px; width: 100%; margin: 0px;}
.jsui-options p, .jsui-options option:checked {color: #c26; font-weight: bold;} ${offset}`);

var videoDL = jsUI.menu().class('jsui-video-menu');
videoDL.add('设置').onclick(openOptions);
videoDL.add('解析').onclick(analyseVideo);

function openOptions() {
    analyse_win.hide();
    options_win.switch();
}
async function analyseVideo() {
    if (worker || videocodec !== localStorage.videocodec) {
        worker = false;
        videocodec = localStorage.videocodec;
        analyse_win.body();
        if (bvplayer) {
            let {title, pic, aid, cid} = document.defaultView.__INITIAL_STATE__.videoData;
            biliVideoTitle(title);
            biliVideoThumb(pic);
            await biliVideoExtractor(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
        }
        else if (archive) {
            let {aid, cid} = document.defaultView;
            biliVideoTitle(document.querySelector('div.match-info-title').textContent);
            await biliVideoExtractor(cid, 'x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
        }
        else {
            let {name, thumbnailUrl} = JSON.parse(document.head.querySelector('script[type]').textContent).itemListElement[0];
            let id = document.querySelector(current).getAttribute('data-value');
            biliVideoTitle(name);
            biliVideoThumb(thumbnailUrl[0]);
            await biliVideoExtractor(id, `pgc/player/web/playurl?ep_id=${id}`, 'result');
        }
    }
    options_win.hide();
    analyse_win.switch();
}

document.addEventListener('keydown', (event) => {
    var {ctrlKey, key} = event;
    if (ctrlKey) {
        if (key === 'ArrowLeft') {
            event.preventDefault();
            observer.timeout(current, {timeout: 500}).then(playing => playing.previousElementSibling.click());
        }
        else if (key === 'ArrowRight') {
            event.preventDefault();
            observer.timeout(current, {timeout: 500}).then(playing => playing.nextElementSibling.click());
        }
    }
});

window.addEventListener('play', async function biliVideoToolbar() {
    var wide = await observer.timeout(wideBtn);
    var menu = await observer.timeout(menuBox);
    menu.append(videoDL);
    if (!wide.classList.contains(wideStat) && autowide === '1' ) {
        wide.click();
    }
    window.removeEventListener('play', biliVideoToolbar);
}, true);

new MutationObserver(mutations => {
    if (watch !== location.pathname) {
        watch = location.pathname;
        worker = true;
        options_win.hide();
        analyse_win.hide();
    }
}).observe(document.head, {childList: true});

var options_win = jsUI.new().class('jsui-options').onchange(optionChange).hide().parent(videoDL);
var wide_opt = jsUI.new('select').attr('id', 'autowide').body('<option value="0">关闭</option><option value="1">启用</option>');
var code_opt = jsUI.new('select').attr('id', 'videocodec').body('<option value="0">H.264</option><option value="1">HEVC</option><option value="2">AV-1</option>');
wide_opt.value = autowide;
code_opt.value = videocodec;
options_win.append(jsUI.new('p').body('自动宽屏'), wide_opt, jsUI.new('p').body('编码格式'), code_opt);

var analyse_win = jsUI.new().class('jsui-analyse').hide().parent(videoDL);

function optionChange(event) {
    var {id, value} = event.target;
    localStorage[id] = value;
}

function biliVideoTitle(name) {
    var multi = document.querySelector(current);
    name = multi ? `${name}-${multi.textContent}` : name;
    title = name.trim().replace(/[\/\\:*?"<>|\s\r\n]/g, '_');
}

function biliVideoThumb(url) {
    var thumb = jsUI.menu(true);
    var fixed = url.replace(/^(https?:)?\/\//, 'https://');
    var ext = url.slice(url.lastIndexOf('.'));
    thumb.add('视频封面').onclick(event => downloadBiliVideo(event, fixed, ext));
    analyse_win.append(thumb);
}

async function biliVideoExtractor(vid, playurl, key) {
    var {menu, stream} = history[vid] ?? {};
    if (!stream && !menu) {
        var response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
        var json = await response.json();
        menu = {avc1: jsUI.menu(true), hev1: jsUI.menu(true), av01: jsUI.menu(true), mp4a: jsUI.menu(true)};
        stream = {avc1: [], hev1: [], av01: [], mp4a: []};
        var {video, audio} = json[key].dash;
        [...video, ...audio].forEach(({id, codecs, baseUrl}) => {
            var codec = codecs.slice(0, codecs.indexOf('.'));
            var {text, ext} = format[id];
            var {title, alt} = format[codec];
            menu[codec].add(text).attr('title', title).onclick(event => downloadBiliVideo(event.altKey, baseUrl, alt + ext));
            stream[codec].push({url: baseUrl, name: alt + ext});
        });
        history[vid] = {menu, stream};
    }
    analyse_win.append(videocodec === '2' ? stream.av01.length !== 0 ? menu.av01 : stream.hev1.length !== 0 ? menu.hev1 : menu.avc1 : videocodec === '1' && stream.hev1.length !== 0 ? menu.hev1 : menu.avc1, menu.mp4a);
}

function downloadBiliVideo(altKey, url, ext) {
    if (altKey) {
        var urls = [{url, options: {out: title + ext, referer: location.href} }];
        window.postMessage({aria2c: 'aria2c-jsonrpc-call', params: {urls}});
    }
    else {
        GM_download({url, responseType: 'blob', headers: {referer: location.href}, name: title + ext});
    }
}
