const jikan = require('@mateoaranda/jikanjs');
const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
const mypwd = "test";

async function run() {
    const connection = oracle.getConnection({
        user: '"c##test"',
        password: mypwd,
        connectString: "0.0.0.0/orcl"
    });
    const result = await connection.execute(
        `SELECT ANIME_ID FROM ANIME`
    );
    for(let i=0; i<result.rows.length; i++){
        try{
            const response = await jikan.loadAnime(result.rows[i].ANIME_ID, 'full');
            const data = response['data'];
            const result2 = await connection.execute(
                `UPDATE ANIME SET AGE_RATING = :age_rating WHERE ANIME_ID = :anime_id`,
                [data.rating, data.mal_id]
            )

        } catch (error) {
            console.log(error);
        }
    }
}
