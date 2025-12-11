// ==UserScript==
// @name         小説家になろう書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      3.0
// @description  ログインを必要としない小説情報を管理するツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @exclude      https://ncode.syosetu.com/impression/*
// @exclude      https://ncode.syosetu.com/novelpdf/*
// @exclude      https://ncode.syosetu.com/novelview/*
// @exclude      https://ncode.syosetu.com/novelreview/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

'use strict';
// 書庫関連
let [, novelcode, novelread] = location.pathname.match(/^\/(?:.*\/ncode\/)?(n\w+)\/(?:(\d+))?\/?$/);
if (!novelcode) return;

let novels = new Map(GM_getValue('bookmark', []));
let validate = {};
let novelname = document.querySelector('.c-announce-box > :last-child > :first-child, h1.novel_title').textContent;
let shelf = false;

// ホットキー関連
let shortcut = '';
let shorttime;

document.addEventListener('keydown', (event) => {
    let { key } = event;
    let hot = hotkeyMap[key];
    if (!hot || event.target.localName === 'input') return;
    event.preventDefault();
    hot(key);
});

const hotkeyMap = {
    'Escape': () => clearTimeout(shorttime),
    'ArrowLeft': () => document.querySelector('a.c-pager__item--before')?.click(),
    'ArrowRight': () => document.querySelector('a.c-pager__item--next')?.click()
};
for (let i = 0; i < 10; i++) {
    hotkeyMap[i] = hotkeyChapter;
}
function hotkeyChapter(key) {
    clearTimeout(shorttime);
    shortcut += key;
    shorttime = setTimeout(() => {
        open(`https://ncode.syosetu.com/${novelcode}/${Number(shortcut)}`, '_blank');
        shortcut = '';
    }, 1000);
}

// 通知UI
let overlay = document.createElement('div');
overlay.className = 'narou-overlay';
overlay.addEventListener('click', (event) => {
    let notify = event.target;
    if (notify.className === 'narou-notify') {
        notify.remove();
    }
});
document.body.append(overlay);

function notification(ncode, message) {
    let notify = document.createElement('div');
    notify.className = 'narou-notify';
    notify.textcontent = `Nコード[ ${ncode} ]${message}`;
    setTimeout(() => notify.remove(), 5000);
    overlay.appendChild(notify);
}

// 書庫UI
let shelf_head = `<div class="narou-book"><div>NCODE</div><div>小説タイトル</div></div>`;
let mainmenu = document.createElement('div');
mainmenu.className = 'narou-assist';
mainmenu.innerHTML = `
<div id="narou-manager" class="narou-button">書庫管理</div>
<div id="narou-clearfix" class="narou-button">本文のみ</div>
<div class="narou-popup">
    <input id="narou-ncode">
    <div id="narou-submit" class="narou-button">NCODE登録</div>
    <div id="narou-export" class="narou-button">書庫エクスポート</div>
    <div id="narou-import" class="narou-button">書庫インスポート</div>
    <a id="narou-save" download="なろう書庫.syosetu"></a>
    <input id="narou-file" type="file" accept=".syosetu">
    <div class="narou-shelf">
        ${shelf_head}
    </div>
</div>
<style>
    .narou-assist { position: relative; user-select: none; display: flex; }
    .narou-button { text-align: center; margin: 1px; flex: auto; padding: 5px 10px; cursor: pointer; }
    .narou-button:hover { background-color: #f3f3f3; }
    .narou-button:active { filter: contrast(0.8); }
    .narou-checked { padding: 4px 9px; border: 1px inset #000; }
    .narou-popup { position: fixed; z-index: 999999; border: 1px solid #000; flex-wrap: wrap; background-color: #fff; top: 47px; left: calc(50% - 440px); width: 880px; overflow: hidden; padding: 10px; display: none; }
    .narou-popup > :not(.narou-shelf) { flex: 1; }
    .narou-shelf { flex: 1 1 100%; overflow-y: auto; height: 560px; border: 1px solid #000; }
    .narou-shelf > :first-child > * { background-color: #000; color: #fff; border-color: #fff; }
    .narou-book { display: grid; grid-template-columns: 200px auto; text-align: center; }
    .narou-book > * { padding: 10px 20px; border: 1px solid #000; }
    .narou-book > .narou-botton:last-child { text-align: left; }
    .narou-overlay { position: fixed; top: 0px; left: 0px; z-index: 999999; width: 100%; inset: 0; display: flex; flex-direction: column; pointer-events: none; align-items: center; }
    .narou-notify { pointer-events: auto; width: fit-content; margin-top: 10px; background-color: #fff; padding: 10px 20px; border: 1px solid #000; }
    nav { width: fit-content !important; }
    main { width: 50% !important; }
    p { margin: 0px; font-size: 18px !important; font-family: "Segoe UI", Verdana, "メイリオ", Meiryo, sans-serif; }
    #narou-manager, #narou-clearfix { font-weight: bold; }
    #narou-save, #narou-file { display: none !important; }
</style>
`;
mainmenu.addEventListener('click', (event) => {
    let { id } = event.target;
    menuDispatch[id]?.();
});
document.querySelector('nav').appendChild(mainmenu);

function bookInShelf(ncode, title) {
    let novel = document.createElement('div');
    novel.id = ncode;
    novel.className = 'narou-book';
    novel.innerHTML = `<div class="narou-button" action="remove">${ncode}</div><div class="narou-button" action="visit">${title}</div>`;
    shelf_table.appendChild(novel);
}

// 前書きと後書き
let epilogue = document.createElement('style');
epilogue.textContent = '.p-novel__text--preface, .p-novel__text--afterword { display: none; }';

// 詳細ノードを取得
let [manager, clearfix, bookshelf] = mainmenu.children;
let [input_ncode, input_submit,,, input_save, input_file, shelf_table] = bookshelf.children;

if (novelread) {
    clearfixHandler();
} else {
    clearfix.remove();
}

input_ncode.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        input_submit.click();
    }
});

input_file.addEventListener('change', (event) => {
    let [file] = input_file.files;
    if (!confirm(`書庫「${file.name}」をインポートしますか？`)) return;
    let reader = new FileReader();
    reader.onload = () => {
        let json = JSON.parse(reader.result);
        shelf_table.innerHTML = shelf_head;
        novels = new Map(json);
        managerHandler();
        GM_setValue('bookmark', [...novels]);
    };
    reader.readAsText(file);
    input_file.value = '';
});

shelf_table.addEventListener('click', (event) => {
    let action = event.target.getAttribute('action');
    if (!action) return;
    let novel = event.target.parentNode;
    let ncode = novel.id;
    let title = novels.get(ncode);
    bookManage[action](ncode, title, novel);
});

// 事件配分
const menuDispatch = {
    'narou-manager': menuManager,
    'narou-clearfix': menuClearfix,
    'narou-submit': menuSubmit,
    'narou-export': menuExport,
    'narou-import': () => input_file.click()
};

const bookManage = {
    'remove': bookRemove,
    'visit': bookVisit
};

function menuManager() {
    if (shelf === false) {
        shelf = true;
        managerHandler();
    }
    bookshelf.style.display = !bookshelf.style.display ? 'flex' : '';
    manager.classList.toggle('narou-checked');
}
function managerHandler() {
    for (let [ncode, title] of novels) {
        bookInShelf(ncode, title);
    }
}

function menuClearfix() {
    if (localStorage.clearfix === '1') {
        localStorage.clearfix = '0';
    } else {
        localStorage.clearfix = '1';
    }
    clearfixHandler();
}

function clearfixHandler() {
    if (localStorage.clearfix === '1') {
        clearfix.classList.add('narou-checked');
        document.body.append(epilogue);
    } else {
        clearfix.classList.remove('narou-checked');
        epilogue.remove();
    }
}

async function menuSubmit() {
    let { value } = input_ncode;
    let ncode = value.match(/^(?:https:\/\/.+\/)?(n\w+)\/?(?:\d+\/)?$/)?.[1];
    if (!ncode) {
        notification(value, 'は違法な入力です！');
        return;
    }
    let title = novels.get(ncode);
    if (title) {
        notification(ncode, `小説名「 ${title} 」はは既に書庫に登録しています！`);
        return;
    }
    if (ncode === novelcode) {
        submitHandler(ncode, novelname);
        return;
    }
    if (validate[ncode]) {
        notification(ncode, 'を検証しています、しばらくお待ちください！');
        return;
    }
    validate[ncode] = true;
    let res = await fetch('/' + ncode);
    let text = await res.text();
    title = text.match(/<title[^>]*>(.*)<\/title>/)[1];
    title === 'エラー'
        ? notification(ncode, 'は「小説家になろう」に存在しません！')
        : submitHandler(ncode, title)
    delete validate[ncode];
}
function submitHandler(ncode, title) {
    bookInShelf(ncode, title);
    novels.set(ncode, title);
    GM_setValue('bookmark', [...novels]);
    notification(ncode, `小説名「 ${title} 」は書庫に登録しました！`);
}

function menuExport() {
    if (!confirm(`現在の書庫をエクスポートしますか？`)) return;
    let text = JSON.stringify([...novels], null, 4);
    let blob = new Blob([text]);
    let url = URL.createObjectURL(blob);
    input_save.href = url;
    input_save.click();
    URL.revokeObjectURL(url);
}

function bookRemove(ncode, title, novel) {
    if (!confirm(`小説「 ${title} 」を書庫から削除しますか？`)) return;
    novels.delete(ncode);
    novel.remove();
    GM_setValue('bookmark', [...novels]);
    notification(ncode, `小説名「 ${title} 」は書庫から削除しました！`);
}

function bookVisit(ncode, title) {
    if (!confirm(`小説「 ${title} 」を開きますか？`)) return;
    open(`https://ncode.syosetu.com/${ncode}/`, '_blank');
}
