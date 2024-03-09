const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;
const data = require('./en.json');

async function fetchData() {
    try{
        const connection = await oracledb.getConnection({
            user: '"c##test"',
            password: "test",
            connectString: "0.0.0.0/orcl"

        });

        //console.log(data[1]);
        for(var i = 0; i < data.length; i++)
        {
            var severity = data[i].severity;
            for(var j=0; j<data[i].dictionary.length; j++)
            {
                var temp = data[i].dictionary[j].match.split("|");
                for(var k=0; k<temp.length; k++)
                {
                    //console.log(temp[k]);
                    try{
                        const result = await connection.execute(
                            `INSERT INTO OFFENSIVE_TEXT (TEXT, LANGUAGE, OFFENSE_LEVEL) VALUES (:1, :2, :3)`,
                            [temp[k], 'en', severity]
                        );
                    } catch (error) {
                        console.error(`Error fetching data: ${error.message}`);
                    }
                    // console.log('Data inserted');
                }
            }
        }
    } catch (error) {
        console.error(`Error fetching data: ${error.message}`);
        //throw error;
    }
}
fetchData();