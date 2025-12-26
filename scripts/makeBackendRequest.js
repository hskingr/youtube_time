
async function makeBackendRequest() {
    const query = '12:44'

    const response = await fetch(`http://localhost:3000/api/video?time=${encodeURIComponent(query)}&skipCache=true`);


    const data = await response.json();
    console.log(data);
}
makeBackendRequest().catch(console.error);

