// ==UserScript==
// @name         縦書きPDF書庫
// @namespace    https://github.com/jc3213/userscript
// @version      20
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        *://ncode.syosetu.com/n*
// @match        *://novel18.syosetu.com/n*
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   [ {"selector": "*.microad.net/*", "action": "cancel"}, {"selector": "*.microad.jp/*", "action": "cancel"} ]
// ==/UserScript==

'use strict';
var novelist = {ncode: location.pathname.match(/n\w{4,}/g), title: document.title, now: Date.now(), today: new Date().getFullYear() + new Date().getMonth() + new Date().getDate()};
novelist.myncode = novelist.ncode = novelist.ncode.pop();
var validate = {};
var download = {};
var session = [];
var worker = false;
var bookmark = GM_getValue('bookmark', []);
var scheduler = GM_getValue('scheduler', novelist.today);

if (!Array.isArray(bookmark)) {
    var temp = [];
    Object.entries(bookmark).forEach(item => {
        item[1].ncode = item[0];
        temp.push(item[1]);
    });
    bookmark = temp;
    GM_setValue('bookmark', bookmark);
}

// UI作成関連
var css = document.createElement('style');
css.innerHTML = '.manager-button {background-color: #fff; text-align: center; vertical-align: middle; padding: 5px; border: 1px outset #000 ; user-select: none ; z-index: 3213; display: inline-block; cursor: pointer; font-weight: bold;}\
.manager-button:hover {filter: opacity(60%);}\
.manager-button:active {filter: opacity(30%);}\
.manager-checked {padding: 4px; border: 2px inset #00F;}\
.manager-container {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px;}\
.manager-menu :not(:first-child) {margin-left: 5px;}\
.manager-menu input {height: 20px;}\
.manager-container > div:nth-child(n+2) {margin-top: 5px;}\
.manager-shelf, .manager-logs {overflow-y: scroll; height: 552px;}\
.manager-shelf div:nth-child(2n+1) {background-color: #DDD;}\
.manager-shelf span { background-color: inherit; display: inline-block; padding: 5px; border: none; padding: 5px; font-weight: normal;}\
.manager-shelf span:nth-child(1) {width: 100px;}\
.manager-shelf span:nth-child(2) {width: 515px; text-align: left;}\
.manager-shelf span:nth-child(3) {width: 100px;}\
.manager-shelf input {width: 70px; padding: 5px;}\
.manager-shelf div:nth-child(1) span:nth-child(4) {width: 100px;}\
.manager-shelf div:nth-child(n+2) span:nth-child(4) {width: 90px; margin-right: 2px;}\
.manager-shelf div:nth-child(1) span {height: 20px; overflow-y: hidden; text-align: center; margin: 0px; cursor: default; border: 1px solid #fff;}\
.notification {position: fixed; width: fit-content; border-radius: 5px; border: 1px solid #000; background-color: #fff;}';
document.head.appendChild(css);

var manager = document.createElement('span');
manager.innerHTML = '書庫管理';
manager.className = 'manager-button';
manager.style.cssText = 'margin: 8px 5px;'
manager.addEventListener('click', (event) => {
    if (manager.classList.contains('manager-checked')) {
        container.style.display = 'none';
    }
    else {
        container.style.display = 'block';
    }
    manager.classList.toggle('manager-checked');
});
document.getElementById('head_nav').appendChild(manager);

var container = document.createElement('div');
container.innerHTML = '<div class="manager-menu"><span class="manager-button">NCODE登録</span>\
<input style="padding: 5px;">\
<span class="manager-button">NCODE一括更新</span>\
<span class="manager-button">ログ表示</span>\
<span class="manager-button" style="display: none;">書庫更新</span></div>\
<div class="manager-shelf"><div style="background-color: #000; color: #fff;"><span>NCODE</span><span>小説タイトル</span><span>更新間隔</span><span>ダウンロード</span></div></div>\
<div class="manager-logs" style="display: none;"></div>';
container.className = 'manager-container';
container.style.cssText = 'display: none;';
document.body.appendChild(container);
container.querySelector('.manager-button:nth-child(1)').addEventListener('click', () => {
    var search;
    bookmark.forEach((item, index) => {if (item.ncode === novelist.myncode) search = index;});
    if (search) {
        myFancyPopup(novelist.myncode, bookmark[search].title, 'は既に書庫に登録しています！');
        validate[novelist.myncode] = bookmark[search].title;
    }
    else if (novelist.myncode === novelist.ncode) {
        subscribeNcode(novelist.ncode, novelist.title);
    }
    else {
        validateNcode(novelist.myncode);
    }
});
container.querySelector('input:nth-child(2)').addEventListener('change', (event) => {novelist.myncode = event.target.value || novelist.ncode;} );
container.querySelector('.manager-button:nth-child(3)').addEventListener('click', () => {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        bookmarkSyncPreHandler(() => {
            bookmark.forEach(item => batchDownloadPreHandler(item));
        });
    }
});
container.querySelector('.manager-button:nth-child(4)').addEventListener('click', () => {
    if (event.target.classList.contains('manager-checked')) {
        container.querySelector('.manager-logs').style.display = 'none';
        container.querySelector('.manager-shelf').style.display = 'block';
    }
    else {
        container.querySelector('.manager-logs').style.display = 'block';
        container.querySelector('.manager-shelf').style.display = 'none';
    }
    event.target.classList.toggle('manager-checked');
});
container.querySelector('.manager-button:nth-child(5)').addEventListener('click', (event) => {
    GM_setValue('bookmark', bookmark);
    event.target.style.display = 'none';
    container.querySelector('.manager-logs').innerHTML = '';
});

// NCODE検証&登録
function validateNcode(ncode) {
    if (validate[ncode]) {
        if (validate[ncode] === '検証中') {
            myFancyPopup('', 'Nコード' + ncode, 'は既に検証しています、何度もクリックしないでください！');
        }
        else if (validate[ncode] === 'エラー') {
            myFancyLog('', 'Nコード' + ncode, 'は存在しないか既にサーバーから削除されています！', true);
        }
        else {
            subscribeNcode(ncode, validate[ncode]);
        }
        return;
    }
    validate[ncode] = '検証中';
    myFancyLog('', 'Nコード' + ncode, 'を検証しています、しばらくお待ちください！', true);
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
    var book = {
        ncode: ncode,
        title: title,
        last: 0,
        next: 7
    }
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    container.querySelector('.manager-button:nth-child(5)').style.display = 'inline-block';
    myFancyLog(ncode, title, 'は書庫に登録しました！', true);
}

// ブックマーク表記生成
bookmark.forEach((item, index) => fancyTableItem(item, index));

function fancyTableItem(book, index) {
    var mybook = document.createElement('div');
    mybook.id = book.ncode;
    mybook.innerHTML = '<span class="manager-button" title="NCODEを書庫から削除します">' + book.ncode + '</span>\
    <span class="manager-button" title="小説のウェブページを開きます">' + book.title + '</span>\
    <span title="' + (book.next === 0 ? '自動更新をしません' : book.next + '日間隔で更新します') + '"><input value="' + book.next + '"></span>\
    <span class="manager-button" title="縦書きPDFの更新をチェックします">' + generateTimeFormat(book.last) + '</span>';
    container.querySelector('.manager-shelf').appendChild(mybook);
    mybook.querySelector('.manager-button:nth-child(1)').addEventListener('click', () => {
        if (confirm('【 ' + book.title + ' 】を書庫から削除しますか？')) {
            mybook.remove();
            bookmark = [...bookmark.slice(0, index), ...bookmark.slice(index + 1)];
            container.querySelector('.manager-button:nth-child(5)').style.display = 'inline-block';
            myFancyLog(book.ncode, book.title, 'は書庫から削除しました！', true);
        }
    });
    mybook.querySelector('.manager-button:nth-child(2)').addEventListener('click', () => {
        if (confirm('小説【 ' + book.title + ' 】を開きますか？')) {
            open('https://ncode.syosetu.com/' + book.ncode + '/', '_blank');
        }
    });
    mybook.querySelector('input').addEventListener('change', (event) => {
        var day = parseInt(event.target.value);
        book.next = day;
        container.querySelector('.manager-button:nth-child(5)').style.display = 'inline-block';
        if (day === 0) {
            event.target.parentNode.title = '自動更新をしません';
            myFancyLog(book.ncode, book.title, 'は更新しないように設定しました！');
        }
        else {
            event.target.parentNode.title = day + '日間隔で更新します';
            myFancyLog(book.ncode, book.title, 'は ' + day + ' 日間隔で更新するように設定しました！');
        }
    });
    mybook.querySelector('.manager-button:nth-child(4)').addEventListener('click', () => {
        if (confirm(book.title + ' をダウンロードしますか？')) {
            updateObserver(1, () => {
                batchDownloadPreHandler(book);
            }, () => {
                container.querySelector('.manager-button:nth-child(5)').style.display = 'inline-block';
            });
        }
    });
}
function generateTimeFormat(ms) {
    var time = new Date(ms);
    return time.getFullYear() + '/' + time.getMonth() + '/' + time.getDate() + '\n' + time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}

// PDF自動更新関連
if (novelist.today !== scheduler) {
    bookmarkSyncPreHandler(() => {
        bookmark.forEach(item => updateFancyBookmark(item));
    });
    GM_setValue('scheduler', novelist.today);
}
function bookmarkSyncPreHandler(start) {
    updateObserver(Object.keys(bookmark).length, () => {
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
    if (worker) {
        return myFancyPopup('', '', '更新スケジュールを処理しています、何度もクリックしないでください！');
    }
    worker = true
    if (typeof start === 'function') {
        start();
    }
    var observer = setInterval(() => {
        if (session.length === queue) {
            session = [];
            worker = false;
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
    myFancyPopup(book.ncode, book.title, 'のダウンロードを開始しました！', true);
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
                container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(novelist.now());
                myFancyLog(book.ncode, book.title, 'のダウンロードは完了しました！', true);
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
        timer.html --;
        if (timer === 0) {
            batchDownloadPreHandler(book);
            clearInterval(retry);
        }
    }, 1000);
}

// ログ関連
function myFancyLog(ncode, title, result, popup) {
    var html = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    var log = document.createElement('p');
    log.innerHTML = html;
    container.querySelector('.manager-logs').prepend(log);
    if (popup === true) {
        myFancyPopup(ncode, title, result);
    }
}
function myFancyPopup(ncode, title, result) {
    var popup = document.createElement('div');
    popup.innerHTML = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    popup.className = 'notification manager-container';
    popup.style.height = 'fit-content';
    popup.addEventListener('click', (event) => removePopup(popup));
    document.body.appendChild(popup);
    alignFancyPopup();
    setTimeout(() => removePopup(popup), 5000);
}
function myFancyNcode(ncode, title) {
    if (ncode && title) {
        return '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」';
    }
    if (!ncode && title) {
        return '<span style="color: darkgreen">' + title + '</span>';
    }
    if (ncode && !title) {
        return '<span style="color: darkgreen">' + ncode + '</span>';
    }
    return '';
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
