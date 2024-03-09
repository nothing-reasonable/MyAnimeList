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
const fs = require('fs');
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

    function handleData(data) {
        const jsonData = data['data'];
        console.log(jsonData);

        // Specify the file path where you want to save the data
        const filePath = 'output2.json';

        // Read the existing data from the file, or create an empty array if the file doesn't exist
        let existingData = [];
        try {
            const existingDataString = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(existingDataString);
        } catch (error) {
            // File doesn't exist or is empty
        }

        // Append the new data to the array
        existingData.push(jsonData);

        // Write the updated array back to the file
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

        console.log(`Data appended to ${filePath}`);
    }

    function handleError(error) {
        return
        console.log(data['data']);
        alert('Error, check console');
        console.error(error);
    }

    setTimeout(iteration, 667, i+1);
}
iteration(1);