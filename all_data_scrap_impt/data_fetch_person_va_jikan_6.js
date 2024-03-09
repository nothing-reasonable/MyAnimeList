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
        `SELECT CHARACTER_UID FROM CHARACTERS`
    );
    
    console.log(data.rows);
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < data.rows.length; i++) {
        console.log(data.rows[i].CHARACTER_UID)
        const characters = await jikanjs.loadCharacter(data.rows[i].CHARACTER_UID, 'full');
        for(let j=0; j < characters['data'].voices.length; j++)
        {
            try {
                const result = await connection.execute(
                    `INSERT INTO PERSON (PERSON_UID, NAME, IMAGE_LINK) VALUES
                    (:PERSON_UID, :NAME, :IMAGE_LINK)`,
                    [characters['data'].voices[j].person.mal_id, characters['data'].voices[j].person.name, characters['data'].voices[j].person.images.jpg.image_url]
                );
                const result2 = await connection.execute(
                    `INSERT INTO VOICE_ARTIST (PERSON_UID, CHARACTER_UID, LANGUAGE)
                    VALUES (:PERSON_UID, :CHARACTER_UID, :LANGUAGE)`,
                    [characters['data'].voices[j].person.mal_id, data.rows[i].CHARACTER_UID, characters['data'].voices[j].language]
                );

            } catch (insertionError) {
                console.error(`Error during insertion for Voice Actor ${characters['data'].voices[j].name}:`, insertionError);
                // Continue to the next iteration
                continue;
            }
        }
        await delay(1000);
    }
}

insertCharacters();