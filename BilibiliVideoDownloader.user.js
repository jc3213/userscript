// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.1
// @description     Download videos that you are watching from Bilibili (No Bangumi Support)
// @description:zh  从哔哩哔哩下载你正在收看的视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

var title = document.title.match(/^[^_]+/)[0];
var extract = true;
var format = {
    '30280': {x: '192K.aac', r: '音频 高码率'},
    '30232': {x: '128K.aac', r: '音频 中码率'},
    '30216': {x: '64K.aac', r: '音频 低码率'},
    '120': {x: '4K-UHD.mp4', r: '4K 超清'},
    '116': {x: '1080HQ.mp4', r: '1080P 60帧'},
    '112': {x: '1080HBr.mp4', r: '1080P 高码率'},
    '80': {x: '1080.mp4', r: '1080P 高清'},
    '74': {x: '720HQ.mp4', r: '720P 60帧'},
    '64': {x: '720.mp4', r: '720P 高清'},
    '32': {x: '480.mp4', r: '480P 清晰'},
    '16': {x: '360.mp4', r: '360P 流畅'},
    '15': {x: '360LQ.mp4', r: '360P 流畅'},
};
var mybox = document.createElement('div');
var thumb = document.createElement('div');
var video = document.createElement('div');
var audio = document.createElement('div');
mybox.className = 'mybox';
mybox.appendChild(thumb);
mybox.appendChild(video);
mybox.appendChild(audio);

var css = document.createElement('style');
css.innerHTML = '.mybox {margin-left: 5px; position: relative; z-index: 999999; top: -5px;}\
.mybox > div {margin-left: 3px; display: inline-block; overflow-y: hidden; vertical-align: top; height: 38px;}\
.mybox > div:hover {height: max-content;}\
.mybox > div > a {background-color: #c26; color: #fff; height: 16px; line-height: 16px; padding: 10px; display: block; margin-top: 1px;}';

document.addEventListener('DOMNodeInserted', (event) => {
    if (event.target.tagName === 'VIDEO') {
        biliVideoExtractor(event.target);
    }
});
biliVideoExtractor(document.querySelector('video'));

function biliVideoExtractor(player) {
    if (player) {
        player.addEventListener('play', () => {
            var toolbar = document.querySelector('#toolbar_module') || document.querySelector('#arc_toolbar_report');
            toolbar.appendChild(mybox);
            toolbar.appendChild(css);
            if (extract) {
                extract = false;
                thumb.appendChild(createMenuitem('下载封面', document.head.innerHTML.match(/"thumbnailUrl"[^"]+"([^"]+)"/)[1], title + '.jpg'));
                dashPlayer.state.mpd.video.forEach(meta => video.appendChild(getMediaInfo(meta)));
                dashPlayer.state.mpd.audio.forEach(meta => audio.appendChild(getMediaInfo(meta)));
            }
        });
        player.addEventListener('loadstart', () => {
            extract = true;
            thumb.innerHTML = '';
            video.innerHTML = '';
            audio.innerHTML = '';
            title = document.title.match(/^[^_]+/)[0];
        });
    }
}

function getMediaInfo(meta) {
    var type = format[meta.id];
    return createMenuitem(type.r, meta.baseUrl, title + type.x);
}

function createMenuitem(label, url, filename) {
    var item = document.createElement('a');
    item.href = url;
    item.target = '_self';
    item.innerText = label;
    item.download = filename;
    item.addEventListener('click', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({url: item.href, filename: item.download}) + '\n' + location.href);
        }
    });
    return item;
}
