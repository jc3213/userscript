// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.6.0
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@79d0357d9324e69e068abc1bb4a59efec6bc0539/ui/jsui.min.js#sha256-MIUOY/umNvxdEW+4JoqM0ko3x52PIHihYkUsaDuiudU=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @grant           GM_addStyle
// @grant           GM_getResourceURL
// @grant           GM_download
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
    var menuBox = 'div.video-toolbar-left';
    var wideBtn = 'div.bpx-player-ctrl-wide';
    var wideStat = 'bpx-state-entered';
    var nextBtn = 'div.bpx-player-ctrl-next';
    var prevBtn = 'div.bpx-player-ctrl-prev';
    var cssOffset = '';
}
else {
    menuBox = 'div.toolbar';
    wideBtn = 'div.squirtle-video-widescreen'
    wideStat = 'active';
    nextBtn = 'div.squirtle-video-next';
    prevBtn = 'div.squirtle-video-prev';
    cssOffset = `.jsui-video-menu {left: 20px; top: -6px;}`;
}

var jsUI = new JSUI();

jsUI.css.add(`.jsui-video-menu {position: relative; width: 240px;}
.jsui-drop-menu, .jsui-options {width: 120px;}
.jsui-analyse {display: flex;}
.jsui-menu-item {background-color: #c26; color: #fff; font-size: 16px;}
.jsui-options, .jsui-analyse {position: absolute; z-index: 9999; border: 1px solid #000; padding: 5px; top: 48px; left: 0px; background-color: #fff;}
.jsui-options * {font-size: 16px; text-align: center; padding: 5px; width: 100%; margin: 0px;}
.jsui-options p, .jsui-options option:checked {color: #c26; font-weight: bold;}
${cssOffset}`);

var menu = jsUI.menu().class('jsui-video-menu');
menu.add('设置').onclick(openOptions);
menu.add('解析').onclick(analyseVideo);

function openOptions() {
    analyse_win.hide();
    options_win.switch();
}
async function analyseVideo() {
    options_win.hide();
    analyse_win.switch();
    if (worker || videocodec !== localStorage.videocodec) {
        worker = false;
        videocodec = localStorage.videocodec;
        analyse_win.empty();
        if (bvplayer) {
            var {title, pic, aid, cid} = document.defaultView.__INITIAL_STATE__.videoData;
            await biliVideoExtractor(title, pic, 'x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
        }
        else {
            var {name, thumbnailUrl} = JSON.parse(document.head.querySelector('script[type]').innerText).itemListElement[0];
            var id = document.body.querySelector('li.squirtle-pagelist-select-item.active').getAttribute('data-value');
            await biliVideoExtractor(name, thumbnailUrl[0], 'pgc/player/web/playurl?ep_id=' + id, 'result');
        }
    }
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

newNodeTimeoutObserver('div.bpx-player-video-wrap > :first-child').then(video => {
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
});

new MutationObserver(mutations => {
    if (watch !== location.pathname) {
        watch = location.pathname;
        worker = true;
        options_win.hide();
        analyse_win.hide();
    }
}).observe(document.head, {childList: true});

var options_win = jsUI.new().class('jsui-options').onchange(optionChange).hide().parent(menu);
var wide_opt = jsUI.new('select').html('<option value="0">关闭</option><option value="1">启用</option>');
var code_opt = jsUI.new('select').html('<option value="0">H.264</option><option value="1">HEVC</option><option value="2">AV-1</option>');
wide_opt.value = autowide;
code_opt.value = videocodec;
options_win.append(jsUI.new('p').text('自动宽屏'), wide_opt, jsUI.new('p').text('编码格式'), code_opt);

var analyse_win = jsUI.new().class('jsui-analyse').hide().parent(menu);

function optionChange(event) {
    var {id, value} = event.target;
    localStorage[id] = value;
}

async function biliVideoExtractor(name, image, playurl, key) {
    var multi = document.querySelector('#multi_page li.on > a');
    name = multi ? name + '-' + multi.innerText : name;
    title = name.replace(/[\/\\\?\|\<\>:"'\r\n]/g, '_');
    var response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', {credentials: 'include'});
    var json = await response.json();
    var menu = {avc1: jsUI.menu(true), hev1: jsUI.menu(true), av01: jsUI.menu(true), mp4a: jsUI.menu(true)};
    var {video, audio} = json[key].dash;
    [...video, ...audio].forEach(({id, codecs, baseUrl}) => {
        var codec = codecs.slice(0, codecs.indexOf('.'));
        var {text, ext} = format[id];
        var {title, alt} = format[codec];
        menu[codec].add(text).attr('title', title).onclick(event => downloadBiliVideo(event, baseUrl, alt + ext));
    });
    var thumb = getThumbnail(image);
    analyse_win.append(thumb, videocodec === '2' ? menu.av01.length !== 0 ? menu.av01 : menu.hev1.length !== 0 ? menu.hev1 : menu.avc1 : videocodec === '1' && menu.hev1.length !== 0 ? menu.hev1 : menu.avc1, menu.mp4a);
}

function getThumbnail(url) {
    var thumb = jsUI.menu(true);
    var fixed = url.replace(/^(https?:)?\/\//, 'https://');
    var ext = url.slice(url.lastIndexOf('.'));
    thumb.add('视频封面').onclick(event => downloadBiliVideo(event, fixed, ext));
    return thumb;
}

function downloadBiliVideo({altKey}, url, ext) {
    if (altKey) {
        postMessage({ aria2c, download: {url, options: {out: title + ext, referer: location.href }} });
    }
    else {
        GM_download(url, title + ext);
    }
}
