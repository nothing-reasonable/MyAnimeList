
const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

var mypw = "test"  // set mypw to the hr schema password

async function run() {

    const connection = await oracledb.getConnection ({
        user          : '"c##test"', // "c##test" is the user name in the database
        password      : mypw,
        connectString : "0.0.0.0/orcl"
    });

    const result = await connection.execute(
        `SELECT *
        FROM users`
    );

    console.log(result.rows);
    await connection.close();
}

run();