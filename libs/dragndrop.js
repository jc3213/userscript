(function() {
    this.dragndrop = (n, {left = 0, top = 0, bottom = 0, right = 0}) => {
        var x, y, w, h;
        var d = document.documentElement;
        n.draggable=true;
        n.addEventListener('dragstart', e => {
            x = e.clientX;
            y = e.clientY;
        });
        n.addEventListener('dragend', e => {
            w = d.clientWidth > n.offsetWidth + right ? d.clientWidth - n.offsetWidth - right : 0;
            h = d.clientHeight > n.offsetHeight + bottom ? d.clientHeight - n.offsetHeight - bottom : 0;
            x = n.offsetLeft + e.clientX - x;
            y = n.offsetTop + e.clientY - y;
            x = x < left ? left : x > w ? w : x;
            y = y < top ? top : y > h ? h : y;
            n.style.left = x + 'px';
            n.style.top = y + 'px';
        });
    };
})();
