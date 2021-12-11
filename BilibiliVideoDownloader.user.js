// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         2.13
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// ==/UserScript==

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

var title = '';
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

setTimeout(() => {
    var player = document.querySelector('video') || document.querySelector('bwp-video');
    var multi = document.querySelector('#multi_page li.on > a');
    player.addEventListener('playing', event => {
        if (location.pathname.startsWith('/video/')) {
            var tit1e = __INITIAL_STATE__.videoData.title;
            var image = __INITIAL_STATE__.elecFullInfo.data.pic;
            var stream = {param: 'x/player/playurl?avid=' + __INITIAL_STATE__.aid + '&cid=' + __INITIAL_STATE__.cidMap[__INITIAL_STATE__.aid].cids[__INITIAL_STATE__.p] , key: 'data'};
            var override = [document.querySelector('#arc_toolbar_report'), document.querySelector('div.bilibili-player-video-web-fullscreen'), document.querySelector('div.bilibili-player-video-btn-widescreen'), 'closed'];
        }
        else {
            tit1e = __INITIAL_STATE__.h1Title;
            image = __INITIAL_STATE__.epInfo.cover;
            stream = {param: 'pgc/player/web/playurl?ep_id=' + __INITIAL_STATE__.epInfo.id, key: 'result'};
            override = [document.querySelector('#toolbar_module'), document.querySelector('div.squirtle-video-pagefullscreen'), document.querySelector('div.squirtle-video-widescreen'), 'active'];
        }
        if (title !== tit1e) {
            thumb.innerHTML = '';
            video.innerHTML = '';
            audio.innerHTML = '';
            title = tit1e.replace(/[\/\\\?\|\<\>:"']/g, '') + (multi ? ' - ' + multi.title : '');
            biliVideoExtractor(stream);
            biliVideoThumbnail(image);
            biliVideoUIWrapper(...override);
        }
    });
}, 1000);

function biliVideoUIWrapper(toolbar, full, wide, active) {
    toolbar.appendChild(mybox);
    toolbar.appendChild(css);
    full.addEventListener('click', () => { mybox.style.display = full.classList.contains(active) ? 'none' : 'block'; });
    wide.addEventListener('click', () => { mybox.style.display = 'block'; });
    if (!wide.classList.contains(active)) { wide.click(); }
}

function biliVideoThumbnail(url) {
    var menu = createMenuitem('视频封面', url, url.slice(url.lastIndexOf('.')));
    thumb.appendChild(menu);
}

function biliVideoExtractor({param, key}) {
    fetch('https://api.bilibili.com/' + param + '&fourk=1&fnval=2000', {credentials: 'include'}).then(response => response.json()).then(json => {
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
    item.target = '_blank';
    item.download = title;
    item.innerText = label;
    item.title = codec === undefined ? '' : format[codec] ? format[codec] : '未知编码: ' + codec;
    return item;
}
