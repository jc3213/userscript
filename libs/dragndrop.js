(function() {
    this.dragndrop = (n, {width, height}) => {
        var x, y, w, h;
        var d = width ?? 0;
        var t = height ?? 0;
        n.draggable=true;
        n.addEventListener('dragstart', e => {
            x = e.clientX;
            y = e.clientY;
        });
        n.addEventListener('dragend', e => {
            w = document.documentElement.clientWidth > n.offsetWidth ? document.documentElement.clientWidth - n.offsetWidth : 0;
            h = document.documentElement.clientHeight > n.offsetHeight ? document.documentElement.clientHeight - n.offsetHeight : 0;
            x = n.offsetLeft + e.clientX - x;
            y = n.offsetTop + e.clientY - y;
            x = x < d ? d : x > w ? w : x;
            y = y < t ? t : y > h ? h : y;
            n.style.left = x + 'px';
            n.style.top = y + 'px';
        });
    };
})();
