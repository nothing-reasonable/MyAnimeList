const jikan = require('@mateoaranda/jikanjs');
const fs = require('fs');
// for(let i=1; i<95; i++)
// {
//     jikan.loadProducers(i).then((response) => {
//         console.log(response['data']);
//     });

// }
function sleeper(i){
    
    jikan.loadProducers(i).then((response) => {
        const data = response['data'];
        function handleData(data) {
            const jsonData = data;
            console.log(jsonData);
    
            // Specify the file path where you want to save the data
            const filePath = 'output.json';
    
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
        handleData(data);
    });
    if(i<95){
        setTimeout(sleeper, 1000, i+1);
    }
}
sleeper(1);