// // // Here we define our query as a multi-line string
// // // Storing it in a separate .graphql/.gql file is also possible

// // function iterator(i){
// // var query = `
// // query ($id: Int) { # Define which variables will be used in the query (id)
// //   Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
// //     id
// //     title {
// //       romaji
// //       english
// //       native
// //     }
// //     tags {
// //         id
// //     }
// //   }
// // }
// // `;

// // // Define our query variables and values that will be used in the query request
// // var variables = {
// //     id: 15125
// // };

// // // Define the config we'll need for our Api request
// // var url = 'https://graphql.anilist.co',
// //     options = {
// //         method: 'POST',
// //         headers: {
// //             'Content-Type': 'application/json',
// //             'Accept': 'application/json',
// //         },
// //         body: JSON.stringify({
// //             query: query,
// //             variables: variables
// //         })
// //     };

// // // Make the HTTP Api request
// // fetch(url, options).then(handleResponse)
// //                    .then(handleData)
// //                    .catch(handleError);

// // function handleResponse(response) {
// //     return response.json().then(function (json) {
// //         return response.ok ? json : Promise.reject(json);
// //     });
// // }

// // function handleData(data) {
// //     console.log(data['data']);
// // }

// // function handleError(error) {
// //     alert('Error, check console');
// //     console.error(error);
// // }
// // setTimeout(iterator, 1000, i+1);
// // }

// // iterator(1);

// const jikan = require('@mateoaranda/jikanjs');

// // jikanjs.loadPerson(118,'full').then((response) => {
// //     console.log(response['data']);
// // });

// const oracledb = require('oracledb');
// oracledb.initOracleClient();
// oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// oracledb.autoCommit = true;


// var mypwd = "test";

// var anime_ids = [];
// async function run() {

//     const connection = await oracledb.getConnection ({
//         user: '"c##test"',
//         password: mypwd,
//         connectString: "0.0.0.0/orcl"
//     });

//     const result = await connection.execute(
//         `SELECT ANIME_ID FROM ANIME`
//     );
//     await connection.close();
//     return result.rows;
//     //console.log(anime_ids);
// }

// async function main ()
// {
//     anime_ids = await run();
//     //console.log(anime_ids[0].ANIME_ID);
// }
// main();

// async function studio_generator(i)
// {
//     try{

//         async function temp()
//         {
//             await jikanjs.loadAnime(anime_ids[i].ANIME_ID, 'full');
//             return data;
//         }
//         const data = await temp();
//         await insertDataIntoDatabase(data['data'], i);
//     } catch (error) {
//         console.log(error);

//     }
//     setTimeout(studio_generator, 1000, i+1);
// }

// async function insertDataIntoDatabase(data)
// {
//     for(j=0; j<data.producers.length; j++){
//         console.log(data.producers[j].mal_id);
//         const connection = await oracledb.getConnection ({
//             user: '"c##test"',
//             password: mypwd,
//             connectString: "0.0.0.0/orcl"
//         });
//         const result = await connection.execute(
//             `INSERT INTO STUDIO (studio_uid, studio_name) VALUES (:studio_uid, :studio_name)`,
//             [data.producers[j].mal_id, data.producers[j].name]
//         );
//     }
// }

// studio_generator(0);

const jikan = require('@mateoaranda/jikanjs');

// jikan.loadAnime(1535, 'full').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadCharacter(1, 'full').then((response) => {
//     console.log(response['data']);
// }); 

// jikan.loadPerson(118,'full').then((response) => {
//     console.log(response['data']);
// });


// jikan.loadAnime(1, 'characters').then((response) => {
//     console.log(response['data'][0].voice_actors[0]);
// });

// jikan.loadPerson(357, 'full').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadCharacter(3, 'full').then((response) => {
//     console.log(response['data'].voices[0].person.images.jp);
// });

// jikan.loadCharacter(94717, 'full').then((response) => {
//     console.log(response['data'].voices[0].language);
// });

// jikan.loadAnime(1, 'characters').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadProducers(94).then((response) => { // 94 max page
//     console.log(response['data'][0]);
// });

// jikan.loadAnime(1, 'staff').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadManga(1).then((response) => {
//     console.log(response['data'].authors[0].name);
// });

// jikan.loadManga(1, 'full').then((response) => {
//     console.log(response['data'].demographics);;
// });

// jikan.loadAnime(21, 'full').then((response) => {
//     console.log(response['data'].demographics[0]);;
// });

// jikan.loadUser('a').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadReviews('anime', 1).then((response) => {
//     console.log(response['data']);
// });
// jikan.loadAnime(1, 'full').then((response) => {
//     console.log(response['data']);
// });

// jikan.loadReviews('anime', 1).then((response) => {
//     console.log(response['data']);
// });

jikan.loadAnime(25777, 'full').then((response) => {
    console.log(response['data'].relations[2]);
}  );

// jikan.loadCharacter(1, 'full').then((response) => {
//     console.log(response['data'].about);
// });

// jikan.loadProducers(90).then((response) => {
//     console.log(response['data']);
// });