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
            `SELECT ANIME_ID FROM ANIME`
        );

        if (i < data.rows.length) {
            console.log(data.rows[i].ANIME_ID);
            console.log(i);

            const response = await jikan.loadAnime(data.rows[i].ANIME_ID, 'full');
            const data2 = response['data'];
            console.log(data2.genres);

            for (let j = 0; j < data2.genres.length; j++) {
                try {
                    const result2 = await connection.execute(
                        `INSERT INTO ANIME_X_GENRE (ANIME_ID, GENRE_UID) VALUES (:ANIME_ID, :GENRE_UID)`,
                        [data2.mal_id, data2.genres[j].mal_id]
                    );
                } catch (insertionError) {
                    console.error(`Error during insertion for ${data2.genres[j].name}:`, insertionError);
                    // Continue to the next iteration
                    continue;
                }
            }
            // Continue to the next iteration
            setTimeout(() => insertDataIntoDatabase(i + 1), 1000);
        } else {
            // All iterations are completed
            console.log('All iterations completed');
        }
    } catch (error) {
        console.error(error);
        setTimeout(() => insertDataIntoDatabase(i + 1), 1000);
    } finally {
        // Close the database connection
        await connection.close();
    }
}

// Start the process
insertDataIntoDatabase(1090);
