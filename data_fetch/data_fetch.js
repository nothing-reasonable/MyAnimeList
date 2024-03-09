// Here we define our query as a multi-line string
// Storing it in a separate .graphql/.gql file is also possible
// var query = `
// query ($id: Int) { # Define which variables will be used in the query (id)
//     Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
//         id
//         title {
//             english
//         }
//         isAdult
//         episodes
//         trailer {
//             site
//             id
//         }
//         status
//         startDate {
//             year
//             month
//             day
//         }
//         endDate {
//             year
//             month
//             day
//         }
//         description
//         countryOfOrigin
//         duration
//         relations {
//             nodes {
//                 id
//             }
//             edges {
//                 id
//                 relationType
//             }
//         }
//     }
// }
// `;

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
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
  }
}`;
// Define our query variables and values that will be used in the query request
var variables = {
    id: 1
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

function manga_id(data) {
    for(let i=0; i<data['data'].Media.relations.edges.length; i++){
        console.log(data['data'].Media.relations.edges[i].relationType);
        console.log(data['data'].Media.relations.nodes[i].id);
        // if(data['data'].Media.relations.edges[i].relationType == 'ADAPTATION') {
        //     console.log(data['data'].Media.relations.node[i].id);
        // }
    }
    return null;
}

function handleData(data) {
    // for(let i=0; i<data['data'].Staff.characters.edges.length; i++){
    //     console.log(data['data'].Staff.characters.edges[i].id);
    //     console.log(data['data'].Staff.characters.nodes[i].name['full']);
    // }
    //console.log(data['data'].Staff.characters.nodes[0].name['full']);
    console.log(data['data'].Media.bannerImage);
    
}

function handleError(error) {
    alert('Error, check console');
    console.error(error);
}

