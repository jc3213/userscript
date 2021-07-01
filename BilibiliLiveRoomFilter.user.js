// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         2.20
// @description     Filtering Bilibili liveroom with built-in manager
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', {});
var show = false;
var liveroom;

var css = document.createElement('style');
css.innerHTML = '.fancybox {background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}\
.fancybox > * {width: 320px; height: 360px; overflow-y: auto; display: inline-block;}\
.fancybox, .fancybox table {border: 1px solid #23ade5;}\
.fancybox textarea {resize: none; height: calc(100% - 40px); width: calc(100% - 8px); font-size: 14px; padding: 3px; margin-bottom: 5px;}\
.fancybox td {padding: 5px; text-align: center}\
.fancybox td:nth-child(1) {width: 120px;}\
.fancybox td:nth-child(2) {width: 200px;}\
.fancybox thead {background-color: #000; color: #fff;}\
.fancybox tbody td:nth-child(2) {background-color: #ddd}\
.fancybutton {background-color: #23ade5; color: #ffffff; padding: 5px 10px; border-radius: 3px; font-size: 14px; text-align: center; user-select: none; cursor: pointer;}\
.fancybutton:hover {filter: opacity(60%);}\
.fancybutton:active {filter: opacity(30%);}\
.fancybox .fancybutton:nth-child(n+2) {margin-left: 5px;}\
.fancymenu {display: block; margin-bottom: 10px;}\
.fancymenu .fancybutton:nth-child(n+2) {margin-left: 5px;}\
div.room-info-down-row > span {margin-left: 5px}';
document.head.appendChild(css);

var manager = document.createElement('span');
manager.innerHTML = '管理屏蔽列表';
manager.className = 'fancybutton';
manager.addEventListener('click', (event) => {
    if (!show) {
        Object.keys(banned).forEach(key => makeBanlist(key, banned[key]));
        show = true;
    }
    container.style.display =container.style.display === 'none' ? 'block' : 'none';
});

var container = document.createElement('div');
container.className = 'fancybox';
container.style.display = 'none';

var batch_box = document.createElement('div');
batch_box.innerHTML = '<textarea></textarea><div>\
<span id="bililive_filter_batch" class="fancybutton">批量屏蔽</span>\
<span id="bililive_filter_export" class="fancybutton">导出列表</span>\
<span id="bililive_filter_import" class="fancybutton">导入列表</span>\
<span id="bililive_filter_clear" class="fancybutton">清空列表</span></div><input type="file" style="display: none;" accept="text/plain">';
container.appendChild(batch_box);
batch_box.addEventListener('click', (event) => {
    if (event.target.id === 'bililive_filter_batch') {
        if (confirm('确定要屏蔽列表中的直播间吗？')) {
            var batch = document.getElementById('batch_list');
            batchAddList(batch.value);
            saveBanlist();
            batch.value = '';
        }
    }
    if (event.target.id === 'bililive_filter_export') {
        if (confirm('确定要导出当前屏蔽列表吗？')) {
            var list = Object.entries(banned).map(item => item[0] + ', ' + item[1]).join('\n');
            blobToFile(new Blob([list], {type: 'text/plain'}), 'bilibili直播间屏蔽列表');
        }
    }
    if (event.target.id === 'bililive_filter_import') {
        batch_box.querySelector('input').click();
    }
    if (event.target.id === 'bililive_filter_clear') {
        if (confirm('确定要清空当前屏蔽列表吗？')) {
            ban_list.querySelector('tbody').innerHTML = '';
            banned = {};
            saveBanlist();
        }
    }
});
batch_box.addEventListener('change', (event) => {
    if (confirm('确定要导入屏蔽列表【' + event.target.files[0].name.slice(0, -4) + '】吗？')) {
        var reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = () => batchAddList(reader.result);
        event.target.value = '';
    }
});

var ban_list = document.createElement('table');
ban_list.innerHTML = '<thead><tr><td>直播间</td><td>主播</td></tr></thead>\
<tbody></tbody>';
container.appendChild(ban_list);

if (liveroom = location.pathname.match(/^\/(blackboard|\d+)/)) {
    var id = liveroom[1];
    var player = document.querySelector('section.player-and-aside-area');
    if (player) {
        banInsideLiveRoom(player);
    }
    else {
        newNodeObserver(document, node => {
            var player = node.querySelector('#player-ctnr > div > iframe');
            if (player) {
                player.addEventListener('load', (event) => {
                    newNodeObserver(event.target.contentDocument, node => {
                        if (node.id === 'head-info-vm') {
                            node.appendChild(css);
                            banInsideLiveRoom(node);
                        }
                    });
                });
            }
        });
    }
}
else if (location.pathname === '/') {
    newNodeObserver(document.querySelector('#app'), node => {
        if (node.tagName === 'DIV' && node.classList.contains('area-detail-ctnr')) {
            node.querySelectorAll('div.room-card-wrapper').forEach(item => {
                addMenuToLiveRoom(item);
            });
        }
    });
}
else if (/\/(p|area|lol)\/?/.test(location.pathname)){
    var list = document.querySelector('ul.list');
    list.querySelectorAll('li').forEach(item => addMenuToLiveRoom(item));
    newNodeObserver(list, node => {
        if (node.tagName === 'LI' && node.className === '') {
            addMenuToLiveRoom(node);
        }
    });
    newNodeObserver(document.querySelector('div.wrapper'), node => {
        if (node.tagName === 'DIV') {
            if (node.className === 'wrap' || node.className === 'wrapper') {
                node.querySelector('div.list-filter-bar').appendChild(manager);
                node.querySelector('div.list-filter-bar').after(container);
            }
        }
    });
    document.querySelector('div.list-filter-bar').appendChild(manager);
    document.querySelector('div.list-filter-bar').after(container);
}

function newNodeObserver(node, callback) {
    new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
            var newNode = mutation.addedNodes[0];
            if (newNode) {
                callback(newNode);
            }
        });
    }).observe(node, {childList: true, subtree: true});
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

function makeBanlist(id, liver) {
    var ban = document.createElement('tr');
    ban.id = 'banned_' + id;
    ban.innerHTML = '<td class="fancybutton">' + id + '</td><td>' + liver + '</td>';
    ban.querySelector('.fancybutton').addEventListener('click', (event) => {
        if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
            removeBanlist(id);
            saveBanlist();
        }
    });
    ban_list.querySelector('tbody').appendChild(ban);
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
    list.split('\n').forEach(item => {
        var rule = item.split(/[\\\/\s,.@#$^&]+/);
        if (!isNaN(rule[0])) {
            addBanlist(rule[0], rule[1]);
        }
    });
    saveBanlist();
}

function banLiveRoom(element) {
    var id = element.querySelector('a').href.match(/\d+/)[0];
    element.style.display = banned[id] ? 'none' : 'inline-block';
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
    var preview = element.querySelector('div.cover-ctnr').style['background-image'];
    var url = 'https' + preview.slice(preview.indexOf(':'), preview.lastIndexOf('"'));

    var menu = document.createElement('span');
    menu.className = 'fancymenu';
    menu.innerHTML = '<span id="bililive_filter_block" class="fancybutton">屏蔽直播间</span>\
    <span id="bililive_filter_thumb" class="fancybutton">下载封面</span>';
    menu.addEventListener('click', (event) => {
        event.preventDefault();
        if (event.target.id === 'bililive_filter_block') {
            if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
                addBanlist(id, liver);
                saveBanlist();
            }
        }
        if (event.target.id === 'bililive_filter_thumb') {
            if (confirm('确定要下载直播《' + name + '》的封面吗？')) {
                fetch(url).then(response => response.blob()).then(blob => blobToFile(blob, id + '_' + name));
            }
        }
    });

    newNodeObserver(element, node => {
        if (node.tagName === 'DIV' && node.classList.contains('hover-panel-wrapper')) {
            node.prepend(menu);
        }
    });
}
