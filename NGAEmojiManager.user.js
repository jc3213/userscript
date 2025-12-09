// ==UserScript==
// @name         NGA表情管理器
// @namespace    https://github.com/jc3213
// @version      2.0.3
// @description  为NGA论坛添加/删除新表情
// @author       jc3213
// @match        *://bbs.nga.cn/thread.php?*
// @match        *://bbs.nga.cn/read.php?*
// @match      　*://bbs.nga.cn/post.php?*
// @match        *://ngabbs.com/thread.php?*
// @match        *://ngabbs.com/read.php?*
// @match        *://ngabbs.com/post.php?*
// @match        *://nga.178.com/thread.php?*
// @match        *://nga.178.com/read.php?*
// @match        *://nga.178.com/post.php?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==

let emojis = new Map(GM_getValue('emoji', []));
let emojiUI = {};
let emojiTab;
let emojiPanel;

let css = document.createElement('style');
css.innerText = `.single_ttip2 img { max-height: 64px; }`
document.head.append(css);

let manager = document.createElement('button');
manager.textContent = '添加新表情';
manager.className = 'block_txt_big';
manager.addEventListener('click', (event) => loader.click());

let loader = document.createElement('input');
loader.type = 'file';
loader.accept = '.json';
loader.multiple = true;
loader.addEventListener('change', async (event) => {
    for (let file of event.target.files) {
        let text = await file.text();
        let { name, emoji, author } = JSON.parse(text);
        if (!name || !emoji) return;
        emojis.set(name, { author, emoji });
        GM_setValue('emoji', [...emojis]);
        printEmojiUI(name, author, emoji);
    }
    event.target.value = '';
});

function printEmojiUI(name, author, emoji) {
    let panel = emojiUI[name] ??= createEmojiUI(name, author, emoji);
    panel.innerHTML = '';
    panel.style.display = 'none';
}

function createEmojiUI(name, author, emoji) {
    let tab = document.createElement('button');
    tab.className = 'block_txt_big';
    tab.textContent = name;
    tab.title = author ? '制作者： ' + author : '';
    manager.before(tab);
    let panel = document.createElement('div');
    emojiPanel.append(panel);
    tab.addEventListener('click', (event) => {
        if (event.ctrlKey && confirm('确定要删除表情包【'+ name + '】吗？')) {
            emojis.delete(name);
            GM_setValue('emoji', [...emojis]);
            tab.remove();
            panel.remove();
            delete emojiUI[name];
        }
        else {
            for (let pane of emojiPanel.childNodes) {
                pane.style.display = 'none';
            }
            panel.style.display = '';
            appendEmojiToUI(name, emoji, panel);
        }
    });
    panel.addEventListener('click', (event) => {
        let { alt } = event.target;
        if (!alt) return;
        postfunc.addText(`[img]${alt}[/img]`);
        postfunc.selectSmilesw._.hide();
    });
    return panel;
}

function appendEmojiToUI(name, emoji, panel) {
    if (panel.runOnce) return;
    panel.runOnce = true;
    for (let em of emoji) {
        let img = document.createElement('img');
        img.src = 'https://img.nga.178.com/attachments/' + em;
        img.alt = em;
        panel.appendChild(img);
    }
}

let observer = new MutationObserver((mutationList) => {
    for (let mutation of mutationList) {
        for (let node of mutation.addedNodes) {
            if (node.id.startsWith('commonwindow')) {
                let [menu, body] = node.children[0].children;
                if (menu.textContent !== '​插入表情') continue;
                let pane = body.children[0].children;
                emojiTab = pane[0];
                emojiPanel = pane[1];
                emojiTab.appendChild(manager);
                for (let [name, { author, emoji }] of emojis) {
                    printEmojiUI(name, author, emoji);
                }
                return observer.disconnect();
            }
        }
    }
});
observer.observe(document.body, { childList: true });
