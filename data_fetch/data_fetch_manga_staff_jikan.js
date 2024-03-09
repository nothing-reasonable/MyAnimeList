const oracledb = require('oracledb');
const jikan = require('@mateoaranda/jikanjs');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;


async function insert_swriter()
{
    const connection = await oracledb.getConnection({
        user:  '"c##test"',
        password: "test",
        connectString: "0.0.0.0/orcl"
    })

    const result = await connection.execute(
        `SELECT MANGA_ID FROM MANGA`
    );
    
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for(let i=0; i<result.rows.length; i++)
    {
        try{
            const response = await jikan.loadManga(result.rows[i].MANGA_ID);
            const data = response['data'];
            console.log(data);
            for(let j=0; j<data.authors.length; j++)
            {
                try{
                    const result2 = await connection.execute(
                        `INSERT INTO PERSON (PERSON_UID, NAME) VALUES (:PERSON_UID, :NAME)`,
                        [data.authors[j].mal_id, data.authors[j].name]
                    );
                    const result3 = await connection.execute(
                        `INSERT INTO MANGA_AUTHOR (MANGA_ID, PERSON_UID) VALUES (:MANGA_ID, :PERSON_UID)`,
                        [result.rows[i].MANGA_ID, data.authors[j].mal_id]
                    );
                
                } catch (error) {
                    console.log(error);
                }
            }
        } catch (error) {
            console.log(error);
        }
        await delay(1000);
    }
}

insert_swriter();