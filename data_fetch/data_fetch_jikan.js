const jikan = require('@mateoaranda/jikanjs');
jikan.loadAnime(1, 'full').then((response) => {
    console.log(response['data']);
}
);

async function test(){
const result = await jikan.loadAnime(1, 'relations')
console.log(result['data'])
}
test();