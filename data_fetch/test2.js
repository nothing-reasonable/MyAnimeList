// Here we define our query as a multi-line string
// Storing it in a separate .graphql/.gql file is also possible

function iteration(i) {
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
            voiceActors {
                id
            }
            id
        }
        }
        source
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
    //console.log(response.ok)
    return response.json().then(function (json) {
        return response.ok ? json : Promise.reject(json);
    });
}
function manga_id(data) {
    for(let j=0; j<data['data'].Media.relations.edges.length; j++){
        if(data['data'].Media.relations.edges[j].relationType == 'ADAPTATION') {
            return data['data'].Media.relations.nodes[j].id
        }
    }
    return null;
}

function handleData(data) {
    for(let j=0; j<data['data'].Media.relations.edges.length; j++){
        if(data['data'].Media.relations.edges[j].relationType == 'ADAPTATION') {
            console.log(data['data'].Media.relations.nodes[j].id);
        }
    }
}

function handleError(error) {
    return;
    alert('Error, check console');
    console.error(error);
}
}
// setTimeout(iteration, 750, i+1)
// }
iteration(20);


/*query ($id: Int) { # Define which variables will be used in the query (id)
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
      characters {
        edges {
          id
        }
        nodes {
          name {
            first
            middle
            last
            full
            native
            userPreferred
          }
        }
      }
    }
  }
    */