const EventEmitter = require('events'); //to conduct event driven programming
//eventemitter is a class
//create an instance of that class
const eventEmitter = new EventEmitter()
//attach a listener and a function to the eventEmitter object so that i can call the function later using the listener
eventEmitter.on('listen', (lie_detector)=> {
    console.log("js isn't that bad "+lie_detector);
});

//emitting the event using the listener 
eventEmitter.emit('listen', false);


const jikanjs = require('@mateoaranda/jikanjs');

async function fetchData(i) {
    try {
        // Use await to wait for the promise to resolve
        const response = await jikanjs.loadManga(i);

        // Store the response['data'] in the variable
        const data = response['data'];

        // Now you can use the data variable
        console.log(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    setTimeout(fetchData, 1000, i+1);
}
fetchData(1);
// Call the function

const jikanjs = require('@mateoaranda/jikanjs');
const jikan = require('@mateoaranda/jikanjs');
jikan.loadManga(173).then((response) => {
    console.log(response['data']);
});

const mock = require('./MOCK_DATA.json');
console.log(mock[0].Username);

// class tester extends EventEmitter{
//     constructor(name){
//         super();
//         this._name = name;
//     }
//     get name()
//     {
//         return this._name;
//     }

// }

// let test = new tester('hello');
// console.log(test.name);

// test.on('name', ()=>{
//     console.log('hi, my name is '+test.name )
// })
// test.emit('name');
