const oracledb = require('oracledb');
const jikanjs = require('@mateoaranda/jikanjs');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;


async function insertCharacters() {
    const connection = await oracledb.getConnection({
        user: '"c##test"',
        password: "test",
        connectString: "0.0.0.0/orcl"
    });

    const data = await connection.execute(
        `SELECT CHARACTER_UID FROM CHARACTERS ORDER BY CHARACTER_UID`
    );
    // const data = await connection.execute(
    //     `SELECT ANIME_ID FROM ANIME ORDER BY ANIME_ID`
    // );

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    for(let i = 0; i < data.rows.length; i++) {
        console.log(data.rows[i].CHARACTER_UID)
        try{
            const characters = await jikanjs.loadCharacter(data.rows[i].CHARACTER_UID, 'full');
            const result = await connection.execute(
                `UPDATE CHARACTERS SET IMAGE_LINK = :IMAGE_LINK, DESCRIPTION = :DESCRIPTION WHERE CHARACTER_UID = :CHARACTER_UID`,
                [characters['data'].image_url, characters['data'].about, data.rows[i].CHARACTER_UID]
            );
            
            await delay(1000);
        } catch (error) {
            console.log(error);
            await delay(1000);
        }
    }
    await connection.close();
    
   
}
insertCharacters();