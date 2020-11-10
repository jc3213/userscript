// ==UserScript==
// @name         アンケートノベルプリント
// @namespace    https://github.com/jc3213/userscript
// @version      5.0
// @description  マイクロマガジン社のアンケート協力者向けの書き下ろしノベルプリントヘルパーです
// @author       jc3213
// @match        *://micromagazine.net/me/qu/*_thanks.html
// ==/UserScript==

var css = document.createElement('link');
css.rel = 'stylesheet';
css.type = 'text/css';
css.href = 'style_a.css';
document.head.appendChild(css);

var button = document.createElement('div');
button.id = 'print_helper';
button.style.cssText = 'position: absolute; left: 25%; top: 5%; z-lindex: 3213; background-color: white; color: black; padding: 5px; border: 1px solid #e9e9e9; cursor: pointer;';
button.innerHTML = 'プリント仕様';
button.addEventListener('click', (event) => {
    var content = document.getElementById('books') || document.getElementById('contents_c');
    content.style.border = 'none';
    content.style.margin = '0px';
    content.style.margin = '0px';
    document.body.replaceWith(content);

    var header = content.children[0];
    if (['p', 'br'].includes(header.tagName.toLowerCase())) {
        header.remove();
    }
});
document.body.appendChild(button);
