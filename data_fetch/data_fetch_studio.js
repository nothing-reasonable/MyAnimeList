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
                extraLarge
                large
                medium
                color
            }
            studios {
              edges {
                id
                isMain
              }
              nodes {
                id
                isAnimationStudio
                name
                siteUrl
              }
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
                `INSERT INTO ANIME (anime_id, mal_id_anime, title_english, title_native, isAdult, episode_count, trailer_link,
                    status, synopsis, country_of_origin, average_episode_duration, start_date, end_date,
                    banner_image, cover_image)
                VALUES (:anime_id, :mal_id_anime, :title_english, :title_native, :isAdult, :episode_count, :trailer_link, :status,
                    :synopsis, :country_of_origin, :average_episode_duration, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD')
                    , :banner_image, :cover_image)`,
                [anime.id, anime.idMal, anime.title.english, anime.title.native, (anime.isAdult) ? "YES" : "NO",
                    (anime.episodes == null)? '': anime.episodes, (anime.trailer == null)? "" : anime.trailer.id , anime.status,
                    anime.description, anime.countryOfOrigin, anime.duration,
                    (anime.startDate.year == null || anime.startDate.month == null || anime.startDate.day == null)? '':
                    anime.startDate.year + "-" + anime.startDate.month + "-" + anime.startDate.day,
                    (anime.endDate.year == null || anime.endDate.month == null || anime.endDate.day == null)? '':
                    anime.endDate.year + "-" + anime.endDate.month + "-" + anime.endDate.day,
                    anime.bannerImage, anime.coverImage.extraLarge]
            );
            
            await connection.close();
            await manga_id_add(data);
            //await studio_id_add(data);
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

    setTimeout(iteration, 3000, i+1);
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
        console.log(anime.studios.edges[j-1]);
        await iteration_manga(anime.studios.edges[j-1].id);
        
        const resultprime = await connection2.execute(
            `INSERT INTO STUDIO_X_ANIME (studio_uid, anime_id, contribution)
            VALUES (:studio_uid, :anime_id, :contribution)`,
            [anime.studios.edges[j-1].id, anime.id, anime.studios.edges[j-1].isMain? 'ANIMATING': 'SUPPORTING']
        );
    }
}

async function iteration_manga(p) {
    var query = `
    query ($id:Int) { # Define which variables will be used in the query (id)
        Studio(id:$id) {
            id
            name
            siteUrl
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
        const manga = data['data'].Studio;
        async function run() {
            const connection3 = await oracledb.getConnection ({
                user: '"c##test"',
                password: "test",
                connectString: "0.0.0.0/orcl"
            });
            const result = await connection3.execute(
                `INSERT INTO STUDIO (STUDIO_UID, NAME)
                VALUES (:STUDIO_UID, :NAME)`, 
                [manga.id, manga.name]
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

// async function studio_id_add(data)
// {
//     const connection = await oracledb.getConnection ({
//         user: '"c##test"',
//         password: "test",
//         connectString: "0.0.0.0/orcl"
//     });

//     await iteration_studio(i);

//     studios = data['data'].Media.studios;
//     for(let i=0; i<studios.nodes.length; i++)
//     {
//         const result = await connection.execute(
//             `INSERT INTO ANIME_X_STUDIO (anime_id, studio_id)
//             VALUES (:anime_id, :studio_id)`,
//             [data['data'].Media.id, studios.nodes[i].id]
//         );
//     }
//     await connection.close();
// }

// async function iterate_studio(i)
// {
    
// }