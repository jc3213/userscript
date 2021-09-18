// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         2.33
// @description     Filtering Bilibili liveroom, batch management, export, import rulelist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', []);
var show = false;

var css = document.createElement('style');
css.innerHTML = '.fancybox {background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}\
.fancybox > * {width: 320px; height: 360px; overflow-y: auto; display: inline-block;}\
.fancybox, .fancybox table {border: 1px solid #23ade5;}\
.fancybox textarea {resize: none; height: calc(100% - 30px); width: 100%; font-size: 14px; padding: 3px; margin-bottom: 5px;}\
.fancybox td {padding: 5px; text-align: center}\
.fancybox td:nth-child(1) {width: 120px;}\
.fancybox td:nth-child(2) {width: 200px;}\
.fancybox thead {background-color: #000; color: #fff;}\
.fancybox tbody td:nth-child(2) {background-color: #ddd}\
.fancybutton {background-color: #23ade5; color: #ffffff; padding: 5px 10px; border-radius: 3px; font-size: 14px; text-align: center; user-select: none; cursor: pointer;}\
.fancybutton:hover {filter: opacity(60%);}\
.fancybutton:active {filter: opacity(30%);}\
.fancybox .fancybutton:nth-child(n+2) {margin-left: 5px;}\
.fancymenu {display: none; margin-top: 10px;}\
.fancymenu * {display: inline-block; width: 38%; margin-left: 10px;}\
.fancyroom {margin-right: 130px;}';
document.head.appendChild(css);

var manager = document.createElement('span');
manager.innerHTML = '管理屏蔽列表';
manager.className = 'fancybutton';
manager.addEventListener('click', (event) => {
    if (!show) {
        banned.forEach(({id, liver}) => makeBanlist(id, liver));
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
<span id="bililive_filter_import" class="fancybutton">导入列表</span>\
<span id="bililive_filter_export" class="fancybutton">导出列表</span>\
<span id="bililive_filter_clear" class="fancybutton">清空列表</span></div><input type="file" style="display: none;" accept="application/json">';
container.appendChild(batch_box);
batch_box.addEventListener('click', (event) => {
    if (event.target.id === 'bililive_filter_batch' && confirm('确定要屏蔽列表中的直播间吗？')) {
        var batch = document.querySelector('textarea');
        batch.value.split('\n').forEach(item => {
            var rule = item.split(/[\\\/\s,.@#$^&]+/);
            if (!isNaN(rule[0])) {
                addBanlist(rule[0], rule[1]);
            }
        });
        saveBanlist();
        batch.value = '';
    }
    if (event.target.id === 'bililive_filter_export' && confirm('确定要导出当前屏蔽列表吗？')) {
        blobToFile(new Blob([JSON.stringify(banned)], {type: 'application/json'}), 'bilibili直播间屏蔽列表');
    }
    if (event.target.id === 'bililive_filter_import') {
        batch_box.querySelector('input').click();
    }
    if (event.target.id === 'bililive_filter_clear' && confirm('确定要清空当前屏蔽列表吗？')) {
        ban_list.querySelector('tbody').innerHTML = '';
        banned = [];
        saveBanlist();
    }
});
batch_box.addEventListener('change', (event) => {
    if (confirm('确定要导入屏蔽列表【' + event.target.files[0].name.slice(0, -5) + '】吗？')) {
        var reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = () => {
            var list = JSON.parse(reader.result);
            list.forEach(({id, liver}) => addBanlist(id, liver));
            saveBanlist();
        }
        event.target.value = '';
    }
});

var ban_list = document.createElement('table');
ban_list.innerHTML = '<thead><tr><td>直播间</td><td>主播</td></tr></thead>\
<tbody></tbody>';
container.appendChild(ban_list);

var area = location.pathname.slice(1);
if (area === '') {
    return;
}
else if (area === 'p/eden/area-tags' || area === 'lol' || area.startsWith('area/')) {
    applyFilterToArea({menu: '#area-tag-list > div:nth-child(1) > div:nth-child(1)', room: 'div.index_3Uym8ODI', list: ['#area-tag-list > div:nth-child(2)']});
}
else if (area === 'all') {
    applyFilterToArea({menu: '#all-area-card-list > div:nth-child(1) > div:nth-child(1)', room: 'div.index_3Uym8ODI', list: ['#all-area-card-list > div:nth-child(2)']});
}
else if (!isNaN(area)) {
    var player = document.querySelector('section.player-and-aside-area');
    var findPlayer = true;
    if (player) {
        banInsideLiveRoom(player, area);
    }
    else {
        livePlayerInFrame(document.querySelector('#player-ctnr'), area);
    }
}
else {
    console.log('尚未支持的特殊区间，请到NGA原帖或Github反馈');
}

function livePlayerInFrame(player, id) {
    var observer = setInterval(() => {
        var iDoc = player.querySelector('iframe').contentDocument;
        if (iDoc) {
            var liver = iDoc.querySelector('div.room-info-down-row');
            if (liver) {
                var node = iDoc.querySelector('#head-info-vm');
                clearInterval(observer);
                node.appendChild(css);
                banInsideLiveRoom(node, id);
            }
        }
    }, 500);
}

function applyFilterToArea({menu, room, list}) {
    setTimeout(() => {
        document.querySelector(menu).appendChild(manager);
        document.querySelector(menu).after(container);
        container.style.top = document.querySelector(menu).offsetTop + 30 + 'px';
        document.querySelectorAll(room).forEach(addMenuToLiveRoom);
        list.forEach(item => newNodeObserver(document.querySelector(item), addMenuToLiveRoom));
    }, 1000);
}

function newNodeObserver(node, callback) {
    new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
            var newNode = mutation.addedNodes[0];
            if (newNode) {
                callback(newNode);
            }
        });
    }).observe(node, {childList: true});
}

function banInsideLiveRoom(domPlayer, id) {
    var liver = domPlayer.querySelector('a.room-owner-username').innerText;
    var area = domPlayer.querySelector('a.area-link').href;
    var block = document.createElement('span');
    block.innerHTML = '屏蔽直播间';
    block.className = 'fancybutton fancyroom';
    block.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
            open(area, '_self');
        }
    });
    domPlayer.querySelector('div.follow-ctnr').before(block);
    if (banned.find(rule => rule.id === id) && !confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
        open(area, '_self');
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
    if (!banned.find(rule => rule.id === id)) {
        banned.push({id, liver});
        if (ban_list && show) {
            makeBanlist(id, liver);
        }
    }
}

function removeBanlist(id) {
    var index = banned.findIndex(rule => rule.id === id);
    if (index !== -1) {
        banned.splice(index, 1);
        ban_list.querySelector('#banned_' + id).remove();
    }
}

function saveBanlist() {
    GM_setValue('banned', banned);
    document.querySelectorAll('div.index_3Uym8ODI').forEach(banLiveRoom);
}

function blobToFile(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function banLiveRoom(element) {
    var url = element.querySelector('a').href;
    var id = url.slice(url.lastIndexOf('/') + 1, url.indexOf('?'));
    element.style.display = banned.find(rule => rule.id === id) ? 'none' : 'inline-block';
    return id;
}

function addMenuToLiveRoom(element) {
    if (element.querySelector('div.fancymenu')) {
        return;
    }
    var id = banLiveRoom(element);
    var liver = element.querySelector('div.Item_QAOnosoB').innerText;
    var name = element.querySelector('div.Item_2GEmdhg6').innerText;
    var preview = element.querySelector('div.Item_2n7ef9LN').style['background-image'];
    var url = 'https' + preview.slice(preview.indexOf(':'), preview.lastIndexOf('"'));

    var menu = document.createElement('div');
    menu.className = 'fancymenu';
    menu.innerHTML = '<span id="bililive_filter_block" class="fancybutton">屏蔽直播间</span>\
<span id="bililive_filter_thumb" class="fancybutton">下载封面</span>';
    menu.addEventListener('click', (event) => {
        event.preventDefault();
        if (event.target.id === 'bililive_filter_block' && confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
        }
        if (event.target.id === 'bililive_filter_thumb' && confirm('确定要下载直播《' + name + '》的封面吗？')) {
            fetch(url).then(response => response.blob()).then(blob => blobToFile(blob, id + '_' + name));
        }
    });
    element.querySelector('div.Item_2A9JA1Uf').appendChild(menu);
    element.addEventListener('mouseover', event => {menu.style.display = 'block';});
    element.addEventListener('mouseout', event => {menu.style.display = 'none';})
}
