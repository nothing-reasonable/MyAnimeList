const oracledb = require('oracledb');
oracledb.initOracleClient();
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
const mypwd = "test";

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function review_adder() {
    try {
        const connection = await oracledb.getConnection({
            user: '"c##test"',
            password: mypwd,
            connectString: "0.0.0.0/orcl"
        });

        const result = await connection.execute(
            `SELECT MANGA_ID FROM MANGA ORDER BY MANGA_ID`
        );

        //console.log(result.rows);
        for (let i = 0; i < result.rows.length; i++) {
            var query = `
            query ($id: Int) {
                Media (idMal: $id, type: MANGA) {
                    idMal
                    reviews {
                        edges {
                            node {
                                id
                                rating
                                ratingAmount
                                userRating
                                score
                                summary
                                body
                            }
                        }
                    }
                }
            }`;

            // Define our query variables and values that will be used in the query request
            var variables = {
                id: result.rows[i].MANGA_ID // Use the actual ANIME_ID from the result
            };

            // Define the config we'll need for our API request
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

            // Make the HTTP API request
            const response = await fetch(url, options);
            const data = await response.json();
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            // Handle the data (you can implement your logic here)
            console.log(result.rows[i].MANGA_ID);
            //console.log(data['data'].Media.reviews.edges[0].node); //rating+ratinAmound/2 is upvotes, the rest are downvotes
            const reviews = data['data'].Media.reviews.edges;
            for(let j=0; j<reviews.length; j++){
                try{
                    const result2 = await connection.execute(
                        `INSERT INTO USER_MANGA_REVIEWS(REVIEW_ID, MANGA_ID, USER_ID, SCORE, VOTES, SUMMARY, REVIEW)
                        VALUES (:review_id, :manga_id, :user_id, :score, :votes, :summary, :review)`,
                        [
                            reviews[j].node.id,
                            result.rows[i].MANGA_ID,
                            getRandomInt(1, 3009),
                            reviews[j].node.score,
                            reviews[j].node.rating,
                            reviews[j].node.summary,
                            reviews[j].node.body
                        ]
                    );
                } catch (error) {
                    console.log(error);
                }
                
            }
            await wait(1000);

        }

        // Close the OracleDB connection
        await connection.close();
    } catch (error) {
        console.error(error);
    }
}

review_adder();
