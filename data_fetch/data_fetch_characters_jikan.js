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
        `SELECT ANIME_ID,MANGA_ID FROM ANIME_X_MANGA ORDER BY ANIME_ID`
    );
    // const data = await connection.execute(
    //     `SELECT ANIME_ID FROM ANIME ORDER BY ANIME_ID`
    // );

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < data.rows.length; i++) {
        console.log(data.rows[i].ANIME_ID)
        console.log(i);
        try{
            const characters = await jikanjs.loadAnime(data.rows[i].ANIME_ID, 'characters');
            console.log('received')
            for(let j = 0; j < characters['data'].length; j++) {
                const name = characters['data'][j].character.name.split(', ');

                try {
                    const result = await connection.execute(
                        `INSERT INTO CHARACTERS (CHARACTER_UID, FIRST_NAME, LAST_NAME, ROLE_PLAY, IMAGE_LINK, DESCRIPTION) VALUES
                        (:CHARACTER_UID, :FIRST_NAME, :LAST_NAME, :ROLE_PLAY, :IMAGE_LINK, :DESCRIPTION)`,
                        [characters['data'][j].character.mal_id, name[1], name[0], characters['data'][j].role,
                        characters['data'][j].character.images.jpg.image_url, characters['data'][j].character.about]
                    );

                    const result3 = await connection.execute(
                        `INSERT INTO CHARACTERS_X_MANGA (MANGA_ID, CHARACTER_UID) VALUES (:MANGA_ID, :CHARACTER_UID)`,
                        [data.rows[i].MANGA_ID, characters['data'][j].character.mal_id]
                    );

                    const result2 = await connection.execute(
                        `INSERT INTO CHARACTERS_X_ANIME (ANIME_ID, CHARACTER_UID) VALUES (:ANIME_ID, :CHARACTER_UID)`,
                        [data.rows[i].ANIME_ID, characters['data'][j].character.mal_id]
                    );
                } catch (insertionError) {
                    console.error(`Error during insertion for Character ${characters['data'][j].name}:`, insertionError);
                    // Continue to the next iteration
                    continue;
                }
                
                // Add a delay of 1 second (1000 milliseconds) between iterations
            }
            await delay(1000);
        } catch (error) {
            console.error(`Error during insertion for Anime ${data.rows[i].ANIME_ID}:`, error);
            // Continue to the next iteration
            continue;
        }
    }
}
insertCharacters();