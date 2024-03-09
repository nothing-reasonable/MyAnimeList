const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

var mypw = "test"  // set mypw to the hr schema password
const data = require('./MOCK_DATA_4.json');

async function user_insertion(i) {
    if(i > data.length)
    {
        return;
    }
    async function run() {

        const connection = await oracledb.getConnection ({
            user: '"c##test"',
            password: mypw,
            connectString: "0.0.0.0/orcl"
        });
        try{
            const result = await connection.execute(
                `INSERT INTO USERS (USER_ID, USERNAME, PASSWORD, PRIVILEGE, REPUTATION, PROFILE_PICTURE, EMAIL)
                VALUES (:user_id, :username, :password, :privilege, :reputation, :profile_picture, :email)`,
                [i+3001, data[i].Username, data[i].password, data[i].Privilege, data[i].Reputation, data[i].Avatar, data[i].email]
            );
            console.log(result.rows);
            await connection.close();
        } catch (error)
        {
            i=i-1;
            console.log(error);
        }
    }
    run();
    setTimeout(user_insertion, 50, i+1);
}
user_insertion(0);