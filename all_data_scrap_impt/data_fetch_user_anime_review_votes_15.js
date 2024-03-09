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
        `SELECT USER_ID FROM users`
    );

    const result2 = await connection.execute(
        `SELECT REVIEW_ID, VOTES FROM user_anime_reviews`
    );
    //issues persist as vote type hasn't been determined yet

    for(let i=0; i<result2.rows.length; i++)
    {
        let downvotes = getRandomInt(0, result2.rows[i].VOTES);
        for(let j=0; j<result2.rows[i].VOTES+downvotes; j++)
        {
            try{
                const result3 = await connection.execute(
                    `INSERT INTO USER_ANIME_REVIEW_VOTES (USER_ID, REVIEW_ID, VOTE_TYPE) VALUES (:user_id, :review_id, :vote_type)`,
                    [result.rows[getRandomInt(0, 3008)].USER_ID, result2.rows[i].REVIEW_ID, 'UPVOTE']
                )
            } catch (error) {
                console.log(error);
            }
        }
        for(let k=0; k<downvotes; k++)
        {
            try{
                const result4 = await connection.execute(
                    `INSERT INTO USER_ANIME_REVIEW_VOTES (USER_ID, REVIEW_ID, VOTE_TYPE) VALUES (:user_id, :review_id, :vote_type)`,
                    [result.rows[getRandomInt(0, 3008)].USER_ID, result2.rows[i].REVIEW_ID, 'DOWNVOTE']
                )
            } catch (error) {
                console.log(error);
            }
        }

    }
}
run();