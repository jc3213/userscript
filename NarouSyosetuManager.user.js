// ==UserScript==
// @name         小説家になろう 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      4.8
// @description  小説家になろう の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        *://ncode.syosetu.com/n*
// @match        *://novel18.syosetu.com/n*
// @require      https://raw.githubusercontent.com/jc3213/metalink4.js/main/metalink4.js#sha256-6oj9bI0kPdhk0XE8OEW9VWwedwSdFxjIirpGaFTAq0A=
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "*.microad.net/*", "action": "cancel"}
// @webRequest   {"selector": "*.microad.jp/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var novelist = {ncode: /n\d+\w+/g.exec(location.pathname), title: document.title, now: Date.now(), today: new Date().getFullYear() + new Date().getMonth() + new Date().getDate()};
novelist.myncode = novelist.ncode = novelist.ncode.pop();
var validate = {};
var download = {};
var session = [];
var sync = false;
var show = false;
var bookmark = GM_getValue('bookmark', []);
var scheduler = GM_getValue('scheduler', novelist.today);

// UI作成関連
var css = document.createElement('style');
css.innerHTML = '.manager-button {background-color: #fff; text-align: center; vertical-align: middle; padding: 5px; border: 1px outset #000 ; user-select: none ; z-index: 3213; display: inline-block; cursor: pointer; font-weight: bold;}\
.manager-button:hover, .manager-shelf > *:not(:first-child) > *:hover {filter: opacity(75%);}\
.manager-button:active，.manager-shelf > *:not(:first-child) > *:active {filter: opacity(45%);}\
.manager-checked {padding: 4px; border: 2px inset #00F;}\
.manager-container {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px;}\
.manager-menu :not(:first-child) {margin-left: 5px;}\
.manager-menu input {height: 20px;}\
.manager-container > div:nth-child(n+2) {margin-top: 5px;}\
.manager-shelf, .manager-logs {overflow-y: scroll; height: 552px;}\
.manager-shelf > * {display: grid; grid-template-columns: 100px calc(100% - 300px) 100px 100px; text-align: center;}\
.manager-shelf > *:nth-child(2n+1):not(:first-child) * {background-color: #eee;}\
.manager-shelf > *:not(:first-child) > *:nth-child(2) {text-align: left;}\
.manager-shelf > *:not(:first-child) > *:nth-child(1) {line-height: 40px;}\
.notification {position: fixed; width: fit-content; border-radius: 5px; border: 1px solid #000; background-color: #fff;}';
document.head.appendChild(css);

var manager = document.createElement('span');
manager.innerHTML = '書庫管理';
manager.className = 'manager-button';
manager.style.cssText = 'margin: 8px 5px;'
manager.addEventListener('click', event => {
    if (!show) {
        bookmark.forEach(fancyTableItem);
        show = true;
    }
    container.style.display = manager.classList.contains('manager-checked') ? 'none' : 'block';
    manager.classList.toggle('manager-checked');
});
(document.getElementById('head_nav') ?? document.body).appendChild(manager);

var container = document.createElement('div');
container.innerHTML = '<div class="manager-menu"><span id="mgr-btn-subscribe" class="manager-button">NCODE登録</span>\
<input style="padding: 5px;">\
<span id="mgr-btn-update" class="manager-button">NCODE一括更新</span>\
<span id="mgr-btn-meta4" class="manager-button">NCODEをエックスポート</span>\
<span id="mgr-btn-save" class="manager-button" style="display: none; background-color: #387ec8; color: #fff">書庫更新</span>\
<span id="mgr-btn-log" class="manager-button" style="display: none;">ログ表示</span></div>\
<div class="manager-shelf"><div style="background-color: #000; color: #fff;"><span>NCODE</span><span>小説タイトル</span><span>更新間隔</span><span>ダウンロード</span></div></div>\
<div class="manager-logs" style="display: none;"></div>';
container.className = 'manager-container';
container.style.cssText = 'display: none;';
document.body.appendChild(container);
container.addEventListener('change', event => {novelist.myncode = event.target.value ?? novelist.ncode;});
container.querySelector('#mgr-btn-subscribe').addEventListener('click', event => {
    var book = bookmark.find(book => book.ncode === novelist.myncode);
    if (book) {
        myFancyPopup(book.ncode, book.title, 'は既に書庫に登録しています！');
        validate[book.ncode] = book.title;
    }
    else if (novelist.myncode === novelist.ncode) {
        subscribeNcode(novelist.ncode, novelist.title);
    }
    else {
        validateNcode(novelist.myncode);
    }
});
container.querySelector('#mgr-btn-update').addEventListener('click', event => {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        bookmarkSyncPreHandler(() => bookmark.forEach(batchDownloadPreHandler));
    }
});
container.querySelector('#mgr-btn-meta4').addEventListener('click', event => {
    if (confirm('全ての小説のダウンロード情報をエックスポートしますか？')) {
        var json = bookmark.map(book => {
            book.last = novelist.now;
            container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(novelist.now);
            return {url: ['https://pdfnovels.net/' + book.ncode + '/main.pdf'], name: book.title + '.pdf', locale: 'ja'};
        });
        new Metalink4(json).saveAs('小説家になろう書庫');
        saveBookmarkButton();
        alert('情報のエックスポートは無事に成功しました！');
    }
});
container.querySelector('#mgr-btn-save').addEventListener('click', event => {
    GM_setValue('bookmark', bookmark);
    container.querySelector('.manager-logs').innerHTML = '';
    container.querySelector('#mgr-btn-save').style.display = container.querySelector('#mgr-btn-log').style.display = 'none';
});
container.querySelector('#mgr-btn-log').addEventListener('click', event => {
    container.querySelector('.manager-logs').style.display = event.target.classList.contains('manager-checked') ? 'none' : 'block';
    container.querySelector('.manager-shelf').style.display = event.target.classList.contains('manager-checked') ? 'block' : 'none';
    event.target.classList.toggle('manager-checked');
});

// NCODE検証&登録
function validateNcode(ncode) {
    if (validate[ncode]) {
        validate[ncode] === '検証中' ? myFancyPopup('', 'Nコード' + ncode, 'は既に検証しています、何度もクリックしないでください！') :
        validate[ncode] === 'エラー' ? myFancyPopup('', 'Nコード' + ncode, 'は存在しないか既にサーバーから削除されています！') :
        subscribeNcode(ncode, validate[ncode]);
        return;
    }
    validate[ncode] = '検証中';
    myFancyPopup('', 'Nコード' + ncode, 'を検証しています、しばらくお待ちください！');
    GM_xmlhttpRequest({
        url: 'https://ncode.syosetu.com/' + ncode,
        method: 'GET',
        onload: (details) => {
            validate[ncode] = details.responseXML.title;
            subscribeNcode(ncode, validate[ncode]);
        }
    });
}
function subscribeNcode(ncode, title) {
    var book = {ncode, title, last: 0, next: 0};
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    saveBookmarkButton();
    myFancyLog(ncode, title, 'は書庫に登録しました！');
}

// ブックマーク表記生成
function fancyTableItem(book, index) {
    var mybook = document.createElement('div');
    mybook.id = book.ncode;
    mybook.innerHTML = '<span id="mgr-bk-remove" title="NCODEを書庫から削除します">' + book.ncode + '</span>\
    <span id="mgr-bk-open" title="小説のウェブページを開きます">' + book.title + '</span>\
    <input title="' + (book.next === 0 ? '自動更新をしません' : book.next + '日間隔で更新します') + '" value="' + book.next + '">\
    <span id="mgr-bk-update" title="縦書きPDFの更新をチェックします">' + generateTimeFormat(book.last) + '</span>';
    container.querySelector('.manager-shelf').appendChild(mybook);
    mybook.querySelector('#mgr-bk-remove').addEventListener('click', event => {
        if (confirm('【 ' + book.title + ' 】を書庫から削除しますか？')) {
            mybook.remove();
            bookmark.splice(index, 1);
            saveBookmarkButton();
            myFancyLog(book.ncode, book.title, 'は書庫から削除しました！');
        }
    });
    mybook.querySelector('#mgr-bk-open').addEventListener('click', event => {
        if (confirm('小説【 ' + book.title + ' 】を開きますか？')) {
            open('https://ncode.syosetu.com/' + book.ncode + '/', '_blank');
        }
    });
    mybook.querySelector('#mgr-bk-update').addEventListener('click', event => {
        if (confirm(book.title + ' をダウンロードしますか？')) {
            updateObserver(1, () => batchDownloadPreHandler(book), saveBookmarkButton);
        }
    });
    mybook.addEventListener('change', event => {
        book.next = parseInt(event.target.value);
        saveBookmarkButton();
        event.target.title = book.next === 0 ? '自動更新をしません' : book.next + '日間隔で更新します';
        myFancyLog(book.ncode, book.title, book.next === 0 ? 'は更新しないように設定しました！' : 'は ' + book.next + ' 日間隔で更新するように設定しました！');
    });
}
function generateTimeFormat(ms) {
    var time = new Date(ms);
    return time.getFullYear() + '/' + (time.getMonth() + 1) + '/' + time.getDate() + '\n' + time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}
function saveBookmarkButton() {
    container.querySelector('#mgr-btn-save').style.display = container.querySelector('#mgr-btn-log').style.display = 'inline-block';
}

// PDF自動更新関連
if (novelist.today !== scheduler) {
    bookmarkSyncPreHandler(() => bookmark.forEach(updateFancyBookmark));
    GM_setValue('scheduler', novelist.today);
}
function bookmarkSyncPreHandler(start) {
    updateObserver(bookmark.length, () => {
        myFancyPopup('', '登録した全てのNコード', 'を更新しています！');
        if (typeof start === 'function') {
            start();
        }
    }, () => {
        GM_setValue('bookmark', bookmark);
        myFancyPopup('', '登録した全てのNコード', 'の更新が完了しました！');
        container.querySelector('.manager-logs').innerHTML = '';
    });
}
function updateObserver(queue, start, end) {
    if (sync) {
        return myFancyPopup('', '', '更新スケジュールを処理しています、何度もクリックしないでください！');
    }
    sync = true;
    if (typeof start === 'function') {
        start();
    }
    var observer = setInterval(() => {
        if (session.length === queue) {
            session = [];
            sync = false;
            clearInterval(observer);
            if (typeof end === 'function') {
                end();
            }
        }
    }, 1000);
}
function updateFancyBookmark(book) {
    if (book.next === 0) {
        session.push(book.ncode);
        return myFancyPopup(book.ncode, book.title, 'は更新しないように設定しています！！');
    }
    var next = book.next - (novelist.now - book.last) / 86400000;
    if (next > 0) {
        next = next >= 1 ? (next | 0) + '日' : (next * 24 | 0) + '時間';
        myFancyPopup(book.ncode, book.title, 'は <b>' + next + '</b> 後に更新する予定です！');
        session.push(book.ncode);
    }
    else {
        batchDownloadPreHandler(book);
    }
}
function batchDownloadPreHandler(book) {
    if (download[book.ncode] === 'ダウンロード') {
        return myFancyPopup(book.ncode, book.title, 'はまだ処理しています、しばらくお待ちください！');
    }
    download[book.ncode] = 'ダウンロード';
    myFancyPopup(book.ncode, book.title, 'のダウンロードを開始しました！');
    GM_xmlhttpRequest({
        url: 'https://pdfnovels.net/' + book.ncode + '/main.pdf',
        method: 'GET',
        responseType: 'blob',
        onload: (details) => {
            if (details.response.type === 'application/pdf') {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(details.response);
                a.download = book.title;
                a.click();
                book.last = novelist.now;
                container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(novelist.now);
                myFancyLog(book.ncode, book.title, 'のダウンロードは完了しました！');
                delete download[book.ncode];
                session.push(book.ncode)
            }
            else {
                download[book.ncode] = 'リトライ';
                downloadPDFHandler(book);
            }
        }
    });
}
function downloadPDFHandler(book) {
    myFancyPopup(book.ncode, book.title, 'の縦書きPDFは只今生成中です、 60秒後に再試行します！');
    var timer = 60;
    var retry = setInterval(() => {
        timer --;
        if (timer === 0) {
            batchDownloadPreHandler(book);
            clearInterval(retry);
        }
    }, 1000);
}

// ログ関連
function myFancyLog(ncode, title, result) {
    var html = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    var log = document.createElement('p');
    log.innerHTML = html;
    container.querySelector('.manager-logs').prepend(log);
    myFancyPopup(ncode, title, result);
}
function myFancyPopup(ncode, title, result) {
    var popup = document.createElement('div');
    popup.innerHTML = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    popup.className = 'notification manager-container';
    popup.style.height = 'fit-content';
    popup.addEventListener('click', event => removePopup(popup));
    document.body.appendChild(popup);
    alignFancyPopup();
    setTimeout(() => removePopup(popup), 5000);
}
function myFancyNcode(ncode, title) {
    return ncode && title ? '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」' :
        !ncode && title ? '<span style="color: darkgreen">' + title + '</span>' :
    ncode && !title ? '<span style="color: darkgreen">' + ncode + '</span>' : '';
}
function alignFancyPopup() {
    document.querySelectorAll('.notification').forEach((element, index) => {
        element.style.top = (element.offsetHeight + 5) * index + 10 + 'px';
        element.style.left = (innerWidth - element.offsetWidth) / 2 + 'px';
    });
}
function removePopup(popup) {
    popup.remove()
    alignFancyPopup();
}
