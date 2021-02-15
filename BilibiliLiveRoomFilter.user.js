// ==UserScript==
// @name              哔哩哔哩直播间屏蔽工具
// @namespace         https://github.com/jc3213/userscript
// @version           21.1
// @description       哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出列表等……
// @author            jc3213
// @match             *://live.bilibili.com/*
// @grant             GM_getValue
// @grant             GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', {});
var show = false;

var css = document.createElement('style');
css.innerHTML = '.fancybutton {background-color: #23ade5; color: #ffffff; padding: 5px 10px; border-radius: 3px; font-size: 14px; text-align: center; user-select: none; cursor: pointer;}\
.fancybutton:hover {filter: opacity(60%);}\
.fancybutton:active {filter: opacity(30%);}\
.fancymenu {display: block; margin-bottom: 10px;}\
.fancymenu .fancybutton:nth-child(n+2) {margin-left: 5px;}\
.fancybox {background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}\
.fancylist {width: 320px; height: 360px; overflow-y: auto; border: 1px solid #23ade5; display: inline-block;}\
.fancylist span:nth-child(1) {width: calc(50% - 50px);}\
.fancylist span:nth-child(2) {width: calc(50% + 25px);}\
.fancylist textarea {resize: none; height: calc(100% - 40px); width: calc(100% - 8px); font-size: 14px; padding: 3px;}\
.fancyitem {display: inline-block; padding: 5px; text-align: center; border: 1px solid #fff;}\
.fancytitle {background-color: #000; color: #fff;}\
.fancybody span:nth-child(1) {padding: 7px 5px 6px;}\
.fancybody span:nth-child(2) {background-color: #ddd;}\
.fancyfooter {margin-top: 3px;}\
.fancyfooter .fancybutton:nth-child(n+2) {margin-left: 5px;}\
div.room-info-down-row > span {margin-left: 5px}';
document.head.appendChild(css);

var liveroom = location.pathname.match(/^\/(\d+)/);
if (liveroom) {
    var id = liveroom[1];
    var player = document.querySelector('section.player-and-aside-area');
    if (player) {
        banInsideLiveRoom(player);
    }
    else {
        document.addEventListener('DOMNodeInserted', (event) => {
            if (event.target.tagName === 'DIV' && event.target.style.margin === '0px auto') {
                event.target.querySelector('iframe').addEventListener('load', (event) => {
                    event.target.contentDocument.head.appendChild(css);
                    event.target.contentDocument.addEventListener('DOMNodeInserted', (event) => {
                        if (event.target.id === 'head-info-vm') {
                            banInsideLiveRoom(event.target);
                        }
                    });
                });
            }
        });
    }
    return;
}

function banInsideLiveRoom(domPlayer) {
    var liver = domPlayer.querySelector('a.room-owner-username').innerHTML;
    var area = domPlayer.querySelector('a.area-link').href;
    var block = document.createElement('span');
    block.innerHTML = '屏蔽直播间';
    block.className = 'fancybutton';
    block.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
            open(area, '_self');
        }
    });
    domPlayer.querySelector('a.room-owner-username').after(block);
    if (banned[id]) {
        if (!confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
            open(area, '_self');
        }
    }
}

var list = document.querySelector('ul.list');
list.querySelectorAll('li').forEach(item => addMenuToLiveRoom(item));
list.addEventListener('DOMNodeInserted', (event) => {
    if (event.target.tagName === 'LI' && event.target.className === '') {
        addMenuToLiveRoom(event.target);
    }
});

function makeBanlist(id, liver) {
    var ban = document.createElement('div');
    ban.id = 'banned_' + id;
    ban.innerHTML = '<span id="remove_liveroom" class="fancyitem fancybutton">' + id + '</span><span class="fancyitem">' + liver + '</span>';
    ban.querySelector('.fancybutton').addEventListener('click', (event) => {
        if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
            removeBanlist(id);
            saveBanlist();
        }
    });
    ban_list.querySelector('.fancybody').appendChild(ban);
}

function addBanlist(id, liver) {
    if (!banned[id]) {
        banned[id] = liver;
        if (ban_list && show) {
            makeBanlist(id, liver);
        }
    }
}

function removeBanlist(id) {
    if (banned[id]) {
        delete banned[id];
        ban_list.querySelector('#banned_' + id).remove();
    }
}

function saveBanlist() {
    GM_setValue('banned', banned);
    if (list) {
        list.querySelectorAll('li').forEach(item => banLiveRoom(item));
    }
}

function batchAddList(list) {
    list.match(/^(\d+)[\\\/\s.@#$^&]+([^\\\/\s.@#$^&]+)/mg).forEach(item => {
        var rule = item.split(/[\\\/\s.@#$^&]+/);
        addBanlist(rule[0], rule[1]);
    });
    saveBanlist();
}

function banLiveRoom(element) {
    var id = element.querySelector('a').href.match(/\d+/)[0];
    element.style.display = banned[id] ? 'none' : 'block';
    return id;
}

function blobToFile(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function addMenuToLiveRoom(element) {
    var id = banLiveRoom(element);
    var liver = element.querySelector('div.room-anchor > span').innerHTML;
    var name = element.querySelector('span.room-title').innerHTML;
    var preview = element.querySelector('div.cover-ctnr').style['background-image'].match(/https?:\/\/[^\@]+/)[0];

    var menu = document.createElement('span');
    menu.className = 'fancymenu';
    menu.innerHTML = '<span class="fancybutton">屏蔽直播间</span>\
    <span class="fancybutton">下载封面</span>';
    menu.querySelector('.fancybutton:nth-child(1)').addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
        }
    });
    menu.querySelector('.fancybutton:nth-child(2)').addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要下载直播《' + name + '》的封面吗？')) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', preview.replace(/https?/, 'https'), true);
            xhr.responseType = 'blob';
            xhr.onload = () => blobToFile(xhr.response, id + '_' + name);
            xhr.send();
        }
    });

    element.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'DIV' && event.target.classList.contains('hover-panel-wrapper')) {
            event.target.prepend(menu);
        }
    });
}

var manager = document.createElement('span');
manager.innerHTML = '管理屏蔽列表';
manager.className = 'fancybutton';
manager.addEventListener('click', (event) => {
    if (!show) {
        Object.entries(banned).forEach(item => makeBanlist(item[0], item[1]));
        show = true;
    }
    if (container.style.display === 'none') {
        container.style.display = 'block';
    }
    else {
        container.style.display = 'none';
    }
});
document.querySelector('div.list-filter-bar').appendChild(manager);

var container = document.createElement('div');
container.className = 'fancybox';
container.style.display = 'none';
document.querySelector('div.list-filter-bar').after(container);

var ban_list = document.createElement('div');
ban_list.className = 'fancylist';
ban_list.innerHTML = '<div class="fancytitle"><span class="fancyitem">直播间</span>\
<span class="fancyitem">主播</span></div>\
<div class="fancybody"></div>';
container.appendChild(ban_list);

var batch_box = document.createElement('div');
batch_box.className = 'fancylist';
batch_box.innerHTML = '<textarea id="batch_list"></textarea><div class="fancyfooter">\
<span class="fancybutton">批量屏蔽</span>\
<span class="fancybutton">导出列表</span>\
<span class="fancybutton">导入列表</span>\
<span class="fancybutton">清空列表</span></div><input type="file" style="display: none;" accept="text/plain">';
container.prepend(batch_box);
batch_box.querySelector('.fancybutton:nth-child(1)').addEventListener('click', () => {
    if (confirm('确定要屏蔽列表中的直播间吗？')) {
        var batch = document.getElementById('batch_list');
        batchAddList(batch.value);
        saveBanlist();
        batch.value = '';
    }
});
batch_box.querySelector('.fancybutton:nth-child(2)').addEventListener('click', () => {
    if (confirm('确定要导出当前屏蔽列表吗？')) {
        var list = Object.entries(banned).map(item => item[0] + ', ' + item[1]).join('\n');
        blobToFile(new Blob([list], {type: 'text/plain'}), 'bilibili直播间屏蔽列表');
    }
});
batch_box.querySelector('.fancybutton:nth-child(3)').addEventListener('click', () => batch_box.querySelector('input').click() );
batch_box.querySelector('input').addEventListener('change', (event) => {
    if (confirm('确定要导入屏蔽列表【' + event.target.files[0].name.slice(0, -4) + '】吗？')) {
        var reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = () => batchAddList(reader.result);
        batch_box.querySelector('input').value = '';
    }
});
batch_box.querySelector('.fancybutton:nth-child(4)').addEventListener('click', () => {
    if (confirm('确定要清空当前屏蔽列表吗？')) {
        ban_list.querySelector('.fancybody').innerHTML = '';
        banned = {};
        saveBanlist();
    }
});
