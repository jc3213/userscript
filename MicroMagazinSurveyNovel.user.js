// ==UserScript==
// @name         アンケートノベルプリント
// @namespace    https://github.com/jc3213/userscript
// @version      4
// @description  マイクロマガジン社のアンケート協力者向けの書き下ろしノベルプリントヘルパーです
// @author       jc3213
// @match        *://micromagazine.co.jp/me/qu/*_thanks*.html
// ==/UserScript==

var button = document.createElement('div');
button.id = 'print_helper';
button.style.cssText = 'position: absolute; left: 25%; top: 5%; z-lindex: 3213; background-color: white; color: black; padding: 5px; border: 1px solid #e9e9e9; cursor: pointer;';
button.innerHTML = 'プリント仕様';
button.addEventListener('click', (event) => {
    var book = document.getElementById('books') || document.getElementById('contents_c');
    book.id = 'books';
    book.style.cssText = 'border: none; margin: 0px; padding: 0px';

    document.body.replaceWith(book);

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.type = 'text/css';
    css.href = 'style_a.css';
    book.appendChild(css);

    var footer;
    var content = book.querySelectorAll('p');
    content.forEach((item, index) => {
        if (!item.children[0]) {
            return;
        }
        if (index > footer) {
            item.remove();
        }
        else if (item.children[0].tagName === 'BR') {
            if (index === 0) {
                item.remove();
            }
            item.replaceWith(item.children[0]);
        }
        else if (item.children[0].tagName === 'A') {
            item.remove();
            footer = index;
        }
    });
});
document.body.appendChild(button);
