const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

var mypw = "test"  // set mypw to the hr schema password

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function run() {
    
        const connection = await oracledb.getConnection ({
            user          : '"c##test"', // "c##test" is the user name in the database
            password      : mypw,
            connectString : "0.0.0.0/orcl"
        });

        const result = await connection.execute(
            `SELECT ANIME_ID FROM ANIME ORDER BY ANIME_ID`
        );

        for(let i=0; i<result.rows.length; i++){
            for(let j=0; j<getRandomInt(0, 20); j++){
                try{
                    const result2 = await connection.execute(
                        `INSERT INTO USER_ANIME_LIST (USER_ID, ANIME_ID, STATUS) VALUES (:user_id, :anime_id, :status)`,
                        [getRandomInt(1, 3008), result.rows[i].ANIME_ID, getRandomInt(1, 3)] //wanna watch, watching, completed
                    )
                } catch (error) {
                    console.log(error);
                }
            }
        }
}
run();