(function() {
    this.dragndrop = n => {
        var x, y;
        var h = visual.height - n.offsetHeight;
        var w = visual.width - n.offsetWidth;
        n.draggable=true;
        n.addEventListener('dragstart', e => {
            x = e.clientX;
            y = e.clientY;
        });
        n.addEventListener('dragend', e => {
            x = n.offsetLeft + e.clientX - x;
            y = n.offsetTop + e.clientY - y;
            x= x < 0 ? 0 : x > w ? w : x;
            y = y < 0 ? 0 : y > h ? h :y;
            n.style.left = x + 'px';
            n.style.top = y + 'px';
        });
    };
})();
