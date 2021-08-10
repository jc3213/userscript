// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.19
// @description     Download videos that you are watching from Bilibili (No Bangumi Support)
// @description:zh  从哔哩哔哩下载你正在收看的视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

var format = {
    '30280': {label: '音频 高码率', ext: '.192k.aac'},
    '30232': {label: '音频 中码率', ext: '.128k.aac'},
    '30216': {label: '音频 低码率', ext: '.64k.aac'},
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
var state = location.pathname.startsWith('/video/') ? {
    title: {root: 'videoData', name: 'title'},
    thumb: {root: 'videoData', name: 'pic'},
    play: {param: ['x/player/playurl?cid=', {root: 'videoData', name: 'cid'}, '&avid=', {root: 'videoData', name: 'aid'}], key: 'data'},
    toolbar: '#arc_toolbar_report',
    override: {full: 'div.bilibili-player-video-web-fullscreen', wide: 'div.bilibili-player-video-btn-widescreen', active: 'closed'}
} : {
    title: {name: 'h1Title'},
    thumb: {root: 'epInfo', name: 'cover'},
    play: {param: ['pgc/player/web/playurl?ep_id=', {root: 'epInfo', name: 'id'}], key: 'result'},
    toolbar: '#toolbar_module',
    override: {full: 'div.squirtle-video-pagefullscreen', wide: 'div.squirtle-video-widescreen', active: 'active'}
};
var title;
var player;
var extract = true;
var mybox = document.createElement('div')
var thumb = document.createElement('div');
var video = document.createElement('div');
var audio = document.createElement('div');
mybox.appendChild(thumb);
mybox.appendChild(video);
mybox.appendChild(audio);
mybox.className = 'mybox';

var css = document.createElement('style');
css.innerHTML = '.mybox {position: relative; top: -5px; left: 10px; height: 0px; z-index: 99999999;}\
.mybox > div {display: inline-block; margin-left: 3px; vertical-align: top; height: 38px; overflow-y: hidden;}\
.mybox > div:hover {height: max-content;}\
.mybox > div > a {background-color: #c26; color: #fff; display: block; margin-top: 1px; height: 16px; line-height: 16px; padding: 10px; text-align: center;}\
.mybox > div > a:hover {background-color: #26c;}';

biliVideoUIWrapper();

function biliVideoBreakPoint() {
    player.autoplay = 'true';
    player.addEventListener('playing', () => {
        if (extract) {
            extract = false;
            title = state.title.root ? __INITIAL_STATE__[state.title.root][state.title.name] : __INITIAL_STATE__[state.title.name];
            title = title.replace(/[\/\\\?\|\<\>:"']/g, '');
            biliVideoThumbnail(__INITIAL_STATE__[state.thumb.root][state.thumb.name]);
            biliVideoExtractor(state.play.param.map(arg => typeof arg === 'object' ? __INITIAL_STATE__[arg.root][arg.name] : arg).join(''), state.play.key);
        }
    });
    player.addEventListener('loadstart', () => {
        thumb.innerHTML = '';
        video.innerHTML = '';
        audio.innerHTML = '';
        biliVideoUIWrapper();
    });
}

function biliVideoUIWrapper() {
    var observer = setInterval(() => {
        var toolbar = document.querySelector(state.toolbar);
        var full_btn = document.querySelector(state.override.full);
        var wide_btn = document.querySelector(state.override.wide);
        player = document.querySelector('video');
        extract = true;
        if (player) { biliVideoBreakPoint(); }
        if (toolbar_pane && full_btn && wide_btn) {
            clearInterval(observer);
            toolbar_pane.appendChild(mybox);
            toolbar_pane.appendChild(css);
            full_btn.addEventListener('click', () => { mybox.style.display = full_btn.classList.contains(state.override.active) ? 'none' : 'block'; });
            wide_btn.addEventListener('click', () => { mybox.style.display = 'block'; });
            if (!wide_btn.classList.contains(state.override.active)) { wide_btn.click(); }
        }
    }, 500);
}

function biliVideoThumbnail(url) {
    var menu = createMenuitem('视频封面', url, title + url.slice(url.lastIndexOf('.')));
    thumb.appendChild(menu);
}

function biliVideoExtractor(param, key) {
    fetch('https://api.bilibili.com/' + param + '&fnval=80', {credentials: 'include'}).then(response => response.json()).then(json => {
        [...json[key].dash.video, ...json[key].dash.audio].forEach(meta => {
            var menu = meta.mimeType.startsWith('video') ? video : audio;
            var {label, ext} = format[meta.id];
            var codec = meta.codecs.slice(0, meta.codecs.indexOf('.'));
            var item = createMenuitem(label, meta.baseUrl, title + '.' + codec + ext, codec);
            menu.appendChild(item);
        });
    })
}

function createMenuitem(label, url, filename, codec) {
    var item = document.createElement('a');
    item.href = url;
    item.title = codec === undefined ? '' : format[codec] ? format[codec] : '未知编码: ' + codec;
    item.target = '_self';
    item.innerText = label;
    item.download = filename;
    item.addEventListener('click', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({url: item.href, filename: item.download, referer: location.href}));
        }
    });
    return item;
}
