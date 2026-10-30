// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         2.1.1
// @description     Download videos from Bilibili (No Bangumi)
// @description:zh  下载哔哩哔哩视频（不支持番剧）
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/v/*
// @match           https://www.bilibili.com/festival/*
// @grant           GM_download
// ==/UserScript==

let autowide = localStorage.getItem('autowide') || '1';
let videocodec = localStorage.getItem('videocodec') || 'bilivideo_vc265';

let bvWatch = location.href;
let bvTitle;
let bvOpen = true;

let bvHistory = {};

let bvFormat = {
    '30280': { text: '音频 高码率', ext: '.192k.m4a' },
    '30251': { text: '音频 Hi-Res', ext: '.hires.flac' },
    '30232': { text: '音频 中码率', ext: '.128k.m4a' },
    '30216': { text: '音频 低码率', ext: '.64k.m4a' },
    '127': { text: '8K 超高清', ext: '.8k.mp4' },
    '125': { text: '4K 超清+', ext: '.4khq.mp4' },
    '120': { text: '4K 超清', ext: '.4k.mp4' },
    '116': { text: '1080P 60帧', ext: '.1080f60.mp4' },
    '112': { text: '1080P 高码率', ext: '.1080hq.mp4' },
    '80': { text: '1080P 高清', ext: '.1080.mp4' },
    '74': { text: '720P 60帧', ext: '.720f60.mp4' },
    '64': { text: '720P 高清', ext: '.720.mp4' },
    '32': { text: '480P 清晰', ext: '.480.mp4' },
    '16': { text: '360P 流畅', ext: '.360.mp4' },
    '15': { text: '360P 流畅', ext: '.360lq.mp4' },
    'avc1': { title: '视频编码: H.264', alt: 'h264', type: 'video' },
    'hvc1': { title: '视频编码: HEVC 增强', alt: 'h265', type: 'video' },
    'hev1': { title: '视频编码: HEVC', alt: 'h265', type: 'video' },
    'av01': { title: '视频编码: AV1', alt: 'av1', type: 'video' },
    'mp4a': { title: '音频编码: AAC', alt: 'aac', type: 'audio' },
    'fLaC': { title: '音频编码: Hi-Res', alt: 'flac', type: 'audio' }
};

let bvCode = bvWatch.split('/')[3];
let bvMenu = {
    dash: 'result',
    offset: 'display: inline-block; top: -12px;',
    menu: 'div.toolbar > div.toolbar-left',
    widebtn: 'div.bpx-player-ctrl-wide',
    widestat: 'bpx-state-entered',
    fetch() {
        let url = document.querySelector('link[rel="canonical"]').href;
        let id = url.slice(url.indexOf('ep'));
        let name = document.getElementById('player-title').textContent;
        let thumb = document.querySelector('img.image_ogv_weslie_common_image__Rg7Xm').src;
        bVideoTitle(name);
        bVideoThumb(thumb);
        bVideoExtractor(id, 'pgc/player/web/playurl?ep_id=' + id.substring(2));
    }
};

if (bvCode === 'video') {
    bvMenu.menu = 'div.video-toolbar-left';
    bvMenu.offset = '10px';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let data = document.defaultView.__INITIAL_STATE__.videoData;
        let cid = data.cid || document.querySelector('li.bpx-state-multi-active-item')?.getAttribute('data-cid');
        bVideoTitle(data.title);
        bVideoThumb(data.pic);
        bVideoExtractor(cid, 'x/player/playurl?avid=' + data.aid + '&cid=' + cid);
    };
} else if (bvCode === 'v') {
    bvMenu.offset = 'left: -300px;';
    bvMenu.menu = 'div.select-type > ul.type';
    bvMenu.widebtn = 'div.bilibili-player-video-btn-widescreen';
    bvMenu.widestat = 'closed';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let window = document.defaultView;
        let cid = window.cid;
        bVideoTitle(document.querySelector('div.match-info-title').textContent);
        bVideoExtractor(cid, 'x/player/playurl?avid=' + window.aid + '&cid=' + cid);
    };
} else if (bvCode === 'festival') {
    bvMenu.offset = 'top: 86%; right: 0%;';
    bvMenu.menu = 'div.page-bg-logo';
    bvMenu.dash = 'data';
    bvMenu.fetch = () => {
        let active = document.querySelector('li.bpx-player-ctrl-eplist-menu-item.bpx-state-active');
        let info = document.defaultView.__INITIAL_STATE__.videoInfo;
        let name = info.title + '-' + active.textContent;
        let cid = info.cid || active.getAttribute('data-cid');
        bVideoTitle(info.title);
        bVideoThumb(info.pic);
        bVideoExtractor(cid, 'x/player/playurl?avid=' + info.aid + '&cid=' + cid);
    }
}

let menuItem = document.createElement('div');
menuItem.className = 'bilivideo_button';

let mainPane = document.createElement('div');
mainPane.id = 'bilivideo_main';
mainPane.innerHTML = `
<div id="bilivideo_menu">
    <div id="bilivideo_optbtn" class="bilivideo_button">设置</div>
    <div id="bilivideo_anabtn" class="bilivideo_button">解析</div>
</div>
<div id="bilivideo_options" class="bilivideo_pane bilivideo_hidden">
    <h4>自动宽屏</h4>
    <select name="autowide">
        <option value="0">关闭</option>
        <option value="1">启用</option>
    </select>
    <h4>编码格式</h4>
    <select name="videocodec">
        <option value="bilivideo_vc264">H.264</option>
        <option value="bilivideo_vc265">HEVC</option>
        <option value="bilivideo_vcav1">AV-1</option>
    </select>
</div>
<div id="bilivideo_analyse" class="bilivideo_pane bilivideo_result bilivideo_hidden"></div>
`;

let mainTree = mainPane.children;
let menuPane = mainTree[0];
let optionsPane = mainTree[1];
let analysePane = mainTree[2];

function bVideoTitle(name) {
    bvTitle = name.trim().replace(/[\/\\:*?"<>|\s\r\n]/g, '_');
}

function bVideoThumb(url) {
    if (!url) return;

    let thumb = menuItem.cloneNode(true);
    thumb.classList.add('bilivideo_thumb');
    thumb.textContent = '视频封面';
    thumb.url = url.replace(/^(https?:)?\/\//, 'https://').replace(/@.+/, '');
    thumb.file = bvTitle + thumb.url.slice(url.lastIndexOf('.'));

    analysePane.appendChild(thumb);
}

function bVideoMenuItem(media) {
    if (!media) return;

    let id = media.id;
    let url = media.baseUrl;

    let codec = media.codecs;
    let idx = codec.indexOf('.');

    if (idx !== -1) {
        codec = codec.substring(0, idx);
    }

    let label = bvFormat[id];
    let metainfo = bvFormat[codec];
    let name = bvTitle + label.ext;

    let menu = menuItem.cloneNode(true);
    menu.classList.add('bilivideo_' + metainfo.type, 'bilivideo_' + metainfo.alt);
    menu.textContent = label.text;
    menu.title = metainfo.title;
    menu.aria2 = { url, options: { out: name, referer: bvWatch } };
    menu.GMdl = { url, responseType: 'blob', headers: { referer: bvWatch }, name }
    analysePane.appendChild(menu);
}

async function bVideoExtractor(vid, playurl) {
    let menus = bvHistory[vid];

    if (bvOpen && menus) {
        analysePane.innerHTML = '';
        analysePane.append(...menus);
    } else {
        let response = await fetch('https://api.bilibili.com/' + playurl + '&fnval=4050', { credentials: 'include' });
        let json = await response.json();
        let metadata = json[bvMenu.dash].dash;

        if (!metadata) return;

        let video = metadata.video;
        let audio = metadata.audio;
        let hires = metadata.flac;

        if (video) {
            for (let i = 0, l = video.length; i < l; i++) {
                bVideoMenuItem(video[i]);
            }
        }

        if (audio) {
            for (let i = 0, l = audio.length; i < l; i++) {
                bVideoMenuItem(audio[i]);
            }
        }

        if (hires) {
            bVideoMenuItem(hires.audio);
        }

        bvHistory[vid] = Array.from(analysePane.children);
    }
}

menuPane.addEventListener('click', (event) => {
    let id = event.target.id;

    if (!id) return;

    if (id === 'bilivideo_optbtn') {
        optionsPane.classList.toggle('bilivideo_hidden');
        analysePane.classList.add('bilivideo_hidden');
        return;
    }

    if (id === 'bilivideo_anabtn') {
        optionsPane.classList.add('bilivideo_hidden');
        analysePane.classList.toggle('bilivideo_hidden');

        if (!bvOpen) return;

        analysePane.classList.add(videocodec);
        bvOpen = false;
        analysePane.innerHTML = '';
        bvMenu.fetch();
        return;
    }
});

optionsPane.addEventListener('change', (event) => {
    let entry = event.target;
    let name = entry.name;
    let value = entry.value;

    self[name] = localStorage[name] = value;

    if (name === 'autowide') {
        document.querySelector(bvMenu.widebtn).click();
    } else if (name === 'videocodec') {
        analysePane.classList.replace(videocodec, value);
    }
});

analysePane.addEventListener('click', (event) => {
    if (event.altKey) {
        window.postMessage({ aria2c: 'aria2c_download', params: [event.target.aria2] });
    } else {
        GM_download(event.target.GMdl);
    }
});

let optionsTree = optionsPane.children;;
let optionWide = optionsTree[1];
let optionCodec = optionsTree[3];

optionWide.value = autowide;
optionCodec.value = videocodec;

let cssPane = document.createElement('style');
cssPane.textContent = `
#bilivideo_main { font-size: 16px; position: relative; text-align: center; padding-right: 5px; line-height: 28px; z-index: 9999999; width: fit-content; ${bvMenu.offset ?? ''} }
#bilivideo_menu { display: flex; gap: 5px;}
.bilivideo_button { border: outset 1px #000; padding: 3px; background-color: #c26; color: #fff; cursor: pointer; width: 100px; }
.bilivideo_button:hover { filter: contrast(80%); }
.bilivideo_button:active { filter: contrast(60%); border-style: inset; }
.bilivideo_pane { position: absolute; top: 0px; left: 100%; background-color: #fff; border: solid 1px #000; padding: 5px; }
.bilivideo_pane > h4, .bilivideo_pane > select { width: 110px !important; padding: 5px; text-align: center; }
.bilivideo_pane > h4 { color: #c26; font-weight: bold; margin: auto; }
.bilivideo_pane > select { cursor: pointer; border: 1px solid #000; }
.bilivideo_result { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-flow: dense; gap: 5px; }
.bilivideo_thumb { grid-column: 1; }
.bilivideo_video { grid-column: 2; }
.bilivideo_audio { grid-column: 3; }
.bilivideo_hidden { display: none; }
.bilivideo_vc264 > .bilivideo_video:not(.bilivideo_h264), .bilivideo_vc265 > .bilivideo_video:not(.bilivideo_h265), .bilivideo_vcav1 > .bilivideo_video:not(.bilivideo_av1) { display: none; }
`;

const prototype = HTMLMediaElement.prototype;
const descriptor = Object.getOwnPropertyDescriptor(prototype, 'src');
const bilibplayer = prototype.play;

Object.defineProperty(prototype, 'src', {
    configurable: true,
    enumerable: true,

    get() {
        return descriptor.get.call(this);
    },

    set(value) {
        descriptor.set.call(this, value);
        bvOpen = true;
        bvWatch = location.href;
        optionsPane.classList.add('bilivideo_hidden');
        analysePane.classList.add('bilivideo_hidden');
    }
});

prototype.play = function (...args) {
    let observer = setInterval(() => {
        let wide = document.querySelector(bvMenu.widebtn);
        let menu = document.querySelector(bvMenu.menu);

        if (!wide || !menu) return;

        clearInterval(observer);
        prototype.play = bilibplayer;

        setTimeout(() => {
            if (!wide.classList.contains(bvMenu.widestat) && autowide === '1' ) wide.click();

            menu.append(mainPane, cssPane);
        }, 1000);
    }, 300);

    return bilibplayer.apply(this, args);
};
