const jikan = require('@mateoaranda/jikanjs');
const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;

var mypw = "test"  // set mypw to the hr schema password


const jikanjs = require('@mateoaranda/jikanjs');

async function fetchData(i) {
    try {
        const response = await jikanjs.loadAnime(i);
        const data = response['data'];
        console.log(data);

        await insertDataIntoDatabase(data);
    } catch (error) {
        console.error(`Error fetching or inserting data for manga with ID ${i}: ${error.message}`);
        // You can choose to skip the iteration or handle the error in a different way
    }
    setTimeout(fetchData, 1000, i+1);
}

async function insertDataIntoDatabase(data) {
    try {
        const connection = await oracledb.getConnection({
            user: '"c##test"',
            password: mypw, // Make sure mypw is defined
            connectString: "0.0.0.0/orcl"
        });

        // const result = await connection.execute(
        //     `INSERT INTO ANIME (anime_id, title_english, title_native, isAdult, episode_count, trailer_link,
        //         status, synopsis)
        //     VALUES (:anime_id, :title_english, :title_native, :isAdult, :episode_count, :trailer_link, :status,
        //         :synopsis)`,
        //     [data.mal_id, data.title_english, data.title_japanese, data.is_adult, data.episodes, data.trailer_url,
        //         data.status, data.synopsis]

        // );
        const result = await connection.execute(
            `UPDATE ANIME SET title_english = :title_english, title_native = :title_native, isAdult = :isAdult, episode_count = :episode_count, trailer_link = :trailer_link
            WHERE anime_id = :anime_id`,
            [data.title_english, data.title_japanese, data.rating, data.episodes, data.trailer_url, data.mal_id]
        )
        await connection.close();
        
    } catch (error) {
        console.error(`Error inserting data into the database: ${error.message}`);
        throw error; // Re-throw the error to let the fetchData function know that an error occurred
    }
}

fetchData(1);
