//helper function to get the site working online without server
//experiencing down time
const url = `https://atales.onrender.com`;


function reloadWebsite(){
  // Use fetch with URL directly for GET requests
  fetch(url)
  .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status code ${response.status}`);
  })
  .catch(error => {
      console.log(`Error reloading at ${new Date().toISOString()}:`, error.message);
  });
}

module.exports = reloadWebsite