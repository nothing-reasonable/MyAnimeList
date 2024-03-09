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
            for(let j=0; j<data.demographics.length; j++){
                // const result2 = await connection.execute(
                //     `UPDATE ANIME SET DEMOGRAPHICS = :demographics WHERE ANIME_ID = :anime_id`,
                //     [data.demographics, data.mal_id]
                // )
            }

        } catch (error) {
            console.log(error);
        }
    }
}
