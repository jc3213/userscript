(function() {
    this.promiseFileReader = i => {
        var f = new FileReader();
        return new Promise((r, e) => {
            r({
                text: () => s('readAsText'),
                arrayBuffer: () => s('readAsArrayBuffer'),
                binary: () => s('readAsBinaryString'),
                dataURL: () => s('readAsDataURL')
            });
        });
        function s(type) {
            return new Promise((r, e) => {
                f.onload = () => r(f.result);
                f.onerror = e;
                f[type](i);
            });
        }
    };
})();
