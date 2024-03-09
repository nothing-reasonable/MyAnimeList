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
            `SELECT MANGA_ID FROM MANGA ORDER BY MANGA_ID`
        );

        for(let i=0; i<result.rows.length; i++){
            for(let j=0; j<getRandomInt(0, 20); j++){
                try{
                    const result2 = await connection.execute(
                        `INSERT INTO USER_MANGA_LIST (USER_ID, MANGA_ID, STATUS) VALUES (:user_id, :MANGA_id, :status)`,
                        [getRandomInt(1, 3008), result.rows[i].MANGA_ID, getRandomInt(1, 3)] //wanna read, reading, completed
                    )
                } catch (error) {
                    console.log(error);
                }
            }
        }
}
run();