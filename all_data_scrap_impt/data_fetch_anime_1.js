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

async function iteration(i) {
    var query = `
    query ($id: Int) { # Define which variables will be used in the query (id)
        Media (idMal: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
            id
            idMal
            title {
                english
                native
            }
            isAdult
            episodes
            trailer {
                site
                id
            }
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
            duration
            relations {
                nodes {
                    id
                }
                edges {
                    id
                    relationType
                }
            }
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
        const anime = data['data'].Media;
        
        async function run() {
            const connection = await oracledb.getConnection ({
                user: '"c##test"',
                password: "test",
                connectString: "0.0.0.0/orcl"
            });
            const result = await connection.execute(
                `INSERT INTO ANIME (anime_id, title_english, title_native, isAdult, episode_count, trailer_link,
                    status, synopsis, country_of_origin, average_episode_duration, start_date, end_date, banner_image, cover_image)
                VALUES (:anime_id, :title_english, :title_native, :isAdult, :episode_count, :trailer_link, :status,
                    :synopsis, :country_of_origin, :average_episode_duration, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'),
                    :banner_image, :cover_image)`,
                [   anime.idMal, anime.title.english, anime.title.native, (anime.isAdult) ? "YES" : "NO",
                    (anime.episodes == null)? '': anime.episodes, (anime.trailer == null)? "" : anime.trailer.id , anime.status,
                    anime.description, anime.countryOfOrigin, anime.duration,
                    (anime.startDate.year == null || anime.startDate.month == null || anime.startDate.day == null)? '':
                    anime.startDate.year + "-" + anime.startDate.month + "-" + anime.startDate.day,
                    (anime.endDate.year == null || anime.endDate.month == null || anime.endDate.day == null)? '':
                    anime.endDate.year + "-" + anime.endDate.month + "-" + anime.endDate.day,
                    anime.bannerImage, anime.coverImage.large]
            );
            
            await connection.close();
            await manga_id_add(data);
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

    setTimeout(iteration, 1500, i+1);
}
iteration(1);

async function manga_id_add(data, connection)
{
    const connection2 = await oracledb.getConnection ({
        user: '"c##test"',
        password: "test",
        connectString: "0.0.0.0/orcl"
    });
    anime = data['data'].Media;
    for(j=1; j<=anime.relations.edges.length; j++)
    {
        console.log(anime.relations.edges[j-1]);
        if(anime.relations.edges[j-1].relationType != "ADAPTATION")
        {
            continue;
        }
        await iteration_manga(anime.relations.nodes[j-1].id, anime)
    }
}

async function iteration_manga(p) {
    var query = `
    query ($id:Int) { # Define which variables will be used in the query (id)
        Media (id: $id, type: MANGA) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
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
        id: p
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
                `INSERT INTO MANGA (MANGA_ID, TITLE_ENGLISH, TITLE_NATIVE, ISADULT, CHAPTERS, VOLUMES, STATUS, START_DATE, END_DATE, SYNOPSIS, COUNTRY_OF_ORIGIN,
                    BANNER_IMAGE, COVER_IMAGE)
                VALUES (:manga_id, :title_english, :title_native, :ISADULT, :chapters, :volumes, :status, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'),
                 :synopsis, :country_of_origin, :banner_image, :cover_image)`, 
                [data['data'].Media.idMal, data['data'].Media.title.english, data['data'].Media.title.native,
                 (data['data'].Media.isAdult)? 'YES': 'NO', data['data'].Media.chapters, 
                data['data'].Media.volumes, data['data'].Media.status,
                (data['data'].Media.startDate.year == null || data['data'].Media.startDate.month == null || data['data'].Media.startDate.day == null)? '': 
                data['data'].Media.startDate.year+ '-' + data['data'].Media.startDate.month + '-' + data['data'].Media.startDate.day , 
                (data['data'].Media.endDate.year == null || data['data'].Media.endDate.month == null || data['data'].Media.endDate.day == null)? '': data['data'].Media.endDate.year 
                + '-' + data['data'].Media.endDate.month + '-' + data['data'].Media.endDate.day, 
                data['data'].Media.description, data['data'].Media.countryOfOrigin,
                data['data'].Media.bannerImage, data['data'].Media.coverImage.large]
            );
            const result_x = await connection3.execute(
                `INSERT INTO ANIME_X_MANGA (manga_id, anime_id)
                VALUES (:manga_id, :anime_id)`,
                [data['data'].Media.idMal, anime.idMal]
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

    //setTimeout(iteration, 1000, i+1);
}