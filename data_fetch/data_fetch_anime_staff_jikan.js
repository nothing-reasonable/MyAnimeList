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
        `SELECT ANIME_ID FROM ANIME`
    );
    
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for(let i=0; i<result.rows.length; i++)
    {
        try{
            const response = await jikan.loadAnime(result.rows[i].ANIME_ID, 'staff');
            const data = response['data'];
            console.log(data);
            for(let j=0; j<data.length; j++)
            {
                try{
                    const result2 = await connection.execute(
                        `INSERT INTO PERSON (PERSON_UID, NAME) VALUES (:PERSON_UID, :NAME)`,
                        [data[j].person.mal_id, data[j].person.name]
                    );
                    const result3 = await connection.execute(
                        `INSERT INTO ANIME_STAFF (ANIME_ID, PERSON_UID) VALUES (:ANIME_ID, :PERSON_UID)`,
                        [result.rows[i].ANIME_ID, data[j].person.mal_id]
                    );
                    for(let k=0; k<data[j].positions.length; k++)
                    {
                        try{
                            const result4 = await connection.execute(
                                `INSERT INTO ANIME_STAFF_POSITIONS (PERSON_UID, POSITION) VALUES (:PERSON_UID, :POSITION)`,
                                [data[j].person.mal_id, data[j].positions[k]]
                            );
                        } catch (error) {
                            console.log(error);
                        }
                    }
                    
                
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