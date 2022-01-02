(function() {
    this.dragndrop = (n, {left, top}) => {
        var x, y, w, h;
        var d = document.documentElement;
        var l = left ?? 0;
        var t = top ?? 0;
        n.draggable=true;
        n.addEventListener('dragstart', e => {
            x = e.clientX;
            y = e.clientY;
        });
        n.addEventListener('dragend', e => {
            w = d.clientWidth > n.offsetWidth ? d.clientWidth - n.offsetWidth : 0;
            h = d.clientHeight > n.offsetHeight ? d.clientHeight - n.offsetHeight : 0;
            x = n.offsetLeft + e.clientX - x;
            y = n.offsetTop + e.clientY - y;
            x = x < l ? l : x > w ? w : x;
            y = y < t ? t : y > h ? h : y;
            n.style.left = x + 'px';
            n.style.top = y + 'px';
        });
    };
})();
