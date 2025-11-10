// ==UserScript==
// @name            NGA Emoji Manager
// @name:zh         NGA表情管理器
// @namespace       https://github.com/jc3213
// @version         2.0.0
// @description     Add/Remove New Emoji to NGA Forum
// @description:zh  为NGA论坛添加/删除新表情
// @author          jc3213
// @match           *://bbs.nga.cn/thread.php?*
// @match           *://bbs.nga.cn/read.php?*
// @match           *://bbs.nga.cn/post.php?*
// @match           *://ngabbs.com/thread.php?*
// @match           *://ngabbs.com/read.php?*
// @match           *://ngabbs.com/post.php?*
// @match           *://nga.178.com/thread.php?*
// @match           *://nga.178.com/read.php?*
// @match           *://nga.178.com/post.php?*
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @grant           GM_listValues
// ==/UserScript==

let emojiPackage = GM_getValue('emoji');
if (Array.isArray(emojiPackage)) {
    emojiPackage.forEach(({ name, author, emoji }) => {
        GM_setValue(name, { author, emoji });
    });
    GM_deleteValue('emoji');
}

let emojis = new Map( GM_listValues().map((i) => [i, GM_getValue(i)]) );
let emojiUI = {};
let emojiTab;
let emojiPanel;

let css = document.createElement('style');
css.innerText = `.single_ttip2 img { max-height: 64px; }`
document.head.append(css);

let manager = document.createElement('button');
manager.innerText = '添加新表情';
manager.className = 'block_txt_big';
manager.addEventListener('click', async (event) => {
    let handles = await document.defaultView.showOpenFilePicker({ types: [ { description: 'JSON 文件', accept: { 'application/json': ['.json'] } } ], multiple: true });
    Promise.all(handles.map(async (handler) => {
        let file = await handler.getFile();
        let text = await file.text();
        let { name, emoji, author } = JSON.parse(text);
        if (!name || !emoji) return;
        emojis.set(name, { author, emoji });
        GM_setValue(name, { author, emoji });
        printEmojiUI(name, author, emoji);
    }));
});

function printEmojiUI(name, author, emoji) {
    let panel = emojiUI[name] ??= createEmojiUI(name, author, emoji);
    panel.innerHTML = '';
    panel.style.display = 'none';
}

function createEmojiUI(name, author, emoji) {
    let tab = document.createElement('button');
    tab.className = 'block_txt_big';
    tab.innerText = name;
    tab.title = author ? '制作者： ' + author : '';
    manager.before(tab);
    let panel = document.createElement('div');
    emojiPanel.append(panel);
    tab.addEventListener('click', event => {
        if (event.ctrlKey && confirm('确定要删除表情包【'+ name + '】吗？')) {
            GM_deleteValue(name)
            emojis.delete(name);
            tab.remove();
            panel.remove();
            delete emojiUI[name];
        }
        else {
            emojiPanel.childNodes.forEach((pane) => { pane.style.display = 'none'; });
            panel.style.display = '';
            appendEmojiToUI(name, emoji, panel);
        }
    });
    return panel;
}

function appendEmojiToUI(name, emoji, panel) {
    if (panel.runOnce) return;
    panel.runOnce = true;
    emoji.forEach((em) => {
        let img = document.createElement('img');
        img.src = 'https://img.nga.178.com/attachments/' + em;
        img.alt = em;
        panel.appendChild(img);
    });
    panel.addEventListener('click', (event) => {
        let { alt } = event.target;
        if (!alt) return;
        postfunc.addText(`[img]${alt}[/img]`);
        postfunc.selectSmilesw._.hide();
    });
}

let observer = new MutationObserver((mutationList) => {
    for (let mutation of mutationList) {
        for (let node of mutation.addedNodes) {
            if (node?.id && node.id.startsWith('commonwindow')) {
                let emojiMain = node.children[0].children[1].children[0].children;
                emojiTab = emojiMain[0];
                emojiPanel = emojiMain[1];
                emojiTab.appendChild(manager);
                emojis.forEach(({ author, emoji }, name) => printEmojiUI(name, author, emoji));
                return observer.disconnect();
            }
        }
    }
});
observer.observe(document.body, { childList: true });
