// ==UserScript==
// @name            Bilibili Liveroom Filter
// @name:zh         哔哩哔哩直播间屏蔽工具
// @namespace       https://github.com/jc3213/userscript
// @version         3.3
// @description     Filtering Bilibili liveroom, batch management, export, import rulelist...
// @description:zh  哔哩哔哩直播间屏蔽工具，支持管理列表，批量屏蔽，导出、导入列表等……
// @author          jc3213
// @match           *://live.bilibili.com/*
// @require         https://raw.githubusercontent.com/jc3213/jsui/main/manager_0.5.js#sha256-hC0vacAz75BeMQoLyj4/4tHKuh+ZOXWFUtdsVT75uHQ=
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var banned = GM_getValue('banned', []);
var show = false;

var css = document.createElement('style');
css.innerText = '.fancybox {background-color: #fff; font-size: 14px; z-index: 999999; position: absolute;}\
.fancybutton {padding: 5px 10px; text-align: center; font-size: 14px;}\
.fancybutton {background-color: #23ade5; color: #ffffff; border-radius: 3px; user-select: none; cursor: pointer;}\
.fancybutton:hover {filter: opacity(60%);}\
.fancybutton:active {filter: opacity(30%);}\
.fancymenu {display: none; margin-top: 10px;}\
.fancymenu * {display: inline-block; width: 38%; margin-left: 10px;}'
document.head.appendChild(css);

var opener = document.createElement('span');
opener.innerText = '管理屏蔽列表';
opener.className = 'fancybutton';
opener.addEventListener('click', event => {
    if (!show) {
        banned.forEach(({id, liver}) => makeBanlist(id, liver));
        show = true;
    }
    container.style.display =container.style.display === 'none' ? 'block' : 'none';
});

var upload = document.createElement('input');
upload.type = 'file';
upload.accept = '.json';
upload.addEventListener('change', event => {
    if (confirm('确定要导入屏蔽列表【' + event.target.files[0].name.slice(0, -5) + '】吗？')) {
        var reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = () => {
            var list = JSON.parse(reader.result);
            list.forEach(({id, liver}) => addBanlist(id, liver));
            saveBanlist();
        }
        upload.value = '';
    }
});

var container = document.createElement('div');
container.className = 'fancybox';
container.style.display = 'none';

var manager = new Manager({
    menu: [
        {label: '批量屏蔽', onclick: batchBlock},
        {label: '导入列表', onclick: importList},
        {label: '导出列表', onclick: exportList},
        {label: '清空列表', onclick: batchUnblock},
    ],
    title: ['直播间ID', '主播昵称']
});
manager.parentNode = container;
function batchBlock(event) {
    if (confirm('确定要屏蔽列表中的直播间吗？')) {
        manager.entry.value.split('\n').forEach(item => {
            var rule = item.split(/[\\\/\s,.@#$^&]+/);
            if (!isNaN(rule[0])) {
                addBanlist(rule[0], rule[1]);
            }
        });
        saveBanlist();
        manager.entry.value = '';
    }
}
function exportList(event) {
    if (confirm('确定要导出当前屏蔽列表吗？')) {
        blobToFile(new Blob([JSON.stringify(banned)], {type: 'application/json'}), 'bilibili直播间屏蔽列表');
    }
}
function importList(event) {
    upload.querySelector('input').click();
}
function batchUnblock(event) {
    if (confirm('确定要清空当前屏蔽列表吗？')) {
        manager.clear();
        banned = [];
        saveBanlist();
    }
}

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
    player ? banInsideLiveRoom(player, area) : livePlayerInFrame(area);
}
else {
    console.log('尚未支持的特殊区间，请到NGA原帖或Github反馈');
}

function livePlayerInFrame(id) {
    var observer = setInterval(() => {
        try {
            var player = document.querySelector('#player-ctnr iframe').contentDocument.querySelector('#head-info-vm > div > div.rows-ctnr');
            player.appendChild(css);
            banInsideLiveRoom(player, id);
            clearInterval(observer);
        }
        catch(error) {}
    }, 100);
}

function applyFilterToArea({menu, room, list}) {
    setTimeout(() => {
        document.querySelector(menu).appendChild(opener);
        document.querySelector(menu).after(container);
        container.style.top = document.querySelector(menu).offsetTop + 30 + 'px';
        document.querySelectorAll(room).forEach(addMenuToLiveRoom);
        list.forEach(item => {
            new MutationObserver(mutationList => {
                mutationList.forEach(mutation => {
                    var newNode = mutation.addedNodes[0];
                    if (newNode) {
                        addMenuToLiveRoom(newNode);
                    }
                });
            }).observe(document.querySelector(item), {childList: true, subtree: false});
        });
    }, 1000);
}

function banInsideLiveRoom(domPlayer, id) {
    var liver = domPlayer.querySelector('a.room-owner-username').innerText;
    var area = domPlayer.querySelector('a.area-link').href;
    var block = document.createElement('span');
    block.innerText = '屏蔽直播间';
    block.className = 'fancybutton';
    block.addEventListener('click', event => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            addBanlist(id, liver);
            saveBanlist();
            open(area, '_self');
        }
    });
    domPlayer.querySelector('div.upper-row > div.right-ctnr').prepend(block);
    if (banned.find(rule => rule.id === id) && !confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
        open(area, '_self');
    }
}

function makeBanlist(id, liver) {
    console.log(id, liver);
    manager.addNewColumn = {
        cells: [id, liver],
        onclick: event => removeBanList(event.target.parentNode, id, liver)
    };
}

function removeBanList(column, id, liver) {
    if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
        column.remove();
        var index = banned.findIndex(rule => rule.id === id);
        if (index !== -1) {
            banned.splice(index, 1);
        }
        saveBanlist();
    }
}

function addBanlist(id, liver) {
    if (!banned.find(rule => rule.id === id)) {
        banned.push({id, liver});
        if (show) {
            makeBanlist(id, liver);
        }
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
    var liver = element.querySelector('div.Item_QAOnosoB').innerText.trim();
    var name = element.querySelector('div.Item_2GEmdhg6').innerText.trim();
    var preview = element.querySelector('div.Item_2n7ef9LN').style['background-image'];
    var url = 'https' + preview.slice(preview.indexOf(':'), preview.lastIndexOf('"'));

    var menu = document.createElement('div');
    menu.className = 'fancymenu';
    menu.innerHTML = '<span id="bililive_filter_block" class="fancybutton">屏蔽直播间</span>\
<span id="bililive_filter_thumb" class="fancybutton">下载封面</span>';
    menu.addEventListener('click', event => {
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
