// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         1.5
// @description     Download videos that you are watching from Bilibili (No Bangumi Support)
// @description:zh  从哔哩哔哩下载你正在收看的视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

var title = document.title.match(/^[^_]+/)[0];
var extract = true;
var format = {
    '30280': {x: '.192k.aac', r: '音频 高码率'},
    '30232': {x: '.128k.aac', r: '音频 中码率'},
    '30216': {x: '.64k.aac', r: '音频 低码率'},
    '120': {x: '.4K-UHD.mp4', r: '4K 超清'},
    '116': {x: '.1080HQ.mp4', r: '1080P 60帧'},
    '112': {x: '.1080Hbr.mp4', r: '1080P 高码率'},
    '80': {x: '.1080.mp4', r: '1080P 高清'},
    '74': {x: '.720HQ.mp4', r: '720P 60帧'},
    '64': {x: '.720.mp4', r: '720P 高清'},
    '32': {x: '.480.mp4', r: '480P 清晰'},
    '16': {x: '.360.mp4', r: '360P 流畅'},
    '15': {x: '.360LQ.mp4', r: '360P 流畅'},
};
var mybox = document.createElement('div')
var thumb = document.createElement('div');
var video = document.createElement('div');
var audio = document.createElement('div');
mybox.appendChild(thumb);
mybox.appendChild(video);
mybox.appendChild(audio);
mybox.className = 'mybox';

var css = document.createElement('style');
css.innerHTML = '.mybox {position: relative; top: -5px; left: 10px; z-index: 99999999;}\
.mybox > div {display: inline-block; margin-left: 3px; vertical-align: top; height: 38px; overflow-y: hidden;}\
.mybox > div:hover {height: max-content;}\
.mybox > div > a {background-color: #c26; color: #fff; display: block; margin-top: 1px; height: 16px; line-height: 16px; padding: 10px;}\
.mybox > div > a:hover {background-color: #26c;}';


new MutationObserver((list) => {
    list.forEach(mutation => {
        var newNode = mutation.addedNodes[0];
        if (newNode && newNode.tagName === 'VIDEO') {
            biliVideoExtractor(newNode);
        }
    });
}).observe(document, {childList: true, subtree: true});
biliVideoExtractor(document.querySelector('video'));

function biliVideoExtractor(player) {
    if (player) {
        player.addEventListener('play', () => {
            if (extract) {
                var toolbar = document.querySelector('#toolbar_module') || document.querySelector('#arc_toolbar_report');
                toolbar.appendChild(mybox);
                toolbar.appendChild(css);
                extract = false;
                title = document.title.match(/^[^_]+/)[0];
                document.querySelector('button[aria-label="网页全屏"]').addEventListener('click', () => {mybox.style.display = 'none';});
                document.querySelector('button[aria-label="退出网页全屏"]').addEventListener('click', () => {mybox.style.display = 'block';});
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
            navigator.clipboard.writeText(JSON.stringify({url: item.href, filename: item.download, referer: location.href}));
        }
    });
    return item;
}
