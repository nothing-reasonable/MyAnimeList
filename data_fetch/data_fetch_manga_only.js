// const test = require ('./test');
// console.log(test);
// test.constructor();

// const data = require('D:/L2-T1/project/simple.json');
// for(let i=0; i<data['data'].length; i++) {
//     console.log(data['data'][i].title + " " + data['data'][i]['animeSeason'].year);
// }

// Here we define our query as a multi-line string
// Storing it in a separate .graphql/.gql file is also possible
const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function iteration_manga(i) {
    var query = `
    query ($id:Int) { # Define which variables will be used in the query (id)
        Media (idMal: $id, type: MANGA) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
        id
        idMal
        title {
            english
            native
        }
        isAdult
        chapters
        volumes
        status
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        description
        countryOfOrigin
        bannerImage
        coverImage {
          large
        }
    
        }
    }
    `;

    // Define our query variables and values that will be used in the query request
    var variables = {
        id: i
    };

    // Define the config we'll need for our Api request
    var url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    // Make the HTTP Api request
    fetch(url, options).then(handleResponse)
                    .then(handleData)
                    .catch(handleError);

    function handleResponse(response) {
        return response.json().then(function (json) {
            return response.ok ? json : Promise.reject(json);
        });
    }

    async function handleData(data) {
        console.log(data['data'])
        async function run() {
            const connection3 = await oracledb.getConnection ({
                user: '"c##test"',
                password: "test",
                connectString: "0.0.0.0/orcl"
            });
            const result = await connection3.execute(
                `INSERT INTO MANGA (MANGA_ID, MAL_ID_MANGA, TITLE_ENGLISH, TITLE_NATIVE, ISADULT, CHAPTERS, VOLUMES, STATUS, START_DATE, END_DATE, SYNOPSIS, COUNTRY_OF_ORIGIN,
                    BANNER_IMAGE, COVER_IMAGE)
                VALUES (:manga_id, :mal_id_manga, :title_english, :title_native, :ISADULT, :chapters, :volumes, :status, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'),
                 :synopsis, :country_of_origin, :banner_image, :cover_image)`, 
                [data['data'].Media.id, data['data'].Media.idMal, data['data'].Media.title.english, data['data'].Media.title.native,
                 (data['data'].Media.isAdult)? 'YES': 'NO', data['data'].Media.chapters, 
                data['data'].Media.volumes, data['data'].Media.status,
                (data['data'].Media.startDate.year == null || data['data'].Media.startDate.month == null || data['data'].Media.startDate.day == null)? '': 
                data['data'].Media.startDate.year+ '-' + data['data'].Media.startDate.month + '-' + data['data'].Media.startDate.day , 
                (data['data'].Media.endDate.year == null || data['data'].Media.endDate.month == null || data['data'].Media.endDate.day == null)? '': data['data'].Media.endDate.year 
                + '-' + data['data'].Media.endDate.month + '-' + data['data'].Media.endDate.day, 
                data['data'].Media.description, data['data'].Media.countryOfOrigin,
                data['data'].Media.bannerImage, data['data'].Media.coverImage.large]
            );
            await connection3.close();
            console.log(result);
        }
        try {
            await run();
        } catch (err) {
            console.error(err);
        }
    }

    function handleError(error) {
        return
        console.log(data['data']);
        alert('Error, check console');
        console.error(error);
    }

    setTimeout(iteration_manga, 1000, i+1);
}
iteration_manga(0);