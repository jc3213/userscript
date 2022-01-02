(function() {
    this.dragndrop = ({node, top = 0, right = 0, bottom = 0, left = 0}, c) => {
        var x, y, w, h;
        var d = document.documentElement;
        node.draggable=true;
        node.addEventListener('dragstart', e => {
            y = e.clientY;
            x = e.clientX;
        });
        node.addEventListener('dragend', e => {
            h = d.clientHeight > node.offsetHeight + bottom ? d.clientHeight - node.offsetHeight - bottom : 0;
            w = d.clientWidth > node.offsetWidth + right ? d.clientWidth - node.offsetWidth - right : 0;
            y = node.offsetTop + e.clientY - y;
            x = node.offsetLeft + e.clientX - x;
            y = y < top ? top : y > h ? h : y;
            x = x < left ? left : x > w ? w : x;
            node.style.top = y + 'px';
            node.style.left = x + 'px';
            typeof c === 'function' ? c(y, x) : null;
        });
    };
})();
