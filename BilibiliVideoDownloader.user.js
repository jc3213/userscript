// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         2.19
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
var menu = document.createElement('div');
menu.id = 'download-box';
var thumb = document.createElement('div');
var video = document.createElement('div');
var audio = document.createElement('div');
menu.append(thumb, video, audio);

var css = document.createElement('style');
css.innerHTML = '#download-box > * {position: relative; display: inline-block; margin: -5px 1px 5px; height: 38px; overflow-y: hidden; vertical-align: top;}\
#download-box > *:hover {height: max-content; z-index: 999999;}\
#download-box a {background-color: #c26; color: #fff; display: block; margin-top: 1px; font-size: 16px; height: 16px; line-height: 16px; padding: 10px; text-align: center;}\
#download-box a:hover {background-color: #26c;}';

setTimeout(() => {
    var player = document.querySelector('video') ?? document.querySelector('bwp-video');
    var toolbar = document.querySelector('#arc_toolbar_report') ?? document.querySelector('#toolbar_module');
    player.addEventListener('progress', () => {
        if (title === '') {
            var {aid, cid, __INITIAL_STATE__: {videoData, elecFullInfo, h1Title, epInfo}} = document.defaultView;
            if (aid && cid) {
                biliVideoTitle(videoData.title);
                biliVideoThumbnail(elecFullInfo.data.pic);
                biliVideoExtractor('x/player/playurl?avid=' + aid + '&cid=' + cid, 'data');
                biliVideoAutoWide('div.bilibili-player-video-btn-widescreen', 'closed');
                menu.style.cssText = 'position: relative; top: 5px;';
            }
            else {
                biliVideoTitle(h1Title);
                biliVideoThumbnail(epInfo.cover);
                biliVideoExtractor('pgc/player/web/playurl?ep_id=' + epInfo.id, 'result');
                biliVideoAutoWide('div.squirtle-video-widescreen', 'active');
            }
        }
    });
    player.addEventListener('loadstart', () => {
        thumb.innerHTML = video.innerHTML = audio.innerHTML = title = '';
    });
    toolbar.append(menu, css);
}, 1500);

function biliVideoTitle(name) {
    var multi = document.querySelector('#multi_page li.on > a');
    title = (name + (multi ? multi.innerText : '')).replace(/[\/\\\?\|\<\>:"']/g, '');
}

function biliVideoAutoWide(wide, active) {
    setTimeout(() => {
        if (!document.querySelector(wide).classList.contains(active)) { document.querySelector(wide).click(); }
    }, 1500);
}

function biliVideoThumbnail(url) {
    var menu = createMenuitem('视频封面', url, url.slice(url.lastIndexOf('.')));
    thumb.appendChild(menu);
}

function biliVideoExtractor(param, key) {
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
