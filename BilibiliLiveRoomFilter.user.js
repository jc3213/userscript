// ==UserScript==
// @name         bilibili 直播间屏蔽工具
// @namespace    https://github.com/jc3213/userscript
// @version      9
// @description  try to take over the world!
// @author       jc3213
// @match        *://live.bilibili.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @noframes
// ==/UserScript==

'use strict';
var ban_id = GM_getValue('id', []);
var ban_liver = GM_getValue('liver', []);
GM_addValueChangeListener('ban', (name, old_value, new_value, remote) => {
    if (new_value !== '') {
        ban_id.push(new_value.id);
        ban_liver.push(new_value.liver);
        GM_setValue('id', ban_id);
        GM_setValue('liver', ban_liver);
        makeBanList(new_value.id, new_value.liver);
        GM_setValue('ban', '');
    }
});
GM_addValueChangeListener('unban', (name, old_value, new_value, remove) => {
    if (new_value !== '') {
        var index = ban_id.indexOf(new_value);
        ban_id = [...ban_id.slice(0, index), ...ban_id.slice(index + 1)];
        ban_liver = [...ban_liver.slice(0, index), ...ban_liver.slice(index + 1)];
        GM_setValue('id', ban_id);
        GM_setValue('liver', ban_liver);
        ban_list.querySelector('#banned_' + new_value).remove();
        list.querySelectorAll('li').forEach(item => {
            var id = item.querySelector('a').href.match(/\d+/)[0];
            if (new_value === id) {
                item.style.display = 'block';
            }
        });
        GM_setValue('unban', '');
    }
});

function blobToFile(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

var css = document.createElement('style');
css.innerHTML = '.fancybutton {background-color: #23ade5; color: #ffffff; padding: 5px 10px; border-radius: 3px; font-size: 14px; text-align: center; user-select: none; cursor: pointer;}\
.fancylist {background-color: #fff; font-size: 14px; min-width: 200px; height: 200px; overflow-y: auto; border: 1px solid #23ade5; z-index: 999999; position: absolute;}\
.fancylist div:nth-child(n+2) span:nth-child(2) {background-color: #ddd;}\
.fancylist span:nth-child(1) {width: 80px;}\
.fancylist span:nth-child(2) {width: 120px;}\
.fancyitem {display: inline-block; padding: 5px; text-align: center; border: 1px solid #fff;}\
.fancytitle {background-color: #000; color: #fff;}\
.fancybutton:hover {filter: opacity(60%);}\
.fancybutton:active {filter: opacity(30%);}\
div.sort-box > span:nth-child(n+2), div.room-info-down-row > span {margin-left: 5px}';
document.head.appendChild(css);

var player = document.querySelector('section.player-and-aside-area');
if (player) {
    var id = location.pathname.match(/\d+/)[0];
    var liver = player.querySelector('a.room-owner-username').innerHTML;
    var url = player.querySelector('a.area-link').href;
    var block = document.createElement('span');
    block.innerHTML = '屏蔽直播间';
    block.className = 'fancybutton';
    block.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            GM_setValue('ban', {id: id, liver: liver});
            open(url, '_self');
        }
    });
    player.querySelector('a.room-owner-username').after(block);
    if (ban_id.includes(id)) {
        if (!confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
            open(url, '_self');
        }
    }
}

var list = document.querySelector('ul.list');
if (list) {
    list.querySelectorAll('li').forEach(item => addMenuToLiveRoom(item));
    list.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'LI' && event.target.className === '') {
            addMenuToLiveRoom(event.target);
        }
    });
}
else {
    return;
}

function blockLiveRoom(element) {
    var id = element.querySelector('a').href.match(/\d+/)[0];
    if (ban_id.includes(id)) {
        element.style.display = 'none';
    }
    return id;
}

function addMenuToLiveRoom(element) {
    var id = blockLiveRoom(element);
    var liver = element.querySelector('div.room-anchor > span').innerHTML;
    var name = element.querySelector('span.room-title').innerHTML;
    var preview = element.querySelector('div.cover-ctnr').style['background-image'].match(/https:\/\/[^\@]+/)[0];

    var block = document.createElement('span');
    block.innerHTML = '屏蔽直播间';
    block.className = 'fancybutton';
    block.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            element.style.display = 'none';
            GM_setValue('ban', {id: id, liver: liver});
        }
    });

    var download = document.createElement('span');
    download.innerHTML = '下载封面';
    download.className = 'fancybutton';
    download.style.cssText = 'margin-left: 5px;';
    download.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('确定要下载直播《' + name + '》的封面吗？')) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', preview, true);
            xhr.responseType = 'blob';
            xhr.onload = () => blobToFile(xhr.response, id + '_' + name);
            xhr.send();
        }
    });

    element.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'DIV' && event.target.classList.contains('hover-panel-wrapper')) {
            var container = document.createElement('span');
            container.style.cssText = 'display: block; margin-bottom: 10px;';
            event.target.prepend(container);
            container.appendChild(block);
            container.appendChild(download);
        }
    });
}

var manager = document.createElement('span');
manager.innerHTML = '管理屏蔽列表';
manager.className = 'fancybutton';
manager.addEventListener('click', (event) => {
    if (ban_list.style.display === 'none') {
        ban_list.style.display = 'block';
    }
    else {
        ban_list.style.display = 'none';
    }
});
document.querySelector('div.sort-box').appendChild(manager);

var ban_list = document.createElement('div');
ban_list.innerHTML = '<div class="fancytitle"><span class="fancyitem">直播间</span><span class="fancyitem">主播</span></div>';
ban_list.className = 'fancylist';
ban_list.style.cssText = 'display: none; left: -28px;'
manager.after(ban_list);

ban_id.forEach((item, index) => makeBanList(item, ban_liver[index]));

function makeBanList(id, liver) {
    var box = document.createElement('div');
    box.id = 'banned_' + id;
    var ban_id = document.createElement('span');
    ban_id.innerHTML = id;
    ban_id.className = 'fancyitem fancybutton';
    ban_id.addEventListener('click', (event) => {
        if (confirm('确定要解除对【 ' + liver + ' 】的屏蔽吗？')) {
            GM_setValue('unban', id);
        }
    });
    var ban_liver = document.createElement('span');
    ban_liver.innerHTML = liver;
    ban_liver.className = 'fancyitem';
    ban_list.appendChild(box);
    box.appendChild(ban_id);
    box.appendChild(ban_liver);
}

var batch = document.createElement('span');
batch.innerHTML = '批量屏蔽';
batch.className = 'fancybutton';
batch.addEventListener('click', (event) => {
    if (batch_box.style.display === 'none') {
        batch_box.style.display = 'block';
    }
    else {
        batch_box.style.display = 'none';
    }
});
manager.after(batch);

var batch_box = document.createElement('div');
batch_box.className = 'fancylist';
batch_box.style.cssText = 'display: none; left: 202px;';
batch.after(batch_box);

var ban_box = document.createElement('textarea');
ban_box.style.cssText = 'resize: none; height: 160px; width: 200px; font-size: 14px; padding: 3px;';
batch_box.appendChild(ban_box);

var submit = document.createElement('span');
submit.innerHTML = '确认';
submit.className = 'fancybutton';
submit.style.cssText = 'position: absolute; bottom: 1px; left: 35px;';
submit.addEventListener('click', (event) => {
    if (confirm('确定要屏蔽列表中的直播间吗？')) {
        var pattern = ban_box.value.split('\n');
        pattern.forEach(item => {
            var rule = item.match(/^(\d+)[\s\/\.\@\#\$\,\/\\]+([^\s\/\.\@\#\$\,\/\\]+)/);
            if (rule) {
                if (!ban_id.includes(rule[1])) {
                    GM_setValue('ban', {id: rule[1], liver: rule[2]});
                }
            }
        });
        list.querySelectorAll('li').forEach(item => blockLiveRoom(item));
        ban_box.value = '';
    }
});
batch_box.appendChild(submit);

var save = document.createElement('span');
save.innerHTML = '导出列表';
save.className = 'fancybutton';
save.addEventListener('click', (event) => {
    if (confirm('确定要导出当前的屏蔽列表吗？')) {
        var list = ban_id.map((item, index) => item + ', ' + ban_liver[index]).join('\n');
        blobToFile(new Blob([list], {type: 'text/plain'}), 'bilibili直播间屏蔽列表');
    }
});
batch.after(save);
