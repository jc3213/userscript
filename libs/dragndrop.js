(function() {
    this.dragndrop = n => {
        n.draggable=true,x,y,h=visual.height-n.offsetHeight,w=visual.width-n.offsetWidth;
        n.addEventListener('dragstart', e => { x=e.clientX,y=e.clientY; });
        n.addEventListener('dragend', e => {n.style.cssText='top:'+(n.offsetTop+e.clientY-y)+'px;left:'+(n.offsetLeft+e.clientX-x)+'px;';});
    };
})();
