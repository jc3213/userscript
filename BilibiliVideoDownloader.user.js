// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         2.2
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @require         https://raw.githubusercontent.com/jc3213/userscript/main/libs/ob5erver2.js
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
var worker = location.pathname.startsWith('/video/') ? {
    title: {root: 'videoData', name: 'title'},
    thumb: {root: 'videoData', name: 'pic'},
    play: {param: ['x/player/playurl?cid=', {root: 'videoData', name: 'cid'}, '&avid=', {root: 'videoData', name: 'aid'}], key: 'data'},
    override: {selector: ['#arc_toolbar_report', 'div.bilibili-player-video-web-fullscreen', 'div.bilibili-player-video-btn-widescreen'], active: 'closed'}
} : {
    title: {name: 'h1Title'},
    thumb: {root: 'epInfo', name: 'cover'},
    play: {param: ['pgc/player/web/playurl?ep_id=', {root: 'epInfo', name: 'id'}], key: 'result'},
    override: {selector: ['#toolbar_module', 'div.squirtle-video-pagefullscreen', 'div.squirtle-video-widescreen'], active: 'active'}
};
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

biliVideoUIWrapper(worker.override);

function biliVideoBreakPoint(player) {
    player.autoplay = 'true';
    player.addEventListener('playing', () => {
        if (extract) {
            extract = false;
            biliVideoUIWrapper(worker.override);
            biliVideoTitle(__INITIAL_STATE__, worker.title);
            biliVideoThumbnail(__INITIAL_STATE__, worker.thumb);
            biliVideoExtractor(__INITIAL_STATE__, worker.play);
        }
    });
    player.addEventListener('loadstart', () => {
        extract = true;
        thumb.innerHTML = '';
        video.innerHTML = '';
        audio.innerHTML = '';
    });
}

function biliVideoUIWrapper({selector, active}) {
    __ob5erver2.node(['video', ...selector], (player, toolbar, full, wide) => {
        biliVideoBreakPoint(player);
        toolbar.appendChild(mybox);
        toolbar.appendChild(css);
        full.addEventListener('click', () => { mybox.style.display = full.classList.contains(active) ? 'none' : 'block'; });
        wide.addEventListener('click', () => { mybox.style.display = 'block'; });
        if (!wide.classList.contains(active)) { wide.click(); }
    });
}

function biliVideoTitle(state, {root, name}) {
    var title = root ? state[root][name] : state[name];
    mybox.title = title.replace(/[\/\\\?\|\<\>:"']/g, '');
    __ob5erver2.node('#multi_page li.on', watch => { mybox.title += ' - ' + watch.childNodes[0].title; });
}

function biliVideoThumbnail(state, {root, name}) {
    var url = state[root][name];
    var menu = createMenuitem('视频封面', url, url.slice(url.lastIndexOf('.')));
    thumb.appendChild(menu);
}

function biliVideoExtractor(state, {param, key}) {
    var url = 'https://api.bilibili.com/' + param.map(arg => typeof arg === 'object' ? state[arg.root][arg.name] : arg).join('') + '&fourk=1&fnval=80';
    fetch(url, {credentials: 'include'}).then(response => response.json()).then(json => {
        [...json[key].dash.video, ...json[key].dash.audio].forEach(meta => {
            var menu = meta.mimeType.startsWith('video') ? video : audio;
            var {label, ext} = format[meta.id];
            var codec = meta.codecs.slice(0, meta.codecs.indexOf('.'));
            var item = createMenuitem(label, meta.baseUrl, '.' + codec + ext, codec);
            menu.appendChild(item);
        });
    })
}

function createMenuitem(label, url, ext, codec) {
    var item = document.createElement('a');
    item.href = url;
    item.title = codec === undefined ? '' : format[codec] ? format[codec] : '未知编码: ' + codec;
    item.target = '_self';
    item.innerText = label;
    item.addEventListener('mouseenter', function mouseOver() {
        item.download = mybox.title + ext;
        item.removeEventListener('mouseenter', mouseOver);
    });
    item.addEventListener('click', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({url: item.href, filename: item.download, referer: location.href}));
        }
    });
    return item;
}
