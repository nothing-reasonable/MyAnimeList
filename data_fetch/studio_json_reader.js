const file = require('./output.json');
const oracledb = require('oracledb');
oracledb.autoCommit = true;

async function run(i) {
    try {
        const connection = await oracledb.getConnection({
            user: '"c##test"',
            password: 'test',
            connectString: 'localhost/ORCL',
        });

        const sql = `INSERT INTO STUDIO(STUDIO_UID, NAME, ABOUT, IMAGE_LINK) 
                     VALUES (:studio_uid, :name, :about, :image_link)`;

        const result = await connection.execute(sql, {
            studio_uid: Number(data[i].mal_id),
            name: data[i].titles[0].title,
            about: data[i].about,
            image_link: data[i].images.jpg.image_url
        });

        await connection.close();
    } catch (err) {
        console.error(err);
    }
}

const data = file[0]; // Assuming data is an array in your output.json file

for (let i = 0; i < file.length; i++) {
    run(i);
}
