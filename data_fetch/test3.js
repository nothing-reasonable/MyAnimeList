async function iteration(i) {
    var query = `
    query ($id: Int) { # Define which variables will be used in the query (id)
        Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
        id
        title {
            english
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
            }
        }
        }
    }
    `;

    var variables = {
        id: i
    };

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

    try {
        const response = await fetch(url, options);
        const data = await handleResponse(response);
        handleData(data);
    } catch (error) {
        handleError(error);
    }
}

async function handleResponse(response) {
    const json = await response.json();
    return response.ok ? json : Promise.reject(json);
}

function handleData(data) {
    for (let j = 0; j < data['data'].Media.relations.edges.length; j++) {
        if (data['data'].Media.relations.edges[j].relationType == 'ADAPTATION') {
            console.log(data['data'].Media.relations.nodes[j].id);
        }
    }
}

function handleError(error) {
    console.error(error);
}
