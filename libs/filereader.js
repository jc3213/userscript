class PromiseFileReader {
    constructor(file) {
        this.file = file;
    }
    reader(method) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = event => resolve(reader.result);
            reader[method](this.file);
        });
    }
    text () {
        return this.reader('readAsText');
    }
    data () {
        return this.reader('readAsDataURL');
    }
    buffer () {
        return this.reader('readAsArrayBuffer');
    }
    binary () {
        return this.reader('readAsBinaryString');
    }
}
