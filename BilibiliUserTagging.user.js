// ==UserScript==
// @name            Bilibili Users Tagging
// @name:zh         哔哩哔哩查户口
// @namespace       https://github.com/jc3213/userscript
// @version         1.2.1
// @description     Search users' profile, then tagging them for Bilibili
// @description:zh  查询哔哩哔哩动画用户成分并予以标记
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/bangumi/*
// @match           https://space.bilibili.com/*/dynamic*
// @match           https://t.bilibili.com/*
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@16833307450f5226347ffe7b3ebaadacc1377393/js/jsui.js#sha256-8TN+oyjtrzcHHzHO7qYN2f+O94HEpjU4f4NvTByja0o=
// @require         https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-idle
// @noframes
// ==/UserScript==

var tagging = GM_getValue('tagging', [
    {keyword: '原神', tag: '原批', color: '#4c4'},
    {keyword: '明日方舟', tag: '粥批', color: '#44c'},
    {keyword: '王者荣耀', tag: '农批', color: '#cc4'},
    {keyword: '抽奖', tag: '奖批', color: '#c4c'},
    {keyword: '虚拟主播', tag: '舔狗', color: '#4cc'}
]);
var logging = {};
var {hostname, pathname} = location;

var jsUI = new JSUI();
var stylesheet = `.jsui-tag-manager {position: relative; font-size: 16px;}
.jsui-tag-manager .jsui-menu-item {background-color: #c26; color: #fff; width: fit-content; padding: 5px 10px; margin: 0px auto;}
.jsui-tag-window {display: none; position: absolute; top: 0px; left: 88px; background-color: #fff; z-index: 999; border-width: 1px; border-style: solid; height: 600px; width: 480px;}
.jsui-tag-head {display: flex; padding: 5px;}
.jsui-tag-head input {width: 80px; height: 32px; padding: 3px; margin: 0px auto; border-width: 1px;}
.jsui-tag-head span {padding: 5px 0px; text-align: center;}
.jsui-tag-item {color: #fff; font-weight: bold; padding: 5px; margin-left: 5px;}
.jsui-tag-submit {margin-left: auto; height: 32px; padding: 3px 10px !important;}
.jsui-tag-window .jsui-table-button {color: #fff;}`;
var videocss = ` .jsui-tag-manager {left: 25px;}`;
var dynamiccss = ` .jsui-tag-manager {float: left;}
.jsui-tag-window {left: 88px;}
.jsui-tag-window input {height: 24px;}`;

function createManagerMenu() {
    var manager = jsUI.add('div', {style: 'jsui-tag-manager'});
    var button = jsUI.menuitem({text: '管理标签', style: 'jsui-tag-menu', onclick: event => toggleManagerWindow(window, list)});
    var window = jsUI.add('div', {style: 'jsui-tag-window'});
    var menu = jsUI.add('div', {style: 'jsui-tag-head', html: '<span>颜色</span><input type="color" name="color"><span>标签</span><input name="tag"><span>关键词</span><input name="keyword">'});
    var list = jsUI.table(['标签', '关键词']);
    var submit = jsUI.menuitem({text: '添加', style: 'jsui-tag-submit', onclick: event => submitNewBadge(menu, list)});
    manager.append(button, window);
    window.append(menu, jsUI.add('hr'), list);
    menu.append(submit);
    return manager;
}

function toggleManagerWindow(window, list) {
    var {style, shown} = window;
    style.display = style.display === 'block' ? 'none' : 'block';
    if (!shown) {
        tagging.forEach((tag, id) => addManageTag(list, id, tag));
        window.shown = true;
    }
}

function submitNewBadge(menu, list) {
    var result = {};
    menu.querySelectorAll('input').forEach(i => {
        var {name, value} = i;
        result[name] = value;
        i.value = '';
    });
    var {tag, keyword} = result;
    if (keyword === '' || tag === '') {
        return;
    }
    var find = tagging.findIndex(tag => tag.keyword === keyword);
    if (find === -1) {
        var id = tagging.length;
        tagging.push(result);
        addManageTag(list, id, result);
        GM_setValue('tagging', tagging);
    }
}

function addManageTag(list, id, store) {
    var {tag, keyword, color} = store;
    var rule = list.add([{text: tag, id, onclick: event => removeManageTag(rule, id, tag)}, keyword]);
    rule.firstChild.style.backgroundColor = color;
}

function removeManageTag(rule, id, tag) {
    if (confirm(`确定要删除标签《${tag}》吗？`)) {
        tagging.splice(id, 1);
        rule.remove();
        GM_setValue('tagging', tagging);
    }
}

if (pathname.startsWith('/video/')) {
    addBadgeToComment(document.querySelector('#comment'), 'data-user-id', 'reply-item', 'div.sub-reply-container', 'sub-reply-item', 'div.user-name', 'div.sub-user-name');
    addMenuToComment('div.user-name', 'ul.nav-bar');
}
else if (pathname.startsWith('/bangumi/')) {
    addBadgeToComment(document.querySelector('#comment-module'), 'data-user-id', 'reply-item', 'div.sub-reply-container', 'sub-reply-item', 'div.user-name', 'div.sub-user-name');
    addMenuToComment('div.user-name', 'ul.nav-bar');
}
else if (hostname === 'space.bilibili.com') {
    addBadgeToDynamic();
}
else if (pathname === '/') {
    addBadgeToDynamic();
}
else {
    newNodeTimeoutObserver('div.bb-comment').then(addBadgeMenuToTopic);
    jsUI.css.add(stylesheet + dynamiccss);
}

async function createUserTag(user, mid) {
    var uid = user.getAttribute(mid);
    var name = user.innerText;
    var debug = '昵称： ' + name + '\nUID： ' + uid + '\n标记：';
    var log = logging[uid];
    if (log === undefined) {
        log = [];
        var response = await fetch('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?&host_mid=' + uid, {credentials: 'include'});
        var {data} = await response.json();
        data.items.forEach(({modules: {module_dynamic: {desc}}}) => {
            if (desc === null) {
                return;
            }
            var text = desc.text.toLowerCase();
            tagging.forEach(({keyword, tag, color}) => {
                if (!debug.includes(tag) && text.includes(keyword)) {
                    log.push({tag, color});
                    debug += ' ' + tag;
                    createNewTag(user, tag, color);
                }
            });
        });
        logging[uid] = log;
    }
    else {
        log.forEach(({tag, color}) => {
            debug += ' ' + tag;
            createNewTag(user, tag, color);
        });
    }
    if (log.length > 0) {
        console.log(debug);
    }
}

function createNewTag(user, tag, color) {
    var badge = jsUI.add('span', {style: 'jsui-tag-item', text: tag});
    badge.style.backgroundColor = color;
    user.appendChild(badge);
}

function addBadgeToComment(comment, mid, root_box, sub_box, sub_item, root_user, sub_user) {
    newNodeMutationObserver(comment, root_box, area => {
        area.querySelectorAll(root_user + ',' + sub_user).forEach(user => createUserTag(user, mid));
        newNodeMutationObserver(area.querySelector(sub_box), sub_item, reply => {
            var user = reply.querySelector(root_user) ?? reply.querySelector(sub_user);
            createUserTag(user, mid);
        });
    });
}

async function addMenuToComment(anchor, target) {
    await newNodeTimeoutObserver(anchor);
    var container = document.querySelector(target);
    var manager = createManagerMenu();
    jsUI.css.add(stylesheet + videocss);
    container.appendChild(manager);
}

function addBadgeToDynamic() {
    newNodeTimeoutObserver('div.bili-dyn-list__items').then(list => {
        newNodeMutationObserver(list, 'bili-dyn-list__item', item => {
            newNodeMutationObserver(item, 'bb-comment ', addBadgeMenuToTopic);
        });
    });
    jsUI.css.add(stylesheet + dynamiccss);
}

function addBadgeMenuToTopic(comment) {
    addBadgeToComment(comment, 'data-usercard-mid', 'list-item reply-wrap ', 'div.reply-box', 'reply-item reply-wrap', 'a.name', 'a.name');
    var container = comment.querySelector('ul.clearfix');
    var manager = createManagerMenu();
    container.appendChild(manager);
}

function newNodeMutationObserver(node, style, callback) {
    new MutationObserver(mutations => {
        mutations.forEach(async mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'DIV' && node.className.includes(style)) {
                    callback(node);
                }
            });
        });
    }).observe(node, {childList: true, subtree: true});
}
