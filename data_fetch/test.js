const sum = (a,b) => a+b;
const pi = 3.14;
class test{
    constructor(){
        console.log("constructor called");
    }
}
module.exports = {sum: sum, pi: pi, test: test};

const data = require('./data_fetch.js');
console.log(data)