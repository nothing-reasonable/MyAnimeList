const oracledb = require('oracledb');
const jikanjs = require('@mateoaranda/jikanjs');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function insertGenre()
{
    const connection = await oracledb.getConnection ({
        user: '"c##test"',
        password: "test",
        connectString: "0.0.0.0/orcl"
    });
    const genres = await jikanjs.loadGenres('anime');
    async function inserter(i) {
        console.log(genres['data'][i]);
        if(i<genres['data'].length){
            const result = await connection.execute(
                `INSERT INTO ANIME_GENRE (GENRE_UID, TYPE_NAME) VALUES (:GENRE_UID, :TYPE_NAME)`,
                [genres['data'][i].mal_id, genres['data'][i].name]
            );
        } else {
            return;
        }
        setTimeout(inserter, 1, i+1);
    }
    await inserter(0);
}
insertGenre();