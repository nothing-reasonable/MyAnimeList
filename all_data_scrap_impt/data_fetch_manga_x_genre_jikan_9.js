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
            `SELECT MANGA_ID FROM MANGA`
        );

        if (i < data.rows.length) {
            console.log(data.rows[i].MANGA_ID);
            try{
            const response = await jikan.loadManga(data.rows[i].MANGA_ID, 'full');
            const data2 = response['data'];
            console.log(data2.genres);

            for (let j = 0; j < data2.genres.length; j++) {
                try {
                    const result2 = await connection.execute(
                        `INSERT INTO MANGA_X_GENRE (MANGA_ID, GENRE_UID) VALUES (:MANGA_ID, :GENRE_UID)`,
                        [data2.mal_id, data2.genres[j].mal_id]
                    );
                } catch (insertionError) {
                    console.error(`Error during insertion for Studio ${data2.genres[j].name}:`, insertionError);
                    // Continue to the next iteration
                    continue;
                }
            }
            // Continue to the next iteration
            setTimeout(() => insertDataIntoDatabase(i + 1), 1000);
            } catch (error) {
                console.log(error);
                setTimeout(() => insertDataIntoDatabase(i+1), 1000);
            }
        } else {
            // All iterations are completed
            console.log('All iterations completed');
        }
    } catch (error) {
        console.error(error);
    } finally {
        // Close the database connection
        await connection.close();
    }
}

// Start the process
insertDataIntoDatabase(0);
