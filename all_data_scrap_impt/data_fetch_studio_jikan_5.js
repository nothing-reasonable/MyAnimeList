const oracledb = require('oracledb');
const jikan = require('@mateoaranda/jikanjs');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

jikan.loadAnime(1535, 'full').then((response) => {
    console.log(response['data'].studios);
});

async function insertDataIntoDatabase(i) {
    const connection = await oracledb.getConnection({
        user: '"c##test"',
        password: "test",
        connectString: "0.0.0.0/orcl"
    });

    try {
        const data = await connection.execute(
            `SELECT ANIME_ID FROM ANIME ORDER BY ANIME_ID`
        );

        if (i < data.rows.length) {
            console.log(data.rows[i].ANIME_ID);
            const response = await jikan.loadAnime(data.rows[i].ANIME_ID, 'full');
            const data2 = response['data'];
            console.log(data2);

            for (let j = 0; j < data2.studios.length; j++) {
                try {
                    const result = await connection.execute(
                        `INSERT INTO STUDIO (STUDIO_UID, NAME) VALUES (:STUDIO_UID, :NAME)`,
                        [data2.studios[j].mal_id, data2.studios[j].name]
                    );
                    const result2 = await connection.execute(
                        `INSERT INTO STUDIO_X_ANIME (ANIME_ID, STUDIO_UID, CONTRIBUTION) VALUES (:ANIME_ID, :STUDIO_UID, :CONTRIBUTION)`,
                        [data2.mal_id, data2.studios[j].mal_id, 'ANIMATION']
                    );
                } catch (insertionError) {
                    console.error(`Error during insertion for Studio ${data2.studios[j].name}:`, insertionError);
                    // Continue to the next iteration
                    continue;
                }
            }
            for (let j = 0; j < data2.producers.length; j++) {
                try {
                    const result = await connection.execute(
                        `INSERT INTO STUDIO (STUDIO_UID, NAME) VALUES (:STUDIO_UID, :NAME)`,
                        [data2.producers[j].mal_id, data2.producers[j].name]
                    );
                    const result2 = await connection.execute(
                        `INSERT INTO STUDIO_X_ANIME (ANIME_ID, STUDIO_UID, CONTRIBUTION) VALUES (:ANIME_ID, :STUDIO_UID, :CONTRIBUTION)`,
                        [data2.mal_id, data2.producers[j].mal_id, 'PRODUCTION']
                    );
                } catch (insertionError) {
                    console.error(`Error during insertion for Studio ${data2.producers[j].name}:`, insertionError);
                    // Continue to the next iteration
                    continue;
                }
            }

            // Continue to the next iteration
            setTimeout(() => insertDataIntoDatabase(i + 1), 667);
        } else {
            // All iterations are completed
            console.log('All iterations completed');
        }
    } catch (error) {
        console.error(error);
        setTimeout(() => insertDataIntoDatabase(i + 1), 667);
    } finally {
        // Close the database connection
        await connection.close();
    }
}

// Start the process
insertDataIntoDatabase(3363);
